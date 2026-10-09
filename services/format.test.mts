/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseNumbers, workoutSummary, draftToText, formatDuration, lastDoneLine, emptyDay, weekLine, paceLine, cardTargets } from './format';

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

test('emptyDay offers Plan today and ahead, logging today and before', () => {
  const today = '2026-10-06';
  assert.deepEqual(emptyDay(today, today, false, false), { title: 'Nothing planned', plan: true, log: true });
  assert.deepEqual(emptyDay('2026-10-07', today, false, false), { title: 'Nothing planned', plan: true, log: false });
  assert.deepEqual(emptyDay('2026-10-05', today, false, false), { title: 'No workouts on this day', plan: false, log: true });
  assert.equal(emptyDay(today, today, false, true), undefined);
  assert.equal(emptyDay('2026-10-07', today, false, true), undefined);
  assert.equal(emptyDay('2026-10-05', today, true, false), undefined);
});

test('weekLine and paceLine always say something', () => {
  assert.equal(weekLine(5, 4), 'Last 7: 5 logged · Next 7: 4 planned');
  assert.equal(weekLine(2, 0), 'Last 7: 2 logged');
  assert.equal(weekLine(0, 3), 'Next 7: 3 planned');
  assert.equal(weekLine(0, 0), 'Nothing logged in the last 7');
  assert.equal(paceLine(2, 3), '2 of 3 training days in the last 7');
  assert.equal(paceLine(0, 3), 'No training days in the last 7');
  assert.equal(paceLine(3, 3), '3 training days in the last 7 · goal met');
  assert.equal(paceLine(3, 2), '3 training days in the last 7 · goal met');
  assert.equal(paceLine(1, 0), '1 training day in the last 7 · goal met');
});

test("a day card's body opens its workout and its food line opens the day", () => {
  assert.deepEqual(cardTargets({ id: 'w1', date: '2026-10-08' }), { body: '/workout/w1', food: '/day/2026-10-08' });
});
