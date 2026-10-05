import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { type Env } from './index.ts';
import { buildParseRequest } from './parse.ts';

function makeEnv(cap = '2', count?: number) {
  const store = new Map<string, string>();
  if (count !== undefined) store.set(`count:${new Date().toISOString().slice(0, 10)}`, String(count));
  const USAGE = {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => void store.set(k, v),
  } as unknown as KVNamespace;
  return { env: { ANTHROPIC_API_KEY: 'sk-test', APP_PASSWORD: 'pw', DAILY_REQUEST_CAP: cap, USAGE } as Env, store };
}

function req(password?: string, body: unknown = { system: 's', messages: [{ role: 'user', content: 'hi' }], max_tokens: 99999 }) {
  return new Request('https://worker.test/', {
    method: 'POST',
    headers: password === undefined ? {} : { 'x-app-password': password },
    body: JSON.stringify(body),
  });
}

let upstream: { url: string; init: RequestInit }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit) => {
  upstream.push({ url, init });
  return Response.json({ content: [{ type: 'text', text: '{"ok":true}' }] });
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

test('forwards with server-chosen model and capped max_tokens', async () => {
  const { env } = makeEnv();
  const { status, body } = await call(req('pw'), env);
  assert.equal(status, 200);
  assert.equal(body.text, '{"ok":true}');
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.equal(sent.model, 'claude-haiku-4-5-20251001');
  assert.equal(sent.max_tokens, 1500);
  assert.equal((upstream[0].init.headers as Record<string, string>)['x-api-key'], 'sk-test');
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

test('parse mode sends the server-side parse prompt and ignores the client prompt', async () => {
  const { env } = makeEnv();
  const parse = { input: 'bench 3x5 225', date: '2026-10-03', unit: 'lbs' };
  const res = await call(req('pw', { parse, system: 'client prompt', messages: [{ role: 'user', content: 'x' }] }), env);
  assert.equal(res.status, 200);
  const sent = JSON.parse(upstream[0].init.body as string);
  assert.deepEqual(sent, buildParseRequest(parse.input, { date: parse.date, unit: 'lbs' }));
  assert.match(sent.messages[0].content, /Saturday 2026-10-03[\s\S]*<log>bench 3x5 225<\/log>/);
});

test('rejects a malformed parse request before counting', async () => {
  const { env, store } = makeEnv();
  for (const parse of [{}, { input: 'x', date: 'today', unit: 'lbs' }, { input: 'x', date: '2026-10-03', unit: 'stone' }, { input: ' ', date: '2026-10-03', unit: 'kg' }]) {
    assert.equal((await call(req('pw', { parse }), env)).status, 400);
  }
  assert.equal(store.size, 0);
});
