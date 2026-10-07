import { fitsPrompt } from './identity.ts';
import { buildCorrectionRequest, buildParseRequest, type ParseOptions } from './parse.ts';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_PASSWORD: string;
  DAILY_REQUEST_CAP: string;
  DEVICE_DAILY_CAP: string;
  LEGACY_DAILY_CAP: string;
  USAGE: KVNamespace;
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1500;
const MAX_BODY_CHARS = 20_000;
const MAX_INPUT_CHARS = 4000;
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
      if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT_CHARS || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (unit !== 'lbs' && unit !== 'kg') || !candidates) {
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

    // Apps from before install ids send none and all share one small 'legacy' bucket (too short to clash with a real id)
    const installId = request.headers.get('x-install-id');
    if (installId !== null && !/^[A-Za-z0-9-]{8,64}$/.test(installId)) return json(400, { error: 'Invalid request.' });
    const device = installId ? { id: installId, cap: Number(env.DEVICE_DAILY_CAP) } : { id: 'legacy', cap: Number(env.LEGACY_DAILY_CAP) };
    let hit: 'device' | 'global' | null;
    try {
      hit = await takeDailySlot(env.USAGE, Number(env.DAILY_REQUEST_CAP), new Date(), device);
    } catch (err) {
      console.error('Usage counter error', err);
      return json(503, { error: 'Server busy, please try again in a moment.' });
    }
    if (hit === 'device') return json(429, { error: "You've used today's AI requests on this phone. They reset at midnight UTC." });
    if (hit) return json(429, { error: 'Daily AI limit reached. Try again tomorrow.' });

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

    const data = await res.json<{ content: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }>();
    console.log('usage', device.id, data.usage?.input_tokens, data.usage?.output_tokens);
    return json(200, { text: data.content.filter((c) => c.type === 'text').map((c) => c.text).join('') });
  },
} satisfies ExportedHandler<Env>;
