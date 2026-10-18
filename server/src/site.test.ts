import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { type Env } from './index.ts';

function makeEnv() {
  const store = new Map<string, string>();
  const reads: string[] = [];
  const USAGE = { get: async (k: string) => (reads.push(k), store.get(k) ?? null), put: async (k: string, v: string) => void store.set(k, v) } as unknown as KVNamespace;
  const env = { APP_PASSWORD: 'pw', DAILY_REQUEST_CAP: '2', DEVICE_DAILY_CAP: '2', LEGACY_DAILY_CAP: '2', USAGE } as Env;
  return { env, store, reads };
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

test('the home page is one small self-contained file that works in light, dark and reduced motion', async () => {
  const html = await (await worker.fetch(new Request('https://lifttextapp.com/'), makeEnv().env)).text();
  assert.ok(new TextEncoder().encode(html).length < 100_000);
  // Nothing loaded from anywhere else: no scripts, stylesheets, fonts, images or trackers
  assert.doesNotMatch(html, /<link|<img|src=|@import|url\(|href="https?:/);
  assert.match(html, /prefers-color-scheme: dark/);
  // Motion only runs when the visitor hasn't asked for less
  const [beforeMotion, motion] = html.split('@media (prefers-reduced-motion: no-preference)');
  assert.ok(motion);
  assert.doesNotMatch(beforeMotion, /animation:/);
  // The phone mockup is one labelled picture, so screen readers don't read the fake screen line by line
  assert.match(html, /<figure class="phone" role="img" aria-label="[^"]*bench 3x5 185, then 2 eggs and toast[^"]*">\n<div class="screen" aria-hidden="true">/);
  // Every "join" link lands on the form
  assert.match(html, /<div id="join"><form/);
  assert.equal(html.match(/href="#join"/g)?.length, 2);
});

test('the home page makes no claims the app does not ship and shows no made-up social proof', async () => {
  const html = await (await worker.fetch(new Request('https://lifttextapp.com/'), makeEnv().env)).text();
  assert.doesNotMatch(html, /Apple Health|HealthKit|Watch|Android|sync|calories burned|voice|photo|camera|review(s|ed by)|rating|★|downloads|users/i);
});

test('the thank-you page keeps the join anchor', async () => {
  const res = await join(makeEnv().env, 'email=me%40example.com');
  assert.match(await res.text(), /<div id="join"><div class="card" role="status">/);
});

test('www redirects to the apex domain', async () => {
  const res = await worker.fetch(new Request('https://www.lifttextapp.com/privacy?utm_source=x'), makeEnv().env);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://lifttextapp.com/privacy?utm_source=x');
});

test('the waitlist stores a valid email once, lowercased, and says thanks', async () => {
  const { env, store } = makeEnv();
  const res = await join(env, 'email=%20Me%40Example.com%20');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /You're on the list/);
  assert.deepEqual(emails(store), ['waitlist:me@example.com']);
  assert.ok(!isNaN(Date.parse(store.get('waitlist:me@example.com')!)));
  const again = await join(env, 'email=me%40example.com');
  assert.equal(again.status, 200);
  assert.equal(await again.text(), await (await join(env, 'email=new%40example.com')).text());
  store.delete('waitlist:new@example.com');
  assert.equal(store.get(`waitlist-count:${new Date().toISOString().slice(0, 10)}`), '3');
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

test('repeat sign-ups count toward the per-address limit, and a refused request reads only the address counter', async () => {
  const { env, store, reads } = makeEnv();
  for (let i = 0; i < 5; i++) assert.equal((await join(env, 'email=me%40x.com')).status, 200);
  reads.length = 0;
  assert.equal((await join(env, 'email=other%40x.com')).status, 429);
  assert.equal(reads.length, 1);
  assert.ok(reads[0].startsWith('waitlist-ip:'));
  assert.deepEqual(emails(store), ['waitlist:me@x.com']);
});

test('repeat sign-ups count toward the daily limit', async () => {
  const { env, store } = makeEnv();
  for (let i = 0; i < 25; i++) assert.equal((await join(env, 'email=me%40x.com', `10.0.0.${i}`)).status, 200);
  assert.equal((await join(env, 'email=me%40x.com', '10.0.1.1')).status, 429);
  assert.equal((await join(env, 'email=new%40x.com', '10.0.1.2')).status, 429);
  assert.deepEqual(emails(store), ['waitlist:me@x.com']);
});

test('a storage failure is a friendly error, not a crash', async () => {
  const { env } = makeEnv();
  env.USAGE = { get: async () => { throw new Error('kv down'); } } as unknown as KVNamespace;
  const res = await join(env, 'email=me%40example.com');
  assert.equal(res.status, 503);
  assert.match(await res.text(), /try again/);
});
