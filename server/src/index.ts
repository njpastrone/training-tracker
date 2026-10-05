import { fitsPrompt } from './identity.ts';
import { buildCorrectionRequest, buildParseRequest, type ParseOptions } from './parse.ts';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_PASSWORD: string;
  DAILY_REQUEST_CAP: string;
  USAGE: KVNamespace;
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1500;
const MAX_BODY_CHARS = 100_000;
const MAX_CANDIDATES = 120;
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
// overshoot the cap a little. Move the counter to a Durable Object if it must be exact.
export async function takeDailySlot(kv: KVNamespace, cap: number, now = new Date()): Promise<boolean> {
  const key = `count:${now.toISOString().slice(0, 10)}`; // UTC day
  const count = Number(await kv.get(key)) || 0;
  // Written as !(count < cap) so a missing or non-numeric cap (NaN) blocks instead of allowing everything.
  if (!(count < cap)) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 2 * 24 * 60 * 60 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

    if (!env.APP_PASSWORD || request.headers.get('x-app-password') !== env.APP_PASSWORD) {
      return json(401, { error: 'Invalid app password.' });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return json(413, { error: 'Request too large.' });

    let body: { system?: unknown; messages?: unknown; max_tokens?: unknown; parse?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: 'Invalid JSON.' });
    }
    const { system, messages, max_tokens, parse } = body ?? {};
    // Parse mode: the app sends only the log and the prompt lives here, so prompt fixes ship with a
    // Worker deploy. The app also sends system/messages for Workers deployed before this mode; ignore them.
    let upstream: Record<string, unknown>;
    if (parse !== undefined) {
      const { input, date, unit, exercises, draft, fix } = (parse ?? {}) as Record<string, unknown>;
      const candidates = exercises === undefined ? [] : parseCandidates(exercises);
      if (typeof input !== 'string' || !input.trim() || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (unit !== 'lbs' && unit !== 'kg') || !candidates) {
        return json(400, { error: 'Invalid request.' });
      }
      // Correction mode: apply a typed fix to the draft under review. `input` (the draft as text plus
      // the fix) is what Workers deployed before this mode parse instead.
      if (fix !== undefined) {
        if (typeof fix !== 'string' || !fix.trim() || !Array.isArray((draft as { exercises?: unknown })?.exercises)) {
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

    let allowed: boolean;
    try {
      allowed = await takeDailySlot(env.USAGE, Number(env.DAILY_REQUEST_CAP));
    } catch (err) {
      console.error('Usage counter error', err);
      return json(503, { error: 'Server busy, please try again in a moment.' });
    }
    if (!allowed) return json(429, { error: 'Daily AI limit reached. Try again tomorrow.' });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(upstream),
    });
    if (!res.ok) {
      console.error('Anthropic error', res.status, await res.text());
      return json(502, { error: `AI service error (${res.status}).` });
    }

    const data = await res.json<{ content: { type: string; text?: string }[] }>();
    return json(200, { text: data.content.filter((c) => c.type === 'text').map((c) => c.text).join('') });
  },
} satisfies ExportedHandler<Env>;
