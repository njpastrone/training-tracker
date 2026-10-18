import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { type Env } from './index.ts';

function makeEnv() {
  const store = new Map<string, string>();
  const USAGE = { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v) } as unknown as KVNamespace;
  const env = { APP_PASSWORD: 'pw', DAILY_REQUEST_CAP: '2', DEVICE_DAILY_CAP: '2', LEGACY_DAILY_CAP: '2', USAGE } as Env;
  return { env, store };
}
const join = (env: Env, body: string, ip = '1.2.3.4') =>
  worker.fetch(new Request('https://lifttextapp.com/waitlist', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': ip }, body }), env);
const emails = (store: Map<string, string>) => [...store.keys()].filter((k) => k.startsWith('waitlist:'));

test('serves the home page to anyone, with the waitlist form and links to the policies', async () => {
  const { env, store } = makeEnv();
  const res = await worker.fetch(new Request('https://lifttextapp.com/'), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  assert.match(html, /<form[^>]+method="post" action="\/waitlist"/);
  assert.match(html, /<label for="email">/);
  assert.match(html, /beta/i);
  for (const link of ['href="/privacy"', 'href="/terms"', 'mailto:support@lifttextapp.com']) assert.ok(html.includes(link), link);
  assert.doesNotMatch(html, /<script/);
  assert.equal(store.size, 0);
});

test('www redirects to the apex domain', async () => {
  const res = await worker.fetch(new Request('https://www.lifttextapp.com/privacy'), makeEnv().env);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://lifttextapp.com/privacy');
});

test('the waitlist stores a valid email once, lowercased, and says thanks', async () => {
  const { env, store } = makeEnv();
  const res = await join(env, 'email=%20Me%40Example.com%20');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /You're on the list/);
  assert.deepEqual(emails(store), ['waitlist:me@example.com']);
  assert.ok(!isNaN(Date.parse(store.get('waitlist:me@example.com')!)));
  const again = await join(env, 'email=me%40example.com');
  assert.match(await again.text(), /already on the list/);
  assert.equal(store.get(`waitlist-count:${new Date().toISOString().slice(0, 10)}`), '1');
  // The IP is kept only as a hash
  assert.ok(![...store.keys()].some((k) => k.includes('1.2.3.4')));
});

test('the waitlist refuses bad emails and oversized bodies, and quietly drops bots', async () => {
  const { env, store } = makeEnv();
  for (const bad of ['', 'email=', 'email=nope', 'email=a%40b', 'email=%3Cscript%3E%40x.com', `email=${'a'.repeat(250)}%40x.com`]) {
    const res = await join(env, bad);
    assert.equal(res.status, 400, bad);
    assert.match(await res.text(), /doesn't look like an email/);
  }
  assert.equal((await join(env, `email=a%40b.com&x=${'a'.repeat(3000)}`)).status, 413);
  const bot = await join(env, 'email=bot%40spam.com&website=http%3A%2F%2Fspam');
  assert.equal(bot.status, 200);
  assert.equal(store.size, 0);
});

test('the waitlist limits sign-ups per address and per day', async () => {
  const { env, store } = makeEnv();
  for (let i = 0; i < 5; i++) assert.equal((await join(env, `email=a${i}%40x.com`)).status, 200);
  const limited = await join(env, 'email=a5%40x.com');
  assert.equal(limited.status, 429);
  assert.match(await limited.text(), /full for today/);
  for (let i = 5; i < 25; i++) assert.equal((await join(env, `email=a${i}%40x.com`, `10.0.0.${i}`)).status, 200);
  assert.equal((await join(env, 'email=late%40x.com', '10.0.1.1')).status, 429);
  assert.equal(emails(store).length, 25);
});

test('a storage failure is a friendly error, not a crash', async () => {
  const { env } = makeEnv();
  env.USAGE = { get: async () => { throw new Error('kv down'); } } as unknown as KVNamespace;
  const res = await join(env, 'email=me%40example.com');
  assert.equal(res.status, 503);
  assert.match(await res.text(), /try again/);
});
