/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseNumbers, workoutSummary, draftToText, formatDuration, lastDoneLine } from './format';

const bench = { name: 'Bench Press', muscleGroup: 'chest' as const, sets: 3, reps: 8, weight: 135, unit: 'lbs' as const };
const run = { name: 'Run', muscleGroup: 'cardio' as const, duration: 25, distance: 5, distanceUnit: 'km' as const };

test('exerciseNumbers covers strength, partial and cardio', () => {
  assert.equal(exerciseNumbers(bench), '3 × 8 · 135 lb');
  assert.equal(exerciseNumbers({ ...bench, unit: 'kg' }), '3 × 8 · 135 kg');
  assert.equal(exerciseNumbers({ name: 'Plank', muscleGroup: 'core', sets: 3 }), '3 sets');
  assert.equal(exerciseNumbers({ name: 'Push-ups', muscleGroup: 'chest', reps: 20 }), '20 reps');
  assert.equal(exerciseNumbers(run), '25 min · 5 km');
  assert.equal(exerciseNumbers({ name: 'Walk', muscleGroup: 'cardio' }), '');
});

test('formatDuration shows seconds under a minute', () => {
  assert.equal(formatDuration(0.5), '30 s');
  assert.equal(formatDuration(6.5), '6.5 min');
});

test('workoutSummary counts sets and volume', () => {
  assert.equal(workoutSummary([bench, { ...bench, name: 'Row', sets: 3, reps: 10, weight: 100 }]), '2 exercises · 6 sets · 6,240 lb');
  assert.equal(workoutSummary([run]), '1 exercise');
});

test('draftToText writes a draft back as a plain log', () => {
  assert.equal(
    draftToText([{ ...bench, notes: 'felt easy' }, run], 'Good day'),
    'Bench Press 3x8, 135 lb (felt easy)\nRun 25 min, 5 km\nNotes: Good day'
  );
});

test('lastDoneLine reads well for any recency, and leaves out an empty count', () => {
  assert.equal(lastDoneLine({ lastDoneDaysAgo: 0, timesLast28Days: 1 }), 'last done today · 1× in 4 wks');
  assert.equal(lastDoneLine({ lastDoneDaysAgo: 1, timesLast28Days: 4 }), 'last done yesterday · 4× in 4 wks');
  assert.equal(lastDoneLine({ lastDoneDaysAgo: 40, timesLast28Days: 0 }), 'last done 40 days ago');
});
