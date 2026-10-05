/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entriesFor, metricFor, personalRecords } from './progress';
import { emptyLibrary } from './exerciseIdentity';
import type { Exercise, Workout } from '../types/workout';

const workout = (id: string, date: string, ...exercises: Partial<Exercise>[]): Workout => ({
  id, date, rawInput: '', muscleGroups: [], createdAt: 't',
  exercises: exercises.map((e, i) => ({ id: `${id}-${i}`, name: 'x', muscleGroup: 'chest', ...e })),
});

const workouts = [
  workout('w1', '2026-10-01', { exerciseId: 'bench-press', weight: 100, unit: 'kg', reps: 3 }),
  workout('w2', '2026-10-03', { exerciseId: 'bench-press', weight: 225, unit: 'lbs', reps: 5 }, { exerciseId: 'incline-bench-press', weight: 300, unit: 'lbs', reps: 1 }),
  workout('w3', '2026-10-04', { exerciseId: 'bench-press', weight: 315, unit: 'lbs', reps: 1, match: 'unsure' }),
  workout('w4', '2026-09-20', { exerciseId: 'custom-old', weight: 185, unit: 'lbs', reps: 10 }),
];

test('entries are keyed on id, follow merges, and come newest first', () => {
  const lib = { ...emptyLibrary(), merged: { 'custom-old': 'bench-press' } };
  assert.deepEqual(entriesFor(workouts, 'bench-press', lib).map((e) => e.workoutId), ['w3', 'w2', 'w1', 'w4']);
  assert.deepEqual(entriesFor(workouts, 'bench-press', emptyLibrary()).map((e) => e.workoutId), ['w3', 'w2', 'w1']);
});

test('weight PRs compare across units, keep stored numbers, and skip unsure entries', () => {
  const prs = personalRecords(entriesFor(workouts, 'bench-press', emptyLibrary()), 'weight-reps', 'lbs');
  assert.equal(prs.heaviest!.workoutId, 'w2'); // 225 lbs beats 100 kg (220 lbs); 315 is unsure
  assert.equal(prs.heaviest!.exercise.weight, 225);
  assert.equal(prs.bestE1rm!.entry.workoutId, 'w2'); // 225 × (1 + 5/30) = 262.5
  assert.equal(prs.bestE1rm!.value, 262.5);
  assert.deepEqual(Object.keys(prs.repsAtWeight!).sort(), ['100 kg', '225 lbs']);
});

test('pace records go to the largest distance band each run covers', () => {
  const runs = [
    workout('r1', '2026-10-01', { exerciseId: 'running', distance: 5, distanceUnit: 'km', duration: 25 }),
    workout('r2', '2026-10-02', { exerciseId: 'running', distance: 5.2, distanceUnit: 'km', duration: 24 }),
    workout('r3', '2026-10-03', { exerciseId: 'running', distance: 10, distanceUnit: 'km', duration: 55 }),
  ];
  const prs = personalRecords(entriesFor(runs, 'running', emptyLibrary()), metricFor('running', emptyLibrary()), 'lbs');
  assert.equal(prs.longestDistance!.workoutId, 'r3');
  assert.equal(prs.fastestPace![5000].entry.workoutId, 'r2');
  assert.equal(prs.fastestPace![10000].entry.workoutId, 'r3');
});

test('sessions have no records', () => {
  assert.deepEqual(personalRecords([], metricFor('basketball', emptyLibrary()), 'lbs'), {});
});
