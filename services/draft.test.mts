/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDraft, removeFromDraft } from './draft';

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
