import { fitsPrompt } from './identity.ts';
import { buildCorrectionRequest, buildParseRequest, type ParseOptions } from './parse.ts';
import { buildFoodCorrectionRequest, buildFoodRequest, FOOD_ESCALATION_MODEL, needsEscalation, type DraftFoodForModel } from './food.ts';
import { buildCoachRequest, COACH_BETA, MAX_PACK_CHARS, validThread } from './coach.ts';
import { checkChallenge, issueChallenge, verifyAssertion, verifyAttestation } from './attest.ts';

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
  USAGE: KVNamespace;
}

// A key the app attested, stored in KV under attest:<key id>
interface KeyRecord { pub: string; counter: number }

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1500;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

    if (!env.APP_PASSWORD || request.headers.get('x-app-password') !== env.APP_PASSWORD) {
      return json(401, { error: 'Invalid app password.' });
    }

    const path = new URL(request.url).pathname;
    if (path === '/attest/challenge') {
      if (!attestConfigured(env)) return json(503, { error: 'App Attest is not configured.' });
      return json(200, { challenge: await issueChallenge(env.APP_ATTEST_CHALLENGE_SECRET) });
    }
    if (path === '/attest/register') return registerKey(request, env);

    const text = await request.text();
    let body: { system?: unknown; messages?: unknown; max_tokens?: unknown; parse?: unknown; food?: unknown; coach?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: 'Invalid JSON.' });
    }
    const { system, messages, max_tokens, parse, food, coach } = body ?? {};
    const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
    // Food mode: like parse mode, for what the user ate. `foods` are the table entries the log
    // mentions (the app matches them); with draft and fix it applies a typed fix to the food draft.
    let upstream: Record<string, unknown>;
    let escalateFoods: number | undefined; // a food log's candidate count: Haiku's reply may go to Sonnet
    let betas: string | undefined; // beta features the upstream request opts into
    if (coach !== undefined) {
      // Coach mode: a question (or a short thread) about the user's own training and food, answered from
      // the context pack the phone built (services/coachPack.ts). One call per question, so one cap slot.
      const { date, unit, pack, messages: thread } = (coach ?? {}) as Record<string, unknown>;
      if (!validDate(date) || (unit !== 'lbs' && unit !== 'kg') || !pack || typeof pack !== 'object' || JSON.stringify(pack).length > MAX_PACK_CHARS || !validThread(thread)) {
        return json(400, { error: 'Invalid request.' });
      }
      upstream = buildCoachRequest(pack, thread, { date, unit });
      betas = COACH_BETA;
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
      if (!Array.isArray(messages) || messages.length === 0 || (system !== undefined && typeof system !== 'string')) {
        return json(400, { error: 'Invalid request.' });
      }
      upstream = {
        model: MODEL,
        max_tokens: Number.isInteger(max_tokens) && (max_tokens as number) > 0 ? Math.min(max_tokens as number, MAX_TOKENS) : MAX_TOKENS,
        system,
        messages,
      };
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

    let hit: 'device' | 'global' | null;
    try {
      hit = await takeDailySlot(env.USAGE, Number(env.DAILY_REQUEST_CAP), new Date(), device);
      if (!hit && attestedKey) await env.USAGE.put(`attest:${attestedKey.keyId}`, JSON.stringify(attestedKey.record));
    } catch (err) {
      console.error('Usage counter error', err);
      return json(503, { error: 'Server busy, please try again in a moment.' });
    }
    if (hit === 'device') return json(429, { error: "You've used today's AI requests on this phone. They reset at midnight UTC." });
    if (hit) return json(429, { error: 'Daily AI limit reached. Try again tomorrow.' });

    const send = async (body: Record<string, unknown>): Promise<{ status: number; stop?: string; text?: string }> => {
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
      const data = await res.json<{ content: { type: string; text?: string }[]; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number } }>();
      console.log('usage', device.id, body.model, data.usage?.input_tokens, data.usage?.output_tokens, data.usage?.cache_read_input_tokens);
      return { status: 200, stop: data.stop_reason, text: data.content.filter((c) => c.type === 'text').map((c) => c.text).join('') };
    };

    // The food and parse prompts are long and the same on every log: cache them
    if (escalateFoods !== undefined || parse !== undefined) upstream.system = [{ type: 'text', text: upstream.system, cache_control: { type: 'ephemeral' } }];
    let reply = await send(upstream);
    // A food reply Haiku failed, didn't finish or isn't sure of goes to Sonnet, on the same cap slot
    if (escalateFoods !== undefined && (reply.text === undefined || needsEscalation(reply.stop, reply.text, escalateFoods))) {
      reply = await send({ ...upstream, model: FOOD_ESCALATION_MODEL });
    }
    if (reply.text === undefined) return json(502, { error: `AI service error (${reply.status}).` });
    if (parse !== undefined && reply.stop === 'max_tokens') return json(502, { error: 'AI service error (max_tokens).' });
    return json(200, { text: reply.text });
  },
} satisfies ExportedHandler<Env>;
