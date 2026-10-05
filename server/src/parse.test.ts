import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeParse } from './parse.ts';

test('finalizeParse falls back to the default unit when the model omits or misspells it', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Squat', sets: 3, reps: 5, weight: 100, unit: null },
      { name: 'Bench Press', sets: 3, reps: 5, weight: 80, unit: 'KG' },
      { name: 'Deadlift', sets: 1, reps: 5, weight: 300, unit: 'lbs' },
      { name: 'Pull-ups', sets: 3, reps: 8, unit: null },
    ],
  });
  const units = finalizeParse(text, 'kg')!.exercises.map((e) => e.unit);
  assert.deepEqual(units, ['kg', 'kg', 'lbs', undefined]);
  assert.equal(finalizeParse(text)!.exercises[0].unit, undefined);
});

test('finalizeParse keeps a stated unit that differs from the default', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Squat', weight: 100, unit: ' KGS ' },
      { name: 'Bench Press', weight: 80, unit: 'Kilograms' },
      { name: 'Deadlift', weight: 300, unit: 'Pounds' },
    ],
  });
  assert.deepEqual(finalizeParse(text, 'lbs')!.exercises.map((e) => e.unit), ['kg', 'kg', 'lbs']);
  assert.deepEqual(finalizeParse(text, 'kg')!.exercises.map((e) => e.unit), ['kg', 'kg', 'lbs']);
});

test('finalizeParse keeps any past dayOffset and treats others as today', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Running', dayOffset: -21 },
      { name: 'Squat', dayOffset: -1.2 },
      { name: 'Bench Press', dayOffset: 3 },
      { name: 'Deadlift', dayOffset: 'yesterday' },
    ],
  });
  assert.deepEqual(finalizeParse(text)!.exercises.map((e) => e.dayOffset), [-21, -1, undefined, undefined]);
});

test('finalizeParse merges identical sets in a row, keeping each note', () => {
  const text = JSON.stringify({ exercises: [
    { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg' },
    { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg', notes: 'wraps' },
    { name: 'Squat', sets: 1, reps: 3, weight: 150, unit: 'kg' },
    { name: 'Bench Press', sets: 3, reps: 5, weight: 100, unit: 'kg', dayOffset: -1 },
    { name: 'Bench Press', sets: 3, reps: 5, weight: 100, unit: 'kg' },
  ] });
  assert.deepEqual(finalizeParse(text)!.exercises.map((e) => [e.name, e.sets, e.weight, e.notes]), [
    ['Squat', 4, 140, 'wraps'], ['Squat', 1, 150, undefined], ['Bench Press', 3, 100, undefined], ['Bench Press', 3, 100, undefined],
  ]);
});

test('finalizeParse never stores assistance as a weight', async () => {
  const { buildCandidates } = await import('./identity.ts');
  const input = 'assisted pullups 3x8 with 50 lbs assistance';
  const candidates = buildCandidates(input, []);
  const ex = `e${candidates.findIndex((c) => c.id === 'assisted-pull-up') + 1}`;
  const text = JSON.stringify({ exercises: [{ said: 'assisted pullups', ex, sets: 3, reps: 8, weight: 50, unit: 'lbs' }] });
  const [e] = finalizeParse(text, 'lbs', { input, candidates })!.exercises;
  assert.deepEqual([e.weight, e.unit, e.notes], [undefined, undefined, '50 lbs assistance']);
});
