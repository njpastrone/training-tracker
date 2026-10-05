/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDraft, removeFromDraft, flagGuesses, keepIdentity } from './draft';
import type { ParsedWorkoutResponse } from '../types/workout';

const draft = {
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest' as const, sets: 3, reps: 8 },
    { name: 'Lat Pulldown', muscleGroup: 'back' as const, sets: 3, reps: 10, weight: 100 },
    { name: 'Tricep Pushdown', muscleGroup: 'triceps' as const, sets: 2, reps: 12 },
  ],
  muscleGroups: ['chest' as const, 'back' as const, 'triceps' as const],
  confidence: 0.7,
  unsure: [
    { exercise: 1, field: 'weight' as const },
    { exercise: 1, field: 'reps' as const },
    { exercise: 2, field: 'sets' as const },
  ],
};

test('editing a value updates it and clears only its flag', () => {
  const next = editDraft(draft, 1, 'weight', 120);
  assert.equal(next.exercises[1].weight, 120);
  assert.deepEqual(next.unsure, [{ exercise: 1, field: 'reps' }, { exercise: 2, field: 'sets' }]);
  assert.equal(draft.exercises[1].weight, 100); // no mutation
});

test('removing an exercise drops its flags and renumbers later ones', () => {
  const next = removeFromDraft(draft, 1);
  assert.deepEqual(next.exercises.map(e => e.name), ['Bench Press', 'Tricep Pushdown']);
  assert.deepEqual(next.unsure, [{ exercise: 1, field: 'sets' }]);
});

test('a draft without flags stays without flags', () => {
  const { unsure, ...plain } = draft;
  assert.deepEqual(editDraft(plain, 0, 'sets', 4).unsure, []);
  assert.deepEqual(removeFromDraft(plain, 0).unsure, []);
});

const parsed = (exercises: ParsedWorkoutResponse['exercises'], unsure?: ParsedWorkoutResponse['unsure']) => ({ exercises, muscleGroups: [], confidence: 0.9, unsure });

test('a fully stated log gets no flags', () => {
  const p = parsed([
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135, unit: 'lbs' },
    { name: 'Running', muscleGroup: 'cardio', duration: 20, distance: 5, distanceUnit: 'km' } as never,
  ]);
  assert.deepEqual(flagGuesses(p, 'bench 3x8 at 135 lbs, then 5k run in 20 min').unsure, []);
});

test('guessed numbers, units, days and names are flagged', () => {
  const p = parsed([
    { name: 'Squat', muscleGroup: 'quads', sets: 1, reps: 5, weight: 225, unit: 'lbs', dayOffset: -1 },
    { name: 'Kettlebell Swings', muscleGroup: 'glutes', sets: 3, reps: 10 },
    { name: 'Barbell Row', muscleGroup: 'back', sets: 3, reps: 12, weight: 100, unit: 'lbs' },
  ]);
  assert.deepEqual(flagGuesses(p, 'squat 2 plates for 5, swung the bell 3x10, rows same as last time').unsure, [
    { exercise: 0, field: 'name' }, // dayOffset with no day in the log
    { exercise: 0, field: 'weight' }, // 225 from "2 plates", unit assumed
    { exercise: 1, field: 'name' }, // "swung the bell" read as Kettlebell Swings
    { exercise: 2, field: 'name' }, // "rows" alone doesn't say which row
    { exercise: 2, field: 'reps' }, // copied from another exercise
    { exercise: 2, field: 'weight' },
  ]);
});

test('missing detail is never flagged: a name-only log saves cleanly', () => {
  const p = parsed([
    { name: 'Bench Press', muscleGroup: 'chest' },
    { name: 'Barbell Row', muscleGroup: 'back' },
    { name: 'Pull-ups', muscleGroup: 'back', sets: 3 },
    { name: 'Running', muscleGroup: 'cardio', distance: 3, distanceUnit: 'mi' },
    { name: 'Plank', muscleGroup: 'core', sets: 1, duration: 1 },
  ]);
  assert.deepEqual(flagGuesses(p, 'chest and back today: bench, barbell rows, 3 sets of pull-ups. ran 3 miles then plank for 60s').unsure, []);
});

test('model flags are kept once and missing reps are not added', () => {
  const p = parsed([{ name: 'Deadlift', muscleGroup: 'back', weight: 405, unit: 'lbs' }], [{ exercise: 0, field: 'weight' }]);
  assert.deepEqual(flagGuesses(p, 'yesterday deadlift 405 lbs').unsure, [{ exercise: 0, field: 'weight' }]);
});

test('comma-separated numbers count as typed values', () => {
  const p = parsed([
    { name: 'Bench Press', muscleGroup: 'chest', sets: 1, reps: 10, weight: 135, unit: 'lbs' },
    { name: 'Bench Press', muscleGroup: 'chest', sets: 1, reps: 8, weight: 135, unit: 'lbs' },
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 10, weight: 2.5, unit: 'kg' },
  ]);
  assert.deepEqual(flagGuesses(p, 'bench 1 set each 135 lbs 10,8 then 3x8,3x10 at 2,5 kg').unsure, []);
});

test('a misread exercise is flagged even when it shares a generic word with the log', () => {
  const cases: [string, ParsedWorkoutResponse['exercises'][number]][] = [
    ['lat pulldowns 3x10', { name: 'Pull-ups', muscleGroup: 'back', sets: 3, reps: 10 }],
    ['incline press 3x8', { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 3, reps: 8 }],
    ['dumbbell curls 3x12', { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', sets: 3, reps: 12 }],
    ['med ball throw then grow', { name: 'Barbell Row', muscleGroup: 'back' }],
  ];
  for (const [log, exercise] of cases) assert.deepEqual(flagGuesses(parsed([exercise]), log).unsure, [{ exercise: 0, field: 'name' }], log);
});

test("an apostrophe in a named exercise doesn't break the match", () => {
  const p = parsed([{ name: 'Farmers Walk', muscleGroup: 'forearms', sets: 3 }]);
  assert.deepEqual(flagGuesses(p, "farmer's walk 3 sets").unsure, []);
});

test('renaming an exercise drops its identity so it is resolved again on save', () => {
  const picked = parsed([{ name: 'Bench Press', muscleGroup: 'chest', exerciseId: 'bench-press', match: 'sure' }]);
  const renamed = editDraft(picked, 0, 'name', 'Incline Bench Press').exercises[0];
  assert.equal(renamed.name, 'Incline Bench Press');
  assert.equal(renamed.exerciseId, undefined);
  assert.equal(renamed.match, undefined);
  assert.equal(editDraft(picked, 0, 'sets', 4).exercises[0].exerciseId, 'bench-press');
});

test('a typed fix keeps the identity of exercises it did not rename', () => {
  const before = parsed([
    { name: 'Chin-Up', muscleGroup: 'back', sets: 3, exerciseId: 'chin-up', match: 'sure', said: 'chin ups' },
    { name: 'Bench Press', muscleGroup: 'chest', exerciseId: 'bench-press', match: 'sure' },
  ]);
  const after = parsed([
    { name: 'Pull-ups', muscleGroup: 'back', sets: 4 }, // the list name snapped back by the parser
    { name: 'Incline Bench Press', muscleGroup: 'chest' },
  ]);
  const [kept, renamed] = keepIdentity(before, after).exercises;
  assert.deepEqual(kept, { name: 'Chin-Up', muscleGroup: 'back', sets: 4, exerciseId: 'chin-up', match: 'sure', said: 'chin ups' });
  assert.deepEqual(renamed, { name: 'Incline Bench Press', muscleGroup: 'chest' });
});

test('body-part entries from a low-detail log are not flagged', () => {
  const p = parsed([
    { name: 'Leg Workout', muscleGroup: 'quads' },
    { name: 'Core Workout', muscleGroup: 'core' },
  ]);
  assert.deepEqual(flagGuesses(p, 'leg day and some abs').unsure, []);
});

test('spelled-out numbers count as typed values', () => {
  const p = parsed([
    { name: 'Bench Press', muscleGroup: 'chest', sets: 4, reps: 12 },
    { name: 'Squat', muscleGroup: 'quads', sets: 1, reps: 2, weight: 315, unit: 'lbs' },
  ]);
  assert.deepEqual(flagGuesses(p, 'bench four sets of twelve, squat 315 lbs for a double').unsure, []);
});
