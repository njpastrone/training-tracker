/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDraft, removeFromDraft, flagGuesses } from './draft';

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

const parsed = (exercises: typeof draft.exercises, unsure?: typeof draft.unsure) => ({ exercises, muscleGroups: [], confidence: 0.9, unsure });

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
    { name: 'Pull-ups', muscleGroup: 'back', sets: 3, reps: 10 },
  ]);
  assert.deepEqual(flagGuesses(p, 'squat 2 plates for 5, chins 3x10').unsure, [
    { exercise: 0, field: 'name' }, // dayOffset with no day in the log
    { exercise: 0, field: 'sets' }, // 1 set inferred
    { exercise: 0, field: 'weight' }, // 225 from "2 plates", unit assumed
    { exercise: 1, field: 'name' }, // "chins" matched to Pull-ups
    { exercise: 1, field: 'weight' }, // missing weight on a lift
  ]);
});

test('missing reps are flagged and model flags are kept once', () => {
  const p = parsed([{ name: 'Deadlift', muscleGroup: 'back', weight: 405, unit: 'lbs' }], [{ exercise: 0, field: 'weight' }]);
  assert.deepEqual(flagGuesses(p, 'yesterday deadlift 405 lbs').unsure, [{ exercise: 0, field: 'weight' }, { exercise: 0, field: 'reps' }]);
});

test('comma-separated numbers count as typed values', () => {
  const p = parsed([
    { name: 'Bench Press', muscleGroup: 'chest', sets: 1, reps: 10, weight: 135, unit: 'lbs' },
    { name: 'Bench Press', muscleGroup: 'chest', sets: 1, reps: 8, weight: 135, unit: 'lbs' },
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 10, weight: 2.5, unit: 'kg' },
  ]);
  assert.deepEqual(flagGuesses(p, 'bench 1 set each 135 lbs 10,8 then 3x8,3x10 at 2,5 kg').unsure, []);
});
