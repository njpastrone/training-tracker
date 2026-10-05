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
