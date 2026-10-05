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
