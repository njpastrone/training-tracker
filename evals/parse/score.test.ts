import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCase } from './score.ts';
import type { Case } from './cases.ts';

const c: Case = {
  id: 't', category: 't', input: '',
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 225, unit: 'lbs' },
    { name: 'Running', muscleGroup: 'cardio', distance: 5, distanceUnit: 'km', notes: ['easy'] },
  ],
  notes: ['knee'],
};
const right = () => ({
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 225, unit: 'lbs' },
    { name: 'running', muscleGroup: 'cardio', distance: 5000, distanceUnit: 'm', notes: 'Easy pace' },
  ] as Record<string, unknown>[],
  muscleGroups: ['chest', 'cardio'],
  notes: 'Left knee sore',
});

test('a correct parse scores 1, with distances compared across units', () => {
  assert.equal(scoreCase(c, right()).score, 1);
});

test('wrong values, extra exercises and stray notes cost points', () => {
  const wrongWeight = right();
  wrongWeight.exercises[0].weight = 205;
  assert.ok(scoreCase(c, wrongWeight).score < 1);

  const extra = right();
  extra.exercises.push({ name: 'Squats', muscleGroup: 'quads', sets: 3 });
  assert.ok(scoreCase(c, extra).score < 1);

  assert.ok(scoreCase({ ...c, notes: undefined }, right()).score < 1);
  assert.equal(scoreCase(c, null).score, 0);
});

test('non-workouts pass only with no exercises', () => {
  const none: Case = { id: 'n', category: 'n', input: '', exercises: [] };
  assert.equal(scoreCase(none, { exercises: [], muscleGroups: [] }).score, 1);
  assert.equal(scoreCase(none, right()).score, 0);
});
