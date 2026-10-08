/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
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

// A fake Worker: records each request and answers like the model would
process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
let sent: { parse?: { input: string }; food?: { input: string; foods: string[] } }[] = [];
let offline = false;
let refuse = 0;
let refuseAll = false;
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body));
  sent.push(body);
  if (offline) throw new TypeError('Network request failed');
  if (refuse && (body.food || refuseAll)) return Response.json({ error: 'Daily limit reached.' }, { status: refuse });
  if (body.food?.fix) {
    // Keeps the draft's own keys: the egg is f1 because draft foods are listed first
    const reply = /protein/.test(body.food.fix) ? 'About 19 g of protein.' : null;
    if (/rice/.test(body.food.fix)) return Response.json({ text: JSON.stringify({ items: [{ said: 'eggs', food: 'f1', qty: 2, grams: 100 }, { said: 'rice', food: `f${body.food.foods.findIndex((f: string) => /^Rice/.test(f)) + 1}` }], confidence: 0.9 }) });
    const qty = /3 eggs/.test(body.food.fix) ? 3 : 2;
    return Response.json({ text: JSON.stringify({ items: [{ said: 'eggs', food: 'f1', qty, grams: qty * 50 }], confidence: 0.9, reply }) });
  }
  if (body.food) {
    // Picks the first listed food for eggs (the app lists what the log names first)
    const items = /big mac/i.test(body.food.input)
      ? [{ said: 'a Big Mac', food: null, name: 'Big Mac', qty: 1, grams: 219, kcal: 580, protein: 25, carbs: 45, fat: 34 }]
      : /egg/i.test(body.food.input) ? [{ said: '2 eggs', food: 'f1', qty: 2, grams: 100 }] : [];
    return Response.json({ text: JSON.stringify({ items, confidence: 0.9 }) });
  }
  const exercises = /squat|bench/i.test(body.parse.input) ? [{ said: 'squat', name: 'Squat', muscleGroup: 'quads', sets: 3, reps: 5, weight: 225 }] : [];
  return Response.json({ text: JSON.stringify({ exercises, muscleGroups: exercises.length ? ['quads'] : [], confidence: 0.9 }) });
}) as typeof fetch;

const { parseLog, correctFood } = await import('./claude');
const { useWorkoutStore } = await import('../stores/workoutStore');
const options = { date: '2026-10-03', unit: 'lbs' as const };
const foods = (r: Awaited<ReturnType<typeof parseLog>>) => r.food?.items.map(i => i.foodId ?? i.name) ?? [];
const asked = () => sent.map(b => (b.food ? 'food' : 'workout'));

beforeEach(() => {
  sent = [];
  offline = false;
  refuse = 0;
  refuseAll = false;
  useWorkoutStore.getState().updateSettings({ aiConsent: 'granted' });
});

test('food goes to the AI, grounded in the table foods the log names', async () => {
  const r = await parseLog('2 eggs', options);
  assert.deepEqual(asked(), ['food']);
  assert.ok(sent[0].food!.foods[0].startsWith('Egg'));
  assert.equal(r.workout, null);
  assert.deepEqual(foods(r), ['egg']);
});

test('workout and food in one message: both parsers, at once', async () => {
  const r = await parseLog('squat 3x5 at 225, then 2 eggs', options);
  assert.deepEqual(asked().sort(), ['food', 'workout']);
  assert.equal(r.workout?.exercises[0].name, 'Squat');
  assert.deepEqual(foods(r), ['egg']);
});

test('restaurant food goes to the AI with the table foods the log names', async () => {
  const r = await parseLog('had a Big Mac and fries', options);
  assert.deepEqual(asked(), ['food']);
  assert.ok(sent[0].food!.foods.some(f => /fries/i.test(f)), 'fries are a candidate');
  assert.deepEqual(foods(r), ['Big Mac']);
  assert.equal(r.food!.items[0].source, 'estimate');
});

test('a workout alone never calls the food parser', async () => {
  const r = await parseLog('bench 3x5 225', options);
  assert.deepEqual(asked(), ['workout']);
  assert.equal(r.food, null);
});

test('when the parser that ran finds nothing, the other one gets a try', async () => {
  const r = await parseLog('mystery stew', options);
  assert.deepEqual(asked(), ['workout', 'food']);
  assert.equal(r.workout, null);
  assert.equal(r.food, null);
});

test('AI off: each part goes to its side, nothing is sent', async () => {
  useWorkoutStore.getState().updateSettings({ aiConsent: 'declined' });
  const r = await parseLog('squat 3x5, then a Big Mac', options);
  assert.deepEqual(asked(), []);
  assert.deepEqual(r.workout?.exercises.map(e => e.name), ['squat 3x5']);
  assert.deepEqual(foods(r), ['Big Mac']);
});

test('offline with both halves: each falls back to its own part, never the whole message', async () => {
  offline = true;
  const r = await parseLog('squat 3x5, then a Big Mac', options);
  assert.deepEqual(asked().sort(), ['food', 'workout']);
  assert.deepEqual(r.workout?.exercises.map(e => e.name), ['squat 3x5']);
  assert.deepEqual(foods(r), ['Big Mac']);
});

test('at the daily cap, plain foods still log from the phone; a wrong password still shows', async () => {
  refuse = 429;
  const r = await parseLog('2 eggs and a banana', options);
  assert.deepEqual(asked(), ['food']);
  assert.deepEqual(foods(r).sort(), ['banana', 'egg']);
  refuse = 401;
  await assert.rejects(parseLog('2 eggs and a banana', options), /Daily limit/);
});

test('at the daily cap, a mixed log keeps both halves from the phone', async () => {
  refuse = 429;
  refuseAll = true;
  const r = await parseLog('bench 3x5 then 2 eggs and a banana', options);
  assert.deepEqual(asked().sort(), ['food', 'workout']);
  assert.ok(r.workout?.exercises.length);
  assert.deepEqual(foods(r).sort(), ['banana', 'egg']);
});

test('a typed fix to the food keeps its table food and recomputes; a question gets an answer', async () => {
  const draft = (await parseLog('2 eggs', options)).food!;
  const fixed = await correctFood(draft, 'it was 3 eggs', options.date);
  assert.equal(sent[0].food!.foods[0].startsWith('Egg'), true);
  assert.deepEqual(fixed!.draft.items.map(i => [i.foodId, i.qty, i.grams]), [['egg', 3, 150]]);
  assert.ok(fixed!.draft.items[0].macros.kcal > draft.items[0].macros.kcal);
  const asked = await correctFood(draft, 'how much protein is that?', options.date);
  assert.equal(asked!.reply, 'About 19 g of protein.');
});

test('a fix that adds a food with no amount uses your usual portion of it', async () => {
  useWorkoutStore.getState().addFoodEntry({ id: 'r', date: '2026-10-01', rawInput: '', createdAt: '2026-10-01T12:00:00Z', items: [{ id: '1', name: 'Rice', foodId: 'rice', qty: 2, unit: 'cup', macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'usda' }] });
  const draft = (await parseLog('2 eggs', options)).food!;
  const fixed = await correctFood(draft, 'add rice', options.date);
  assert.deepEqual(fixed!.draft.items.map(i => [i.foodId, i.qty, i.unit]), [['egg', 2, undefined], ['rice', 2, 'cup']]);
});
