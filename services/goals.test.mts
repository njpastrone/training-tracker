/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, formatSets, goalLines } from './goals';
import { emptyLibrary } from './exerciseIdentity';
import { catalogById } from '../data/catalog';
import type { Exercise, Goals, MuscleGroup, Workout } from '../types/workout';

// Tue Oct 6, midday: the last 7 days are Wed Sep 30 – Tue Oct 6
const NOW = new Date(2026, 9, 6, 12);
const lib = emptyLibrary();

type Ex = [id: string, sets?: number, weight?: number, unit?: 'lbs' | 'kg'];
const w = (date: string, ...exs: Ex[]): Workout => {
  const exercises: Exercise[] = exs.map(([id, sets, weight, unit], i) => ({
    id: `${date}-${i}`, exerciseId: id, name: catalogById.get(id)!.name, muscleGroup: catalogById.get(id)!.primary,
    sets, reps: weight ? 5 : undefined, weight, unit: weight ? unit ?? 'lbs' : undefined,
  }));
  return { id: date, date, rawInput: '', exercises, muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))] as MuscleGroup[], createdAt: date };
};

const WORKOUTS = [
  w('2026-09-28', ['bench-press', 5, 205]), // a day before the window
  w('2026-09-30', ['bench-press', 4, 100, 'kg'], ['lateral-raise', 3], ['tricep-pushdown', 3]),
  w('2026-10-01', ['pull-up', 4], ['dumbbell-curl', 3]),
  w('2026-10-02', ['running']),
  w('2026-10-03', ['squat', 4], ['romanian-deadlift', 3]),
  w('2026-10-04', ['running']),
  w('2026-10-05', ['bench-press', 4], ['barbell-row']), // rows with no set count
];

const GOALS: Goals = {
  muscles: ['chest', 'back', 'biceps', 'triceps', 'quads'],
  timesPerWeek: 2,
  minSets: { back: 10 },
  custom: [
    { id: 'g1', kind: 'lift', exerciseId: 'bench-press', weight: 225, unit: 'lbs' },
    { id: 'g2', kind: 'often', exerciseId: 'running', perWeek: 3 },
  ],
};

test('each muscle: days trained as a main muscle and written sets (main 1, helper ½), last 7 days only', () => {
  const p = goalProgress(GOALS, WORKOUTS, lib, NOW);
  const by = Object.fromEntries(p.muscles.map(m => [m.group, m]));
  // Chest: Sep 30 and Oct 5 (Sep 28 is outside the window), 4 + 4 sets
  assert.deepEqual(by.chest, { group: 'chest', times: 2, timesGoal: 2, sets: 8, setsGoal: 8, setsMissing: false, met: true });
  // Back: pull-ups 4 + ½ of 3 RDL sets; the rows had no set count, so 5½ is a floor
  assert.deepEqual(by.back, { group: 'back', times: 2, timesGoal: 2, sets: 5.5, setsGoal: 10, setsMissing: true, met: false });
  // Biceps get ½ of pull-ups, and the rows' missing count makes theirs a floor too
  assert.equal(by.biceps.sets, 3 + 2);
  assert.equal(by.biceps.setsMissing, true);
  assert.equal(by.biceps.times, 1); // a helper muscle never counts as a day trained
  assert.equal(by.triceps.sets, 3 + 2 + 2);
  assert.equal(by.quads.times, 1);
  assert.equal(p.timesMet, 2);
  assert.equal(p.setsMet, 1);
});

test('your own goals: best lift ever in the goal unit, and days done in the last 7', () => {
  const [lift, often] = goalProgress(GOALS, WORKOUTS, lib, NOW).custom;
  // 100 kg (Sep 30) beats 205 lbs (Sep 28)
  assert.deepEqual({ name: lift.name, now: lift.now, target: lift.target, met: lift.met }, { name: 'Bench Press', now: 220.5, target: 225, met: false });
  assert.deepEqual({ name: often.name, now: often.now, target: often.target, met: often.met }, { name: 'Running', now: 2, target: 3, met: false });
  const reached = goalProgress({ ...GOALS, custom: [{ id: 'g', kind: 'lift', exerciseId: 'bench-press', weight: 100, unit: 'kg' }] }, WORKOUTS, lib, NOW).custom[0];
  assert.equal(reached.met, true);
});

test('only the goals that are on are checked', () => {
  const timesOnly = goalProgress({ ...GOALS, minSets: undefined }, WORKOUTS, lib, NOW).muscles.find(m => m.group === 'back')!;
  assert.equal(timesOnly.setsGoal, undefined);
  assert.equal(timesOnly.met, true);
  assert.deepEqual(goalProgress({ muscles: ['chest'], custom: [] }, WORKOUTS, lib, NOW).muscles, []);
});

test('sets read as written: halves and a floor when some had no count', () => {
  assert.equal(formatSets(8, false), '8');
  assert.equal(formatSets(5.5, true), '5½+');
  assert.equal(formatSets(0, true), '0+');
  assert.equal(formatSets(0.5, false), '½');
});

test('goals as plain lines for the planner', () => {
  assert.deepEqual(goalLines(GOALS, lib), [
    'Each of chest, back, biceps, triceps, quads on at least 2 days a week',
    'At least these sets a week: chest 8, back 10, biceps 8, triceps 8, quads 8',
    'Bench Press: reach 225 lbs',
    'Running on 3 days a week',
  ]);
  assert.deepEqual(goalLines({ muscles: [], custom: [] }, lib), []);
});
