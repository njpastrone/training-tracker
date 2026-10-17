/// <reference types="node" />
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { AiConsentAnswer } from './aiConsent';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

const { useWorkoutStore } = await import('../stores/workoutStore');
const { askAiConsent, setAiConsentAsker } = await import('./aiConsent');
const { callClaude, parseLog, parseWorkout, AiOffError } = await import('./claude');

process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
let sent = 0;
globalThis.fetch = (async () => {
  sent++;
  return new Response(JSON.stringify({ text: 'ok' }), { status: 200 });
}) as typeof fetch;

let asked = 0;
const answer = (reply: AiConsentAnswer | null) => setAiConsentAsker(async () => { asked++; return reply; });
const consent = () => useWorkoutStore.getState().settings.aiConsent;

beforeEach(() => {
  sent = 0;
  asked = 0;
  useWorkoutStore.getState().updateSettings({ aiConsent: undefined });
  setAiConsentAsker(null);
});

test('nothing is sent before the user has been asked', async () => {
  await assert.rejects(callClaude('sys', 'bench 3x8', 100), AiOffError);
  assert.equal(sent, 0);
  assert.equal(consent(), undefined);
});

test('Not now sends nothing, is remembered, and is not asked again', async () => {
  answer('declined');
  await assert.rejects(callClaude('sys', 'bench 3x8', 100), AiOffError);
  await assert.rejects(callClaude('sys', 'squats', 100), AiOffError);
  assert.equal(sent, 0);
  assert.equal(asked, 1);
  assert.equal(consent(), 'declined');
});

test('swiping the sheet away sends nothing and asks again next time', async () => {
  answer(null);
  await assert.rejects(callClaude('sys', 'bench 3x8', 100), AiOffError);
  assert.equal(sent, 0);
  assert.equal(consent(), undefined);
});

test('Agree sends this call and later ones without asking again', async () => {
  answer('granted');
  assert.equal(await callClaude('sys', 'bench 3x8', 100), 'ok');
  assert.equal(await callClaude('sys', 'squats', 100), 'ok');
  assert.equal(sent, 2);
  assert.equal(asked, 1);
  assert.equal(consent(), 'granted');
});

test('calls waiting at the same time share one sheet', async () => {
  answer('granted');
  await Promise.all([callClaude('sys', 'a', 100), callClaude('sys', 'b', 100)]);
  assert.equal(asked, 1);
  assert.equal(sent, 2);
});

test('with AI off a typed log becomes one exercise per line or comma, sent nowhere', async () => {
  useWorkoutStore.getState().updateSettings({ aiConsent: 'declined' });
  const parsed = await parseWorkout('bench press, squats\nplank', { date: '2026-10-06', unit: 'lbs' });
  assert.equal(sent, 0);
  assert.deepEqual(parsed?.exercises.map(e => [e.name, e.muscleGroup]), [['bench press', 'chest'], ['squats', 'quads'], ['plank', 'core']]);
  const lines = await parseWorkout('leg curl\nleg press\ncrunches\nrunning\nlat pulldown\npullups\nbenching', { date: '2026-10-06', unit: 'lbs' });
  assert.deepEqual(lines?.exercises.map(e => e.muscleGroup), ['hamstrings', 'quads', 'core', 'cardio', 'back', 'back', 'chest']);
});

test('under 18: the Worker is never called, the answer is remembered, and logs read on the phone', async () => {
  answer('under18');
  await assert.rejects(callClaude('sys', 'bench 3x8', 100), AiOffError);
  const parsed = await parseLog('bench press, 2 eggs', { date: '2026-10-06', unit: 'lbs' });
  assert.deepEqual(parsed.workout?.exercises.map(e => [e.name, e.muscleGroup]), [['bench press', 'chest']]);
  assert.equal(parsed.food?.items.length, 1);
  assert.equal(sent, 0);
  assert.equal(asked, 1);
  assert.equal(consent(), 'under18');
});

test('AI turns on only with a yes from someone 18 or older, asked again from Settings', async () => {
  useWorkoutStore.getState().updateSettings({ aiConsent: 'under18' });
  answer('under18');
  assert.equal(await askAiConsent(), false);
  await assert.rejects(callClaude('sys', 'bench 3x8', 100), AiOffError);
  answer('granted');
  assert.equal(await askAiConsent(), true);
  assert.equal(await callClaude('sys', 'bench 3x8', 100), 'ok');
  assert.equal(sent, 1);
});
