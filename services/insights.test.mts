/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digest, target, NAG, unknownExercises, inventedNumbers } from './insights';
import { emptyLibrary } from './exerciseIdentity';
import { USERS, NOW } from './insights.fixtures';
import type { Exercise, Workout } from '../types/workout';

const lib = emptyLibrary();
const of = (name: keyof typeof USERS) => digest(USERS[name], lib, 'lbs', NOW);
const ex = (d: ReturnType<typeof of>, id: string) => d.exercises.find((e) => e.id === id)!;

test('names only (Jordan): every exercise has last done and how often, nothing needs numbers', () => {
  const d = of('jordan');
  assert.equal(d.loggingStyle, 'names only');
  assert.deepEqual(d.liftTrends, []);
  assert.equal(d.sessionsLast7, 3);
  assert.equal(d.usualPerWeek, 4);
  assert.equal(d.comeback, null);
  assert.deepEqual(d.weeklySessionsLast8, [0, 0, 2, 4, 3, 4, 4, 3]); // started Aug 31
  assert.deepEqual(ex(d, 'bench-press'), { id: 'bench-press', name: 'Bench Press', lastDate: '2026-10-05', lastDoneDaysAgo: 3, timesLast28Days: 4, withNumbers: false });
  // Legs dropped off: 20 days since, once in the last 4 weeks
  assert.equal(ex(d, 'leg-workout').lastDoneDaysAgo, 20);
  assert.equal(ex(d, 'leg-workout').timesLast28Days, 1);
  assert.equal(d.daysSinceGroupTrained.quads, 20);
  assert.equal(d.daysSinceGroupTrained.back, 1);
  // Most frequent first
  assert.equal(d.exercises[0].timesLast28Days >= d.exercises.at(-1)!.timesLast28Days, true);
});

test('mixed (Maya): back after 22 days off, her usual is the 4 weeks before the break', () => {
  const d = of('maya');
  assert.equal(d.loggingStyle, 'mixed');
  assert.deepEqual(d.comeback, { from: '2026-09-14', to: '2026-10-06', days: 22 });
  assert.equal(d.usualPerWeek, 2);
  assert.equal(d.sessionsLast7, 1);
  assert.equal(d.daysSinceLastWorkout, 2);
  assert.equal(ex(d, 'cycling').withNumbers, true);
  assert.equal(ex(d, 'upper-body-workout').withNumbers, false);
});

test('full detail (Sam): trends, PRs and stalls per lift', () => {
  const d = of('sam');
  assert.equal(d.loggingStyle, 'full detail');
  assert.equal(d.sessionsLast7, 4);
  assert.equal(d.usualPerWeek, 4);
  const lift = (id: string) => d.liftTrends.find((t) => t.id === id)!;
  assert.equal(lift('squat').sessionsAtSameTopSet, 4);
  assert.equal(lift('squat').trend, 'flat');
  assert.equal(lift('squat').isAllTimeBest, false);
  assert.equal(lift('bench-press').isAllTimeBest, true);
  assert.equal(lift('bench-press').trend, 'up');
  assert.equal(lift('deadlift').isAllTimeBest, true);
  assert.equal(lift('bench-press').recent.length, 5);
  assert.equal(lift('bench-press').recent[0].note, 'felt easy');
  // Leg press has numbers only once: no trend
  assert.equal(d.liftTrends.some((t) => t.id === 'leg-press'), false);
  assert.equal(d.daysSinceGroupTrained.hamstrings, 20);
  assert.deepEqual(d.runs[0], { date: '2026-10-03', distance: 5, distanceUnit: 'km', minutes: 26.9 });
});

test('targets come from code: double progression, braked by "felt heavy"', () => {
  const d = of('sam');
  const t = Object.fromEntries(d.liftTrends.map(target).map((x) => [x.id, x.next]));
  assert.equal(t['squat'], '165x7 ×3'); // stuck 4 sessions and heavy: reset
  assert.equal(t['bench-press'], '150x8 ×3'); // felt easy
  assert.equal(t['barbell-row'], '150x8 ×3'); // held twice
  assert.equal(t['deadlift'], '285x3'); // lower body steps 10, one set
  assert.equal(t['incline-dumbbell-press'], '55x11–12 ×3'); // dumbbells add reps first
  assert.equal(t['lateral-raise'], '25x11 ×3'); // top of the range: up a step, reps reset
  assert.equal(of('jordan').liftTrends.map(target).length, 0);
});

const workout = (date: string, ...exercises: Partial<Exercise>[]): Workout => ({
  id: date, date, rawInput: '', muscleGroups: ['chest'], createdAt: 't',
  exercises: exercises.map((e, i) => ({ id: `${date}-${i}`, name: 'Bench Press', exerciseId: 'bench-press', muscleGroup: 'chest', ...e })),
});

test('merges, unsure entries, units and future dates', () => {
  const ws = [
    workout('2026-10-09', { weight: 200, reps: 5 }), // tomorrow: ignored
    workout('2026-10-07', { weight: 100, reps: 5, unit: 'kg' }),
    workout('2026-10-06', { weight: 90, reps: 5, unit: 'kg', match: 'unsure' }),
    workout('2026-10-05', { weight: 185, reps: 5, unit: 'lbs' }),
    workout('2026-10-03', { weight: 95, reps: 5, unit: 'kg', exerciseId: 'custom-old', name: 'Flat bench' }),
  ];
  const d = digest(ws, { ...emptyLibrary(), merged: { 'custom-old': 'bench-press' } }, 'lbs', NOW);
  assert.deepEqual(d.exercises.map((e) => [e.id, e.timesLast28Days, e.lastDate]), [['bench-press', 4, '2026-10-07']]);
  const [t] = d.liftTrends;
  assert.deepEqual(t.recent.map((s) => s.weight), [100, 95]); // the unsure 90 and the lbs set don't compare
  assert.equal(t.isAllTimeBest, true);
  assert.equal(target(t).next, '102.5kgx5'); // kg steps are 2.5; unknown sets stay unknown
  assert.equal(target({ ...t, recent: [{ ...t.recent[0], reps: undefined }] }).next, '102.5kg'); // and unknown reps
  assert.equal(d.usualPerWeek, null); // nothing before the last 7 days
});

test('code checks: nagging, unknown exercises, invented numbers', () => {
  assert.match('Log your weights so we can track progress', NAG);
  assert.match('Add more detail next time', NAG);
  assert.doesNotMatch('Three solid weeks will keep you on track', NAG);
  assert.doesNotMatch('Legs have gone quiet: last leg day was 20 days ago', NAG);

  const d = of('maya');
  assert.deepEqual(unknownExercises(['Goblet Squats', 'push-ups', 'Romanian Deadlift', 'Leg Press'], d), ['Romanian Deadlift', 'Leg Press']);

  const s = of('sam');
  const given = { d: s, targets: s.liftTrends.map(target) };
  assert.deepEqual(inventedNumbers('Bench 150x8 x3 after 145 felt easy; squat 165x7', given), []);
  assert.deepEqual(inventedNumbers('Back to normal in about 10 days, aim for 157 next week', given), ['157']);
  // 65 and 75 are only substrings of 165 and 275
  assert.deepEqual(inventedNumbers('Aim for 65, then add 75', given), ['65', '75']);
});

test('warm-up sets on one day count as one session at the top set', () => {
  const ws = [
    workout('2026-10-07', { weight: 135, reps: 10 }, { weight: 155, reps: 8 }, { weight: 175, reps: 5, notes: 'felt easy' }),
    workout('2026-10-05', { weight: 170, reps: 5 }, { weight: 170, reps: 5 }),
    workout('2026-10-02', { weight: 165, reps: 5 }),
  ];
  const [t] = digest(ws, lib, 'lbs', NOW).liftTrends;
  assert.deepEqual(t.recent.map((s) => [s.date, s.weight, s.reps]), [['2026-10-07', 175, 5], ['2026-10-05', 170, 5], ['2026-10-02', 165, 5]]);
  assert.equal(t.isAllTimeBest, true);
  assert.equal(t.sessionsAtSameTopSet, 1);
  assert.equal(target(t).next, '180x5');
});
