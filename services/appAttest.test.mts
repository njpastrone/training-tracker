/// <reference types="node" />
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// In-memory AsyncStorage so the real services run under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

// A fake App Attest module: keys are numbered, attestations and assertions name what they were made over
let keys = 0;
let brokenKey: string | null = null; // a key the Secure Enclave no longer accepts (what a lost key looks like)
mock.module('@expo/app-integrity', {
  namedExports: {
    isSupported: true,
    generateKeyAsync: async () => `key${++keys}`,
    attestKeyAsync: async (id: string, challenge: string) => `attest(${id},${challenge})`,
    generateAssertionAsync: async (id: string, clientData: string) => {
      if (id === brokenKey) throw Object.assign(new Error('invalid key'), { code: 'ERR_APP_INTEGRITY_INVALID_KEY' });
      return `assert(${id},${clientData})`;
    },
  },
});

const { useWorkoutStore } = await import('../stores/workoutStore');
const { callClaude } = await import('./claude');

process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
process.env.EXPO_PUBLIC_APP_PASSWORD = 'pw';

let calls: { path: string; headers: Record<string, string>; body?: string }[] = [];
let challenges = 0;
let challengeStatus = 200;
let refuse = 0; // how many of the next AI requests the Worker refuses (403)
globalThis.fetch = (async (url: string, init: RequestInit) => {
  const path = new URL(url).pathname;
  calls.push({ path, headers: init.headers as Record<string, string>, body: init.body as string | undefined });
  if (path === '/attest/challenge') return new Response(JSON.stringify(challengeStatus === 200 ? { challenge: `c${++challenges}` } : { error: 'App Attest is not configured.' }), { status: challengeStatus });
  if (path === '/attest/register') return new Response(JSON.stringify({ ok: true }), { status: 200 });
  if (refuse) { refuse--; return new Response(JSON.stringify({ error: 'Unverified.' }), { status: 403 }); }
  return new Response(JSON.stringify({ text: 'ok' }), { status: 200 });
}) as typeof fetch;

const ai = () => calls.filter((c) => c.path === '/');
const sentBody = (system: string, content: string, maxTokens: number) => JSON.stringify({ system, messages: [{ role: 'user', content }], max_tokens: maxTokens });

beforeEach(() => {
  calls = [];
  challengeStatus = 200;
  brokenKey = null;
  useWorkoutStore.getState().updateSettings({ aiConsent: 'granted', aiConsentVersion: 2 });
});

test('the first request attests a new key and registers it, then signs the request body', async () => {
  assert.equal(await callClaude('sys', 'bench 3x8', 100), 'ok');
  const register = calls.find((c) => c.path === '/attest/register')!;
  assert.deepEqual(JSON.parse(register.body!), { keyId: 'key1', challenge: 'c1', attestation: 'attest(key1,c1)' });
  assert.equal(register.headers['x-app-password'], 'pw');
  const [req] = ai();
  assert.equal(req.body, sentBody('sys', 'bench 3x8', 100));
  assert.equal(req.headers['x-attest-key-id'], 'key1');
  assert.equal(req.headers['x-attest-challenge'], 'c2');
  assert.equal(req.headers['x-attest-assertion'], `assert(key1,c2\n${req.body})`); // signed over the challenge and the exact body sent
  assert.equal(mem.get('@training-tracker/app-attest-key-id'), 'key1');
});

test('later requests reuse the key with a fresh challenge each', async () => {
  await callClaude('sys', 'squats', 100);
  assert.equal(calls.filter((c) => c.path === '/attest/register').length, 0);
  assert.equal(calls.filter((c) => c.path === '/attest/challenge').length, 1);
  const [req] = ai();
  assert.equal(req.headers['x-attest-key-id'], 'key1');
  assert.equal(req.headers['x-attest-challenge'], 'c3');
});

test('a 403 from the Worker retries once with the same key and a fresh challenge', async () => {
  refuse = 1;
  assert.equal(await callClaude('sys', 'rows', 100), 'ok');
  const [first, second] = ai();
  assert.equal(first.headers['x-attest-key-id'], 'key1');
  assert.equal(second.headers['x-attest-key-id'], 'key1');
  assert.notEqual(second.headers['x-attest-challenge'], first.headers['x-attest-challenge']);
  assert.equal(second.body, first.body);
  assert.equal(mem.get('@training-tracker/app-attest-key-id'), 'key1');
});

test('a second 403 drops the key, and the next request attests a new one', async () => {
  refuse = 2;
  await assert.rejects(callClaude('sys', 'rows', 100), { status: 403, message: 'Unverified.' });
  assert.deepEqual(ai().map((c) => c.headers['x-attest-key-id']), ['key1', 'key1']);
  assert.equal(await callClaude('sys', 'rows', 100), 'ok');
  assert.equal(ai()[2].headers['x-attest-key-id'], 'key2');
  assert.equal(mem.get('@training-tracker/app-attest-key-id'), 'key2');
});

test('a key the phone no longer has goes out unsigned once, then the next request attests a new one', async () => {
  brokenKey = 'key2';
  assert.equal(await callClaude('sys', 'curls', 100), 'ok');
  assert.equal(ai()[0].headers['x-attest-key-id'], undefined);
  assert.equal(mem.get('@training-tracker/app-attest-key-id'), undefined);
  assert.equal(await callClaude('sys', 'curls', 100), 'ok');
  assert.equal(ai()[1].headers['x-attest-key-id'], 'key3');
  assert.equal(ai().length, 2);
});

test('when the Worker has no App Attest set up the request still goes out, unsigned, and the key is kept', async () => {
  challengeStatus = 503;
  assert.equal(await callClaude('sys', 'dips', 100), 'ok');
  const [req] = ai();
  assert.equal(req.headers['x-attest-key-id'], undefined);
  assert.equal(req.headers['x-install-id'] !== undefined, true);
  assert.equal(mem.get('@training-tracker/app-attest-key-id'), 'key3');
});
