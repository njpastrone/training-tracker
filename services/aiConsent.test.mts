/// <reference types="node" />
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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
const { setAiConsentAsker } = await import('./aiConsent');
const { callClaude, parseWorkout, AiOffError } = await import('./claude');

process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
let sent = 0;
globalThis.fetch = (async () => {
  sent++;
  return new Response(JSON.stringify({ text: 'ok' }), { status: 200 });
}) as typeof fetch;

let asked = 0;
const answer = (agreed: boolean | null) => setAiConsentAsker(async () => { asked++; return agreed; });
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
  answer(false);
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
  answer(true);
  assert.equal(await callClaude('sys', 'bench 3x8', 100), 'ok');
  assert.equal(await callClaude('sys', 'squats', 100), 'ok');
  assert.equal(sent, 2);
  assert.equal(asked, 1);
  assert.equal(consent(), 'granted');
});

test('calls waiting at the same time share one sheet', async () => {
  answer(true);
  await Promise.all([callClaude('sys', 'a', 100), callClaude('sys', 'b', 100)]);
  assert.equal(asked, 1);
  assert.equal(sent, 2);
});

test('with AI off a typed log becomes one exercise per line or comma, sent nowhere', async () => {
  useWorkoutStore.getState().updateSettings({ aiConsent: 'declined' });
  const parsed = await parseWorkout('bench press, squats\nplank', { date: '2026-10-06', unit: 'lbs' });
  assert.equal(sent, 0);
  assert.deepEqual(parsed?.exercises.map(e => [e.name, e.muscleGroup]), [['bench press', 'chest'], ['squats', 'quads'], ['plank', 'core']]);
  const lines = await parseWorkout('leg curl\nleg press\ncrunches\nrunning', { date: '2026-10-06', unit: 'lbs' });
  assert.deepEqual(lines?.exercises.map(e => e.muscleGroup), ['hamstrings', 'quads', 'core', 'cardio']);
});
