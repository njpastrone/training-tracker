import { fitsPrompt } from './identity.ts';
import { buildCorrectionRequest, buildParseRequest, type ParseOptions } from './parse.ts';
import { buildFoodCorrectionRequest, buildFoodRequest, FOOD_ESCALATION_MODEL, needsEscalation, type DraftFoodForModel } from './food.ts';
import { buildCoachRequest, COACH_BETA, MAX_CALLS_PER_QUESTION, MAX_PACK_CHARS, validThread } from './coach.ts';
import { buildFinderRequest, CATEGORIES, DISTANCES, FINDER_ESCALATION_MODEL, MAX_NEVER, MAX_PLACES, needsFinderEscalation, PREFERENCES, type FinderInput } from './finder.ts';
import { checkChallenge, issueChallenge, verifyAssertion, verifyAttestation } from './attest.ts';
import { legalPage } from './legal.ts';
import { homePage, joinWaitlist } from './site.ts';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_PASSWORD: string;
  DAILY_REQUEST_CAP: string;
  DEVICE_DAILY_CAP: string;
  LEGACY_DAILY_CAP: string;
  // App Attest: 'log-only' (the default) checks and logs but never refuses, 'enforce' refuses requests without a
  // valid assertion. Skipped entirely unless both secrets below are set.
  APP_ATTEST_MODE?: string;
  APP_ATTEST_APP_ID?: string; // secret: "<Apple Team ID>.<bundle id>"
  APP_ATTEST_CHALLENGE_SECRET?: string; // secret: signs the challenges the Worker hands out
  CONTACT_EMAIL?: string; // shown on the privacy policy and terms pages; they answer 503 until it is set
  USAGE: KVNamespace;
}

// A key the app attested, stored in KV under attest:<key id>
interface KeyRecord { pub: string; counter: number }

// The pass-through path: the app sends its own prompt (the planner, the template parser, and app builds from before
// parse mode parsing logs). Chosen on evals/planner (README there): Haiku 5.5 at low effort scores 0.98 against
// Haiku 4.5's 0.90 and ties medium at a fifth of 4.5's cost. 5.x models think and the thinking counts toward
// max_tokens, so the Worker sets the cap itself; only tokens used are billed.
export const PASSTHROUGH = { model: 'claude-haiku-5-5', effort: 'low', max_tokens: 8192 } as const;
const MAX_PROMPT_CHARS = 80_000;
const MAX_INPUT_CHARS = 4000;
const MAX_CANDIDATES = 120;
const MAX_FOOD_CANDIDATES = 80;
const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'];

const shortText = (v: unknown) => typeof v === 'string' && fitsPrompt(v);

// The exercise list the app sends with a log; undefined if any entry is malformed
function parseCandidates(v: unknown): ParseOptions['exercises'] | undefined {
  if (!Array.isArray(v) || v.length > MAX_CANDIDATES) return undefined;
  const out: NonNullable<ParseOptions['exercises']> = [];
  for (const c of v) {
    const { name, muscleGroup, also, yours } = (c ?? {}) as Record<string, unknown>;
    if (!shortText(name) || !MUSCLE_GROUPS.includes(muscleGroup as string)) return undefined;
    if (also !== undefined && !(Array.isArray(also) && also.length <= 3 && also.every(shortText))) return undefined;
    if (yours !== undefined && typeof yours !== 'boolean') return undefined;
    out.push({ name: name as string, muscleGroup: muscleGroup as NonNullable<ParseOptions['exercises']>[number]['muscleGroup'], ...(also ? { also: also as string[] } : {}), ...(yours ? { yours: true } : {}) });
  }
  return out;
}

const json = (status: number, body: unknown) => Response.json(body, { status });

// ponytail: KV read-then-write is not atomic and is eventually consistent, so bursts can
// overshoot the caps a little. Move the counters to a Durable Object if they must be exact.
// Takes one slot from the global count and from the device's count; returns which cap was hit,
// or null. Each allowed request costs one KV write per counter.
export async function takeDailySlot(kv: KVNamespace, cap: number, now: Date, device: { id: string; cap: number }): Promise<'device' | 'global' | null> {
  const day = now.toISOString().slice(0, 10); // UTC day
  const globalKey = `count:${day}`;
  const deviceKey = `device:${device.id}:${day}`;
  const [count, deviceCount] = await Promise.all([kv.get(globalKey), kv.get(deviceKey)]).then((v) => v.map((c) => Number(c) || 0));
  // Written as !(count < cap) so a missing or non-numeric cap (NaN) blocks instead of allowing everything.
  if (!(deviceCount < device.cap)) return 'device';
  if (!(count < cap)) return 'global';
  const ttl = { expirationTtl: 2 * 24 * 60 * 60 };
  await Promise.all([kv.put(globalKey, String(count + 1), ttl), kv.put(deviceKey, String(deviceCount + 1), ttl)]);
  return null;
}

const attestConfigured = (env: Env): env is Env & { APP_ATTEST_APP_ID: string; APP_ATTEST_CHALLENGE_SECRET: string } => !!env.APP_ATTEST_APP_ID && !!env.APP_ATTEST_CHALLENGE_SECRET;

// POST /attest/register: the app's new key with Apple's attestation of it, made over a challenge we issued
async function registerKey(request: Request, env: Env): Promise<Response> {
  if (!attestConfigured(env)) return json(503, { error: 'App Attest is not configured.' });
  let body: { keyId?: unknown; challenge?: unknown; attestation?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON.' });
  }
  const { keyId, challenge, attestation } = body ?? {};
  if (typeof keyId !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(keyId) || typeof challenge !== 'string' || typeof attestation !== 'string' || attestation.length > 20_000) {
    return json(400, { error: 'Invalid request.' });
  }
  try {
    await checkChallenge(env.APP_ATTEST_CHALLENGE_SECRET, challenge);
    const pub = await verifyAttestation(attestation, keyId, challenge, env.APP_ATTEST_APP_ID);
    // A key registered again keeps its counter, so replaying its attestation cannot reopen old assertions
    if (!(await env.USAGE.get(`attest:${keyId}`))) {
      const record: KeyRecord = { pub, counter: 0 };
      await env.USAGE.put(`attest:${keyId}`, JSON.stringify(record));
    }
    return json(200, { ok: true });
  } catch (err) {
    console.log('attest register failed', (err as Error).message);
    return json(400, { error: 'Attestation failed.' });
  }
}

// Checks the assertion headers on an AI request: the app signed "<challenge>\n<body>" with its attested key.
// Returns the key id with its record and new counter (saved only once the request gets a slot), or why the request is not attested.
async function checkAssertion(request: Request, body: string, env: Env & { APP_ATTEST_APP_ID: string; APP_ATTEST_CHALLENGE_SECRET: string }): Promise<{ keyId: string; record: KeyRecord } | { reason: string }> {
  const keyId = request.headers.get('x-attest-key-id');
  const challenge = request.headers.get('x-attest-challenge');
  const assertion = request.headers.get('x-attest-assertion');
  if (!keyId || !challenge || !assertion) return { reason: 'no assertion' };
  try {
    await checkChallenge(env.APP_ATTEST_CHALLENGE_SECRET, challenge);
    const record = await env.USAGE.get<KeyRecord>(`attest:${keyId}`, 'json');
    if (!record) return { reason: 'unknown key' };
    const counter = await verifyAssertion(assertion, `${challenge}\n${body}`, record.pub, env.APP_ATTEST_APP_ID, record.counter);
    return { keyId, record: { ...record, counter } };
  } catch (err) {
    return { reason: (err as Error).message };
  }
}

// One coach question is one device slot however many model calls it takes (the app sends the same
// turn id for each). The first call under a turn id takes a daily slot; the next ones, up to
// MAX_CALLS_PER_QUESTION, only count against the turn. Returns 'turn' when the question has used them up.
const TURN_TTL = 15 * 60;
export async function takeCoachSlot(kv: KVNamespace, cap: number, now: Date, device: { id: string; cap: number }, turnId: string): Promise<'device' | 'global' | 'turn' | null> {
  const key = `turn:${device.id}:${turnId}`;
  const calls = Number(await kv.get(key)) || 0;
  if (calls === 0) {
    const hit = await takeDailySlot(kv, cap, now, device);
    if (hit) return hit;
  } else if (calls >= MAX_CALLS_PER_QUESTION) {
    return 'turn';
  }
  await kv.put(key, String(calls + 1), { expirationTtl: TURN_TTL });
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'www.lifttextapp.com') return Response.redirect(`https://lifttextapp.com${url.pathname}${url.search}`, 301);
    // The home page, the waitlist, the privacy policy and terms are public: no password, no AI cap
    if (request.method === 'GET') {
      if (url.pathname === '/') return homePage();
      const legal = legalPage(url.pathname, env.CONTACT_EMAIL);
      if (legal) return legal;
    }
    if (request.method === 'POST' && url.pathname === '/waitlist') return joinWaitlist(request, env.USAGE, new Date());
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

    if (!env.APP_PASSWORD || request.headers.get('x-app-password') !== env.APP_PASSWORD) {
      return json(401, { error: 'Invalid app password.' });
    }

    const path = url.pathname;
    if (path === '/attest/challenge') {
      if (!attestConfigured(env)) return json(503, { error: 'App Attest is not configured.' });
      return json(200, { challenge: await issueChallenge(env.APP_ATTEST_CHALLENGE_SECRET) });
    }
    if (path === '/attest/register') return registerKey(request, env);

    const text = await request.text();
    let body: { system?: unknown; messages?: unknown; parse?: unknown; food?: unknown; coach?: unknown; finder?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'Invalid JSON.' });
    }
    const { system, messages, parse, food, coach, finder } = body ?? {};
    const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
    // Food mode: like parse mode, for what the user ate. `foods` are the table entries the log
    // mentions (the app matches them); with draft and fix it applies a typed fix to the food draft.
    let upstream: Record<string, unknown>;
    let escalateFoods: number | undefined; // a food log's candidate count: Haiku's reply may go to Sonnet
    let finderInput: FinderInput | undefined; // a nearby-food search: Haiku's reply may go to Sonnet
    let betas: string | undefined; // beta features the upstream request opts into
    let passThrough = false; // the app's own prompt: the reply is used as-is, so a cut-off one is an error
    let turnId: string | undefined; // a coach question's id: its model calls share one cap slot
    if (coach !== undefined) {
      // Coach mode: a question (or a short thread) about the user's own training and food, answered from
      // the context pack the phone built (services/coachPack.ts) and the read tools the phone runs
      // (services/coachTools.ts). The phone drives the loop: a reply with tool calls comes back as content
      // blocks, the phone answers them, and the next call (tools off) answers the question.
      const { date, unit, pack, messages: thread, turnId: turn } = (coach ?? {}) as Record<string, unknown>;
      if (!validDate(date) || (unit !== 'lbs' && unit !== 'kg') || !pack || typeof pack !== 'object' || JSON.stringify(pack).length > MAX_PACK_CHARS || !validThread(thread)) {
        return json(400, { error: 'Invalid request.' });
      }
      if (turn !== undefined && !(typeof turn === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(turn))) return json(400, { error: 'Invalid request.' });
      turnId = turn as string | undefined;
      upstream = buildCoachRequest(pack, thread, { date, unit });
      // One round of tools: once the thread holds tool results, the model answers
      if (thread.some((m) => Array.isArray(m.content))) upstream.tool_choice = { type: 'none' };
      betas = COACH_BETA;
    } else if (finder !== undefined) {
      // Finder mode: "find food near me". The phone sends its preferences and the names, kinds and
      // distance buckets of places Apple Maps found on the iPhone (never a coordinate or address), or
      // the neighbourhood it typed when there is no place list. Nothing here is stored.
      const { date, preferences, budget, never, places, area, ask, today } = (finder ?? {}) as Record<string, unknown>;
      const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);
      const placeOk = (p: unknown) => typeof p === 'object' && p !== null && shortText((p as { name?: unknown }).name) && oneOf(CATEGORIES, (p as { category?: unknown }).category) && oneOf(DISTANCES, (p as { distance?: unknown }).distance);
      const money = (v: unknown) => v === undefined || (typeof v === 'number' && v > 0 && v <= 500);
      const text = (v: unknown, max: number) => v === undefined || (typeof v === 'string' && v.length <= max && fitsPrompt(v));
      const eaten = (v: unknown) => v === undefined || (typeof v === 'object' && v !== null && ['kcal', 'protein', 'proteinGoal'].every((k) => { const n = (v as Record<string, unknown>)[k]; return n === undefined ? k === 'proteinGoal' : typeof n === 'number' && n >= 0 && n <= 20_000; }));
      if (
        !validDate(date) || !Array.isArray(preferences) || !preferences.length || preferences.length > PREFERENCES.length || !preferences.every((p) => oneOf(PREFERENCES, p)) || !money(budget) ||
        (never !== undefined && !(Array.isArray(never) && never.length <= MAX_NEVER && never.every(shortText))) ||
        !Array.isArray(places) || places.length > MAX_PLACES || !places.every(placeOk) || !text(area, 120) || !text(ask, 200) || (!places.length && !area) || !eaten(today)
      ) {
        return json(400, { error: 'Invalid request.' });
      }
      finderInput = { date, preferences: [...new Set(preferences as FinderInput['preferences'])], budget: budget as number | undefined, never: never as string[] | undefined, places: places as FinderInput['places'], area: area as string | undefined, ask: ask as string | undefined, today: today as FinderInput['today'] };
      upstream = buildFinderRequest(finderInput);
    } else if (food !== undefined) {
      const { input, date, foods = [], draft, fix } = (food ?? {}) as Record<string, unknown>;
      if (!validDate(date) || !Array.isArray(foods) || foods.length > MAX_FOOD_CANDIDATES || !foods.every(shortText)) {
        return json(400, { error: 'Invalid request.' });
      }
      const options = { date, foods: foods as string[] };
      if (fix !== undefined) {
        const items = (draft as { items?: unknown })?.items;
        const itemOk = (i: unknown) => typeof i === 'object' && i !== null && shortText((i as { name?: unknown }).name);
        if (typeof fix !== 'string' || !fix.trim() || fix.length > MAX_INPUT_CHARS || !Array.isArray(items) || items.length > MAX_FOOD_CANDIDATES || !items.every(itemOk)) {
          return json(400, { error: 'Invalid request.' });
        }
        upstream = buildFoodCorrectionRequest(items as DraftFoodForModel[], fix, options);
      } else {
        if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT_CHARS) return json(400, { error: 'Invalid request.' });
        upstream = buildFoodRequest(input, options);
        escalateFoods = foods.length;
      }
    } else if (parse !== undefined) {
      // Parse mode: the app sends only the log and the prompt lives here, so prompt fixes ship with a
      // Worker deploy. The app also sends system/messages for Workers deployed before this mode; ignore them.
      const { input, date, unit, exercises, draft, fix } = (parse ?? {}) as Record<string, unknown>;
      const candidates = exercises === undefined ? [] : parseCandidates(exercises);
      if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT_CHARS || !validDate(date) || (unit !== 'lbs' && unit !== 'kg') || !candidates) {
        return json(400, { error: 'Invalid request.' });
      }
      // Correction mode: apply a typed fix to the draft under review. `input` (the draft as text plus
      // the fix) is what Workers deployed before this mode parse instead.
      if (fix !== undefined) {
        if (typeof fix !== 'string' || !fix.trim() || fix.length > MAX_INPUT_CHARS || !Array.isArray((draft as { exercises?: unknown })?.exercises)) {
          return json(400, { error: 'Invalid request.' });
        }
        upstream = buildCorrectionRequest(draft as Parameters<typeof buildCorrectionRequest>[0], fix, { date, unit, exercises: candidates });
      } else {
        upstream = buildParseRequest(input, { date, unit, exercises: candidates });
      }
    } else {
      // Plain text only: an image, file or any other content block is refused, so not even a future app bug can
      // send a progress photo to the AI (parse, food and coach modes build or check their own messages)
      const textOnly = (m: unknown) => typeof m === 'object' && m !== null && ['user', 'assistant'].includes((m as { role?: unknown }).role as string) && typeof (m as { content?: unknown }).content === 'string';
      if (!Array.isArray(messages) || messages.length === 0 || !messages.every(textOnly) || (system !== undefined && typeof system !== 'string')) {
        return json(400, { error: 'Invalid request.' });
      }
      // The app's own max_tokens is ignored: it was set for a model that did not think
      upstream = { model: PASSTHROUGH.model, max_tokens: PASSTHROUGH.max_tokens, output_config: { effort: PASSTHROUGH.effort }, system, messages };
      passThrough = true;
    }
    if (JSON.stringify({ system: upstream.system, messages: upstream.messages }).length > MAX_PROMPT_CHARS) return json(413, { error: 'Request too large.' });

    // Apps from before install ids send none and all share one small 'legacy' bucket (too short to clash with a real id)
    const installId = request.headers.get('x-install-id');
    if (installId !== null && !/^[A-Za-z0-9-]{8,64}$/.test(installId)) return json(400, { error: 'Invalid request.' });
    let attestedKey: { keyId: string; record: KeyRecord } | undefined;
    let device = installId ? { id: installId, cap: Number(env.DEVICE_DAILY_CAP) } : { id: 'legacy', cap: Number(env.LEGACY_DAILY_CAP) };

    // App Attest: a genuine app signs each request with a key Apple attested. An attested request is
    // capped by its key, which the app cannot make up, instead of by the install id, which it can.
    if (attestConfigured(env)) {
      const attested = await checkAssertion(request, text, env);
      if ('keyId' in attested) {
        attestedKey = attested;
        device = { id: attested.keyId, cap: Number(env.DEVICE_DAILY_CAP) };
      } else {
        const enforce = env.APP_ATTEST_MODE === 'enforce';
        console.log('attest', enforce ? 'enforce' : 'log-only', device.id, attested.reason);
        if (enforce) return json(403, { error: "This copy of LiftText couldn't be verified. Install it from the App Store or TestFlight." });
      }
    }

    let hit: 'device' | 'global' | 'turn' | null;
    try {
      hit = turnId ? await takeCoachSlot(env.USAGE, Number(env.DAILY_REQUEST_CAP), new Date(), device, turnId) : await takeDailySlot(env.USAGE, Number(env.DAILY_REQUEST_CAP), new Date(), device);
      if (!hit && attestedKey) await env.USAGE.put(`attest:${attestedKey.keyId}`, JSON.stringify(attestedKey.record));
    } catch (err) {
      console.error('Usage counter error', err);
      return json(503, { error: 'Server busy, please try again in a moment.' });
    }
    if (hit === 'device') return json(429, { error: "You've used today's AI requests on this phone. They reset at midnight UTC." });
    if (hit === 'turn') return json(429, { error: 'That question took too many steps. Ask it again.' });
    if (hit) return json(429, { error: 'Daily AI limit reached. Try again tomorrow.' });

    type Block = { type: string; text?: string };
    const send = async (body: Record<string, unknown>): Promise<{ status: number; stop?: string; text?: string; content?: Block[] }> => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          ...(betas ? { 'anthropic-beta': betas } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error('Anthropic error', body.model, res.status, await res.text());
        return { status: res.status };
      }
      const data = await res.json<{ content: Block[]; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number } }>();
      console.log('usage', device.id, body.model, data.usage?.input_tokens, data.usage?.output_tokens, data.usage?.cache_read_input_tokens);
      return { status: 200, stop: data.stop_reason, text: data.content.filter((c) => c.type === 'text').map((c) => c.text).join(''), content: data.content };
    };

    // The food, finder and parse prompts are long and the same on every call: cache them
    if (escalateFoods !== undefined || finderInput !== undefined || parse !== undefined) upstream.system = [{ type: 'text', text: upstream.system, cache_control: { type: 'ephemeral' } }];
    let reply = await send(upstream);
    // A food reply Haiku failed, didn't finish or isn't sure of goes to Sonnet, on the same cap slot
    if (escalateFoods !== undefined && (reply.text === undefined || needsEscalation(reply.stop, reply.text, escalateFoods))) {
      reply = await send({ ...upstream, model: FOOD_ESCALATION_MODEL });
    }
    // A finder reply Haiku can't read, didn't finish or isn't sure of goes to Sonnet, on the same cap slot
    if (finderInput !== undefined && (reply.text === undefined || needsFinderEscalation(reply.stop, reply.text, finderInput))) {
      reply = await send({ ...buildFinderRequest(finderInput, FINDER_ESCALATION_MODEL), system: upstream.system });
    }
    if (reply.text === undefined) return json(502, { error: `AI service error (${reply.status}).` });
    if (parse !== undefined && reply.stop === 'max_tokens') return json(502, { error: 'AI service error (max_tokens).' });
    if (passThrough && reply.stop === 'max_tokens') return json(502, { error: 'AI service error (max_tokens).' });
    // The coach gets the blocks too: tool calls to run on the phone and thinking to send back with the results
    if (coach !== undefined) return json(200, { text: reply.text, content: reply.content, stop_reason: reply.stop });
    return json(200, { text: reply.text });
  },
} satisfies ExportedHandler<Env>;
