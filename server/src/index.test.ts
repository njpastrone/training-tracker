import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { PASSTHROUGH, type Env } from './index.ts';
import { buildCorrectionRequest, buildParseRequest } from './parse.ts';
import { buildFoodCorrectionRequest, buildFoodRequest } from './food.ts';
import { buildCoachRequest, COACH_BETA, COACH_MODEL, type CoachMessage } from './coach.ts';
import { checkChallenge, issueChallenge, toB64 } from './attest.ts';
import { SAMPLE } from './attest.fixtures.ts';

const APP_ID = 'TEAM.com.test.app';
const today = () => new Date().toISOString().slice(0, 10);

function makeEnv(cap = '2', count?: number, deviceCap = '50', legacyCap = '50', attest: Partial<Env> = {}) {
  const store = new Map<string, string>();
  if (count !== undefined) store.set(`count:${today()}`, String(count));
  const USAGE = {
    get: async (k: string, type?: string) => { const v = store.get(k) ?? null; return type === 'json' && v !== null ? JSON.parse(v) : v; },
    put: async (k: string, v: string) => void store.set(k, v),
  } as unknown as KVNamespace;
  const env: Env = { ANTHROPIC_API_KEY: 'sk-test', APP_PASSWORD: 'pw', DAILY_REQUEST_CAP: cap, DEVICE_DAILY_CAP: deviceCap, LEGACY_DAILY_CAP: legacyCap, APP_ATTEST_APP_ID: APP_ID, APP_ATTEST_CHALLENGE_SECRET: 'cs', USAGE, ...attest };
  return { env, store };
}

const DEFAULT_BODY = { system: 's', messages: [{ role: 'user', content: 'hi' }], max_tokens: 99999 };
function req(password?: string, body: unknown = DEFAULT_BODY, installId?: string, headers: Record<string, string> = {}, path = '/') {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { ...(password === undefined ? {} : { 'x-app-password': password }), ...(installId === undefined ? {} : { 'x-install-id': installId }), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// --- App Attest: a key we hold, and assertions in Apple's shape (CBOR map of a DER signature and authenticator data)
const te = new TextEncoder();
const sha = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let a = 0; for (const x of p) { o.set(x, a); a += x.length; } return o; };
const bstr = (b: Uint8Array) => cat(new Uint8Array([0x58, b.length]), b);
const tstr = (s: string) => cat(new Uint8Array([0x60 | s.length]), te.encode(s));
const derInt = (v: Uint8Array) => { let i = 0; while (i < v.length - 1 && v[i] === 0) i++; v = v.subarray(i); if (v[0] & 0x80) v = cat(new Uint8Array([0]), v); return cat(new Uint8Array([0x02, v.length]), v); };
const derSig = (raw: Uint8Array) => { const body = cat(derInt(raw.subarray(0, 32)), derInt(raw.subarray(32))); return cat(new Uint8Array([0x30, body.length]), body); };
async function attestedKey(appId = APP_ID) {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const keyId = toB64(await sha(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)));
  const record = { pub: toB64(new Uint8Array((await crypto.subtle.exportKey('spki', pair.publicKey)) as ArrayBuffer)), counter: 0 };
  // Headers for a request with this body, as the app makes them
  const sign = async (body: string, counter: number, challenge?: string) => {
    challenge ??= await issueChallenge('cs');
    const auth = cat(await sha(te.encode(appId)), new Uint8Array([0, 0, 0, 0, counter]));
    const nonce = await sha(cat(auth, await sha(te.encode(`${challenge}\n${body}`))));
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, nonce));
    const assertion = cat(new Uint8Array([0xa2]), tstr('signature'), bstr(derSig(sig)), tstr('authenticatorData'), bstr(auth));
    return { 'x-attest-key-id': keyId, 'x-attest-challenge': challenge, 'x-attest-assertion': toB64(assertion) };
  };
  return { keyId, record, sign };
}

let upstream: { url: string; init: RequestInit }[] = [];
let replies: { text: string; stop_reason?: string }[] = []; // what the model says, in order; then '{"ok":true}'
globalThis.fetch = (async (url: string, init: RequestInit) => {
  upstream.push({ url, init });
  const { text, stop_reason } = replies.shift() ?? { text: '{"ok":true}' };
  return Response.json({ content: [{ type: 'text', text }], stop_reason });
}) as typeof fetch;

const call = async (r: Request, env: Env) => {
  upstream = [];
  const res = await worker.fetch(r, env);
  return { status: res.status, body: (await res.json()) as { text?: string; error?: string } };
};

test('rejects missing and wrong passwords without spending the cap', async () => {
  const { env, store } = makeEnv();
  assert.equal((await call(req(), env)).status, 401);
  assert.equal((await call(req('nope'), env)).status, 401);
  assert.equal(upstream.length, 0);
  assert.equal(store.size, 0);
});

test('forwards with the server-chosen model, effort and max_tokens, whatever the app asked for', async () => {
  const { env } = makeEnv();
  const { status, body } = await call(req('pw'), env);
  assert.equal(status, 200);
  assert.equal(body.text, '{"ok":true}');
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.equal(sent.model, PASSTHROUGH.model);
  assert.equal(sent.max_tokens, PASSTHROUGH.max_tokens);
  assert.deepEqual(sent.output_config, { effort: PASSTHROUGH.effort });
  assert.equal(sent.temperature, undefined);
  assert.equal((upstream[0].init.headers as Record<string, string>)['x-api-key'], 'sk-test');
});

test('a pass-through reply cut off at max_tokens is an error, never truncated text', async () => {
  const { env } = makeEnv();
  replies = [{ text: '{"plan": {"name": "cut', stop_reason: 'max_tokens' }];
  const { status, body } = await call(req('pw'), env);
  assert.equal(status, 502);
  assert.match(body.error!, /max_tokens/);
  assert.equal(body.text, undefined);
});

test('enforces the daily cap', async () => {
  const { env } = makeEnv('2');
  assert.equal((await call(req('pw'), env)).status, 200);
  assert.equal((await call(req('pw'), env)).status, 200);
  const blocked = await call(req('pw'), env);
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error!, /Daily AI limit/);
  assert.equal(upstream.length, 0);
});

test('caps each install separately and still counts it against the global cap', async () => {
  const { env, store } = makeEnv('3', undefined, '2');
  const a = (id: string) => call(req('pw', undefined, id), env);
  assert.equal((await a('device-aaaa')).status, 200);
  assert.equal((await a('device-aaaa')).status, 200);
  const blocked = await a('device-aaaa');
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error!, /on this phone/);
  assert.equal(upstream.length, 0);
  assert.equal((await a('device-bbbb')).status, 200); // another tester is unaffected
  assert.equal((await a('device-cccc')).status, 429); // until the global cap is reached
  assert.equal(store.get(`count:${new Date().toISOString().slice(0, 10)}`), '3');
});

test('apps without an install id share one small bucket; malformed ids are rejected', async () => {
  const { env, store } = makeEnv('5', undefined, '5', '2');
  assert.equal((await call(req('pw', undefined, 'bad id!'), env)).status, 400);
  assert.equal(store.size, 0);
  assert.equal((await call(req('pw'), env)).status, 200);
  assert.equal((await call(req('pw'), env)).status, 200);
  const blocked = await call(req('pw'), env);
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error!, /on this phone/);
  assert.equal((await call(req('pw', undefined, 'device-aaaa'), env)).status, 200); // newer builds are unaffected
  assert.equal(store.get(`count:${new Date().toISOString().slice(0, 10)}`), '3');
});

test('a missing or invalid device cap blocks that device', async () => {
  assert.equal((await call(req('pw', undefined, 'device-aaaa'), makeEnv('2', undefined, '').env)).status, 429);
});

test('a missing or invalid cap blocks instead of allowing unlimited use', async () => {
  assert.equal((await call(req('pw'), makeEnv('').env)).status, 429);
  assert.equal((await call(req('pw'), makeEnv('abc').env)).status, 429);
});

test('rejects malformed requests before counting', async () => {
  const { env, store } = makeEnv();
  assert.equal((await call(req('pw', { messages: 'x' }), env)).status, 400);
  assert.equal(store.size, 0);
});

test('fails closed with 503 when the usage counter write fails', async () => {
  const { env } = makeEnv();
  env.USAGE.put = async () => {
    throw new Error('KV PUT failed: 429 Too Many Requests');
  };
  const res = await call(req('pw'), env);
  assert.equal(res.status, 503);
  assert.match(res.body.error!, /Server busy/);
  assert.equal(upstream.length, 0);
});

// The Worker sends the parse and food prompts with a cache marker on the system prompt
const cached = <T extends { system: string }>(r: T) => ({ ...r, system: [{ type: 'text', text: r.system, cache_control: { type: 'ephemeral' } }] });

test('parse mode sends the server-side parse prompt and ignores the client prompt', async () => {
  const { env } = makeEnv();
  const parse = { input: 'bench 3x5 225', date: '2026-10-03', unit: 'lbs' };
  const res = await call(req('pw', { parse, system: 'client prompt', messages: [{ role: 'user', content: 'x' }] }), env);
  assert.equal(res.status, 200);
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.deepEqual(sent, cached(buildParseRequest(parse.input, { date: parse.date, unit: 'lbs' })));
  assert.match(sent.messages[0].content, /Saturday 2026-10-03[\s\S]*<log>bench 3x5 225<\/log>/);
});

test('a parse or correction reply cut off at max_tokens is an error, not truncated text', async () => {
  const { env } = makeEnv('10');
  const draft = { exercises: [{ name: 'Bench Press', muscleGroup: 'chest' as const, sets: 3, reps: 8, weight: 135, unit: 'lbs' as const }], muscleGroups: ['chest' as const], confidence: 0.9 };
  const base = { input: 'bench 3x5 225', date: '2026-10-03', unit: 'lbs' };
  for (const parse of [base, { ...base, draft, fix: 'actually 3x10' }]) {
    replies = [{ text: '{"exercises":[{"name":"Bench', stop_reason: 'max_tokens' }];
    const res = await call(req('pw', { parse }), env);
    assert.equal(res.status, 502);
    assert.equal(res.body.text, undefined);
    assert.match(res.body.error!, /AI service error/);
  }
});

test('rejects a malformed parse request before counting', async () => {
  const { env, store } = makeEnv();
  for (const parse of [{}, { input: 'x', date: 'today', unit: 'lbs' }, { input: 'x', date: '2026-10-03', unit: 'stone' }, { input: ' ', date: '2026-10-03', unit: 'kg' }]) {
    assert.equal((await call(req('pw', { parse }), env)).status, 400);
  }
  assert.equal(store.size, 0);
});

test('correction mode sends the draft and fix with the correction rules', async () => {
  const { env } = makeEnv();
  const draft = { exercises: [{ name: 'Bench Press', muscleGroup: 'chest' as const, sets: 3, reps: 8, weight: 135, unit: 'lbs' as const }], muscleGroups: ['chest' as const], confidence: 0.9 };
  const parse = { input: 'Bench Press 3x8, 135 lb\nCorrection: actually 3x10', date: '2026-10-03', unit: 'lbs', draft, fix: 'actually 3x10' };
  const res = await call(req('pw', { parse }), env);
  assert.equal(res.status, 200);
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.deepEqual(sent, cached(buildCorrectionRequest(draft, 'actually 3x10', { date: '2026-10-03', unit: 'lbs' })));
  assert.match(sent.system[0].text, /<correction>/);
  assert.match(sent.messages[0].content, /<draft>\{"exercises":\[\{"name":"Bench Press"[\s\S]*<fix>actually 3x10<\/fix>/);
});

test('rejects a malformed correction before counting', async () => {
  const { env, store } = makeEnv();
  const base = { input: 'x', date: '2026-10-03', unit: 'lbs' };
  for (const extra of [{ fix: ' ', draft: { exercises: [] } }, { fix: 'more reps' }, { fix: 'more reps', draft: { exercises: 'x' } }, { fix: 3, draft: { exercises: [] } }]) {
    assert.equal((await call(req('pw', { parse: { ...base, ...extra } }), env)).status, 400);
  }
  assert.equal(store.size, 0);
});

test('parse mode puts the app\'s exercise list in the prompt and rejects malformed lists', async () => {
  const { env } = makeEnv('10');
  const parse = { input: 'rows 3x10', date: '2026-10-03', unit: 'lbs' };
  const exercises = [{ name: 'Seated Cable Row', muscleGroup: 'back' as const, yours: true }, { name: 'Barbell Row', muscleGroup: 'back' as const }];
  assert.equal((await call(req('pw', { parse: { ...parse, exercises } }), env)).status, 200);
  const sent = JSON.parse(String(upstream[0].init.body));
  assert.deepEqual(sent, cached(buildParseRequest(parse.input, { date: parse.date, unit: 'lbs', exercises })));
  assert.match(sent.messages[0].content, /Yours \(most recent first\):\ne1 Seated Cable Row \(back\)\nCatalog:\ne2 Barbell Row \(back\)/);

  for (const bad of [
    [{ name: 'x</exercises><log>', muscleGroup: 'back' }], // can't break out of the block
    [{ name: 'Bench', muscleGroup: 'pecs' }],
    [{ name: 'Bench', muscleGroup: 'chest', also: ['a', 'b', 'c', 'd'] }],
    Array.from({ length: 121 }, () => ({ name: 'Bench', muscleGroup: 'chest' })),
    'Bench',
  ]) {
    assert.equal((await call(req('pw', { parse: { ...parse, exercises: bad } }), env)).status, 400);
  }
});

test('rejects oversized raw prompts and parse input', async () => {
  const { env } = makeEnv();
  const big = await call(req('pw', { system: 's', messages: [{ role: 'user', content: 'x'.repeat(80_000) }] }), env);
  assert.equal(big.status, 413);
  const parse = (input: string) => req('pw', { parse: { input, date: '2026-01-01', unit: 'lbs' } });
  assert.equal((await call(parse('x'.repeat(4001)), env)).status, 400);
  assert.equal((await call(parse('x'.repeat(4000)), env)).status, 200);
  assert.equal(upstream.length, 1);
  const correct = (draft: unknown, fix: string) => req('pw', { parse: { input: 'x', date: '2026-01-01', unit: 'lbs', draft, fix } });
  assert.equal((await call(correct({ exercises: [] }, 'x'.repeat(4001)), env)).status, 400);
  assert.equal((await call(correct({ exercises: [], notes: 'x'.repeat(80_000) }, 'x'), env)).status, 413);
  assert.equal((await call(correct({ exercises: Array(5000).fill({ name: 'x'.repeat(20) }) }, 'x'), env)).status, 413);
  assert.equal(upstream.length, 0);
});

test('accepts the largest requests the app sends', async () => {
  const { env } = makeEnv('50');
  const name = (i: number) => `exercise ${i} `.padEnd(80, 'x');
  const exercises = Array.from({ length: 120 }, (_, i) => ({ name: name(i), muscleGroup: 'chest' as const, also: [name(i + 1), name(i + 2), name(i + 3)], yours: true }));
  const draft = { isWorkout: true, muscleGroups: ['chest'], notes: 'n'.repeat(500), exercises: Array.from({ length: 30 }, (_, i) => ({ name: name(i), muscleGroup: 'chest', sets: 3, reps: 10, weight: 225 })) } as unknown as Parameters<typeof buildCorrectionRequest>[0];
  const input = 'x'.repeat(4000);
  const fix = 'x'.repeat(4000);
  const options = { date: '2026-01-01', unit: 'lbs' as const, exercises };
  // Shaped like callClaude: the legacy system/messages ride along with parse
  const send = (r: { system: string; messages: unknown[]; max_tokens: number }, parse?: unknown) => call(req('pw', { system: r.system, messages: r.messages, max_tokens: r.max_tokens, parse }, 'install-1234'), env);
  const parseReq = buildParseRequest(input, options);
  const corrReq = buildCorrectionRequest(draft, fix, options);
  assert.equal((await send(parseReq, { input, ...options })).status, 200);
  assert.equal((await send(corrReq, { input, ...options, draft, fix })).status, 200);
  // Apps from before parse mode send only the raw prompt
  assert.equal((await send(parseReq)).status, 200);
  assert.equal((await send(corrReq)).status, 200);
});

test('food mode sends the server-side food prompt with the app\'s food list, behind the same caps', async () => {
  const { env, store } = makeEnv('1');
  const food = { input: '2 eggs and toast', date: '2026-10-03', foods: ['Egg, whole (cooked)', 'Bread, white, toasted'] };
  const res = await call(req('pw', { food, system: 'client prompt', messages: [{ role: 'user', content: 'x' }] }), env);
  assert.equal(res.status, 200);
  const sent = JSON.parse(upstream[0].init.body as string);
  const built = buildFoodRequest(food.input, { date: food.date, foods: food.foods });
  assert.deepEqual(sent, { ...built, system: [{ type: 'text', text: built.system, cache_control: { type: 'ephemeral' } }] });
  assert.match(sent.messages[0].content, /<log>2 eggs and toast<\/log>\n<foods>\nf1 Egg, whole \(cooked\)\nf2 Bread, white, toasted\n<\/foods>/);
  assert.equal(store.get(`count:${new Date().toISOString().slice(0, 10)}`), '1');
  assert.equal((await call(req('pw', { food }), env)).status, 429); // one cap for workouts and food
});

test('a food reply Haiku is unsure of, unfinished or unreadable goes to Sonnet on one cap slot', async () => {
  const food = { input: 'a burrito', date: '2026-10-03', foods: ['a', 'b', 'c'] };
  const sure = '{"items":[{"said":"a burrito","name":"Burrito","kcal":700}],"confidence":0.9}';
  const models = () => upstream.map((u) => JSON.parse(u.init.body as string).model);
  for (const [first, escalated] of [
    [{ text: sure, stop_reason: 'end_turn' }, false],
    [{ text: sure.replace('0.9', '0.6'), stop_reason: 'end_turn' }, true],
    [{ text: sure, stop_reason: 'max_tokens' }, true],
    [{ text: sure, stop_reason: 'refusal' }, true],
    [{ text: 'not json', stop_reason: 'end_turn' }, true],
    [{ text: '{"items":[{"food":"f9","qty":2}],"confidence":0.4}', stop_reason: 'end_turn' }, true],
  ] as const) {
    const { env, store } = makeEnv('5');
    replies = [first, { text: 'from sonnet', stop_reason: 'end_turn' }];
    const res = await call(req('pw', { food }), env);
    assert.deepEqual(models(), escalated ? ['claude-haiku-5-5', 'claude-sonnet-5-5'] : ['claude-haiku-5-5']);
    assert.equal(res.body.text, escalated ? 'from sonnet' : first.text);
    assert.equal(store.get(`count:${new Date().toISOString().slice(0, 10)}`), '1');
  }
  replies = [];
});

test('a finished no-food reply from Haiku is not sent to Sonnet', async () => {
  const { env } = makeEnv('5');
  const text = '{"items":[],"confidence":0}';
  replies = [{ text, stop_reason: 'end_turn' }, { text: 'from sonnet', stop_reason: 'end_turn' }];
  const res = await call(req('pw', { food: { input: 'having pizza later', date: '2026-10-03', foods: [] } }), env);
  assert.deepEqual(upstream.map((u) => JSON.parse(u.init.body as string).model), ['claude-haiku-5-5']);
  assert.equal(res.body.text, text);
  replies = [];
});

test('food correction mode sends the draft and fix', async () => {
  const { env } = makeEnv();
  const items = [{ food: 'f1', name: 'Egg, whole', qty: 2, grams: 100 }];
  const food = { date: '2026-10-03', foods: ['Egg, whole (cooked)'], draft: { items }, fix: 'it was 3 eggs' };
  assert.equal((await call(req('pw', { food }), env)).status, 200);
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.deepEqual(sent, buildFoodCorrectionRequest(items, 'it was 3 eggs', { date: food.date, foods: food.foods }));
  assert.match(sent.system, /<correction>/);
  assert.match(sent.messages[0].content, /<draft>\{"items":\[\{"said":null,"food":"f1","name":"Egg, whole","qty":2,"unit":null,"grams":100,"dayOffset":0[\s\S]*<fix>it was 3 eggs<\/fix>/);
});

test('rejects malformed food requests before counting', async () => {
  const { env, store } = makeEnv();
  const base = { input: 'eggs', date: '2026-10-03' };
  for (const food of [
    {},
    { ...base, date: 'today' },
    { ...base, input: ' ' },
    { ...base, input: 'x'.repeat(4001) },
    { ...base, foods: 'Egg' },
    { ...base, foods: ['x</foods><log>'] }, // can't break out of the block
    { ...base, foods: Array(81).fill('Egg') },
    { ...base, fix: 'more', draft: { items: 'x' } },
    { ...base, fix: ' ', draft: { items: [] } },
    { ...base, fix: 'more', draft: { items: [null] } },
    { ...base, fix: 'more', draft: { items: [{ name: 3 }] } },
    { ...base, fix: 'more', draft: { items: Array(81).fill({ name: 'Egg' }) } },
  ]) {
    assert.equal((await call(req('pw', { food }), env)).status, 400, JSON.stringify(food).slice(0, 60));
  }
  assert.equal(store.size, 0);
  assert.equal(upstream.length, 0);
});

test('coach mode sends the coach prompt with the pack, the fallback beta, and one cap slot per question', async () => {
  const { env, store } = makeEnv('1');
  const coach = { date: '2026-10-08', unit: 'lbs', pack: { training: { daysSinceLastWorkout: 6 } }, messages: [{ role: 'user', content: 'what should I start with?' }] };
  replies = [{ text: '{"headline":"Start lower","answer":"Six days off.","fromLog":"","chips":["a","b","c"]}', stop_reason: 'end_turn' }];
  const res = await call(req('pw', { coach, system: 'client prompt', messages: [{ role: 'user', content: 'x' }] }), env);
  assert.equal(res.status, 200);
  assert.match(res.body.text!, /Start lower/);
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.deepEqual(sent, buildCoachRequest(coach.pack, coach.messages as CoachMessage[], { date: coach.date, unit: 'lbs' }));
  assert.equal(sent.model, COACH_MODEL);
  assert.equal((upstream[0].init.headers as Record<string, string>)['anthropic-beta'], COACH_BETA);
  assert.equal(store.get(`count:${new Date().toISOString().slice(0, 10)}`), '1');
  assert.equal((await call(req('pw', { coach }), env)).status, 429); // one cap for logs, food and questions
  replies = [];
});

test('other modes send no beta header', async () => {
  const { env } = makeEnv();
  await call(req('pw', { parse: { input: 'bench 3x5', date: '2026-10-03', unit: 'lbs' } }), env);
  assert.equal('anthropic-beta' in (upstream[0].init.headers as Record<string, string>), false);
});

test('rejects malformed coach requests before counting', async () => {
  const { env, store } = makeEnv();
  const base = { date: '2026-10-08', unit: 'lbs', pack: { a: 1 }, messages: [{ role: 'user', content: 'hi' }] };
  for (const coach of [
    {},
    { ...base, date: 'today' },
    { ...base, unit: 'stone' },
    { ...base, pack: 'summary' },
    { ...base, pack: null },
    { ...base, pack: { big: 'x'.repeat(12_000) } },
    { ...base, messages: [] },
    { ...base, messages: [{ role: 'user', content: ' ' }] },
    { ...base, messages: [{ role: 'user', content: 'x'.repeat(2001) }] },
    { ...base, messages: [{ role: 'assistant', content: 'hi' }] },
    { ...base, messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'ok' }] },
  ]) {
    assert.equal((await call(req('pw', { coach }), env)).status, 400, JSON.stringify(coach).slice(0, 60));
  }
  assert.equal(store.size, 0);
  assert.equal(upstream.length, 0);
});
test('challenge endpoint needs the password and the secret, and hands out a challenge the Worker recognises', async () => {
  const { env } = makeEnv();
  assert.equal((await call(req(undefined, '', undefined, {}, '/attest/challenge'), env)).status, 401);
  assert.equal((await call(req('pw', '', undefined, {}, '/attest/challenge'), makeEnv('2', undefined, '50', '50', { APP_ATTEST_CHALLENGE_SECRET: undefined }).env)).status, 503);
  const res = await worker.fetch(req('pw', '', undefined, {}, '/attest/challenge'), env);
  assert.equal(res.status, 200);
  const { challenge } = (await res.json()) as { challenge: string };
  await checkChallenge('cs', challenge);
});

test('register refuses bad bodies, stale challenges and attestations that do not verify, storing nothing', async () => {
  const { env, store } = makeEnv();
  const register = (body: unknown, e = env) => call(req('pw', body, undefined, {}, '/attest/register'), e);
  const good = { keyId: SAMPLE.keyId, challenge: await issueChallenge('cs'), attestation: SAMPLE.attestation };
  assert.equal((await register({})).status, 400);
  assert.equal((await register({ ...good, keyId: 'short' })).status, 400);
  assert.equal((await register({ ...good, challenge: await issueChallenge('cs', new Date(Date.now() - 10 * 60_000)) })).body.error, 'Attestation failed.');
  assert.equal((await register(good)).body.error, 'Attestation failed.'); // the recorded sample's certificate expired in 2021
  assert.equal((await register(good, makeEnv('2', undefined, '50', '50', { APP_ATTEST_APP_ID: undefined }).env)).status, 503);
  assert.equal(store.size, 0);
  assert.equal(upstream.length, 0);
});

test('log-only serves every request, counts a valid assertion on its key and logs the rest', async () => {
  const { env, store } = makeEnv('5', undefined, '5');
  const key = await attestedKey();
  store.set(`attest:${key.keyId}`, JSON.stringify(key.record));
  const body = JSON.stringify(DEFAULT_BODY);
  assert.equal((await call(req('pw', body, 'device-aaaa'), env)).status, 200); // unsigned: older build
  assert.equal(store.get(`device:device-aaaa:${today()}`), '1');
  const signed = await key.sign(body, 1);
  assert.equal((await call(req('pw', body, 'device-aaaa', signed), env)).status, 200);
  assert.equal(store.get(`device:${key.keyId}:${today()}`), '1'); // capped by key, not install id
  assert.equal(JSON.parse(store.get(`attest:${key.keyId}`)!).counter, 1);
  assert.equal((await call(req('pw', body, 'device-aaaa', signed), env)).status, 200); // a replay is served but not trusted
  assert.equal(store.get(`device:device-aaaa:${today()}`), '2');
  assert.equal(store.get(`device:${key.keyId}:${today()}`), '1');
});

test('enforce refuses unsigned, unknown, replayed, tampered and stale requests before counting, and caps by key', async () => {
  const { env, store } = makeEnv('9', undefined, '1', '50', { APP_ATTEST_MODE: 'enforce' });
  const key = await attestedKey();
  store.set(`attest:${key.keyId}`, JSON.stringify(key.record));
  const body = JSON.stringify(DEFAULT_BODY);
  const refused = async (headers: Record<string, string>, b = body) => {
    const res = await call(req('pw', b, 'device-aaaa', headers), env);
    assert.equal(res.status, 403);
    assert.match(res.body.error!, /couldn't be verified/);
  };
  await refused({});
  const stranger = await attestedKey();
  await refused(await stranger.sign(body, 1));
  await refused({ ...(await key.sign(body, 1)), 'x-attest-key-id': stranger.keyId });
  await refused(await key.sign(body, 1, await issueChallenge('cs', new Date(Date.now() - 10 * 60_000)))); // stale challenge
  await refused(await key.sign(body, 1, await issueChallenge('other'))); // forged challenge
  await refused(await key.sign(body, 1), JSON.stringify({ ...DEFAULT_BODY, max_tokens: 5 })); // body changed after signing
  await refused(await (await attestedKey('TEAM.com.other.app')).sign(body, 1));
  assert.equal(store.size, 1);
  assert.equal(upstream.length, 0);

  const signed = await key.sign(body, 1);
  assert.equal((await call(req('pw', body, 'device-aaaa', signed), env)).status, 200);
  await refused(signed); // replay
  await refused(await key.sign(body, 1)); // counter did not move
  const capped = await call(req('pw', body, 'device-bbbb', await key.sign(body, 2)), env); // a new install id, same key
  assert.equal(capped.status, 429);
  assert.match(capped.body.error!, /on this phone/);
  assert.equal(JSON.parse(store.get(`attest:${key.keyId}`)!).counter, 1); // a capped request writes nothing
});

test('without both App Attest secrets, even enforce serves every request and touches no keys', async () => {
  for (const missing of ['APP_ATTEST_APP_ID', 'APP_ATTEST_CHALLENGE_SECRET'] as const) {
    const { env, store } = makeEnv('5', undefined, '5', '50', { APP_ATTEST_MODE: 'enforce', [missing]: undefined });
    const read: string[] = [];
    const { get } = env.USAGE;
    env.USAGE = { ...env.USAGE, get: (k: string, type?: string) => (read.push(k), (get as (k: string, t?: string) => Promise<unknown>)(k, type)) } as unknown as KVNamespace;
    const key = await attestedKey();
    const body = JSON.stringify(DEFAULT_BODY);
    assert.equal((await call(req('pw', body, 'device-aaaa'), env)).status, 200);
    assert.equal((await call(req('pw', body, 'device-aaaa', await key.sign(body, 1)), env)).status, 200);
    assert.equal(store.get(`device:device-aaaa:${today()}`), '2');
    assert.deepEqual([...store.keys(), ...read].filter((k) => k.startsWith('attest:')), []);
    assert.equal((await call(req('pw', '', undefined, {}, '/attest/challenge'), env)).status, 503);
  }
});
