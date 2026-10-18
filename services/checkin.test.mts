/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIn, type CheckInInput } from './checkin';
import { digest } from './insights';
import { emptyLibrary } from './exerciseIdentity';
import { USERS, NOW } from './insights.fixtures';
import type { Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

const library = emptyLibrary();
const input = (workouts: Workout[], more: Partial<CheckInInput> = {}): CheckInInput => ({
  workouts,
  digest: digest(workouts, library, 'lbs', NOW),
  schedule: [],
  templates: [],
  library,
  ...more,
});
const of = (name: keyof typeof USERS, more?: Partial<CheckInInput>) => checkIn(input(USERS[name], more), NOW)!;
// Every number a card says, to check none is made up
const numbers = (c: object) => JSON.stringify(c).match(/\d+/g) ?? [];

test('nothing logged, or nothing in the last 7 days: no card', () => {
  assert.equal(checkIn(input([]), NOW), null);
  const old = USERS.jordan.filter(w => w.date < '2026-09-20');
  assert.equal(checkIn(input(old), NOW), null);
});

test('names only (Jordan): what was trained, days against the usual, no lifts or numbers of its own', () => {
  const c = of('jordan');
  assert.equal(c.headline, 'Upper body and Pull'); // Oct 3 chest and back, Oct 5 bench and rows, Oct 7 pull-ups and curls
  assert.equal(c.days, '3 training days in the last 7 · your usual 4');
  assert.equal(c.watch, 'Quads: 20 days since you trained it');
  assert.deepEqual(c.wins, ['Trained every week for 6 weeks']);
  assert.deepEqual(c.next, []);
  assert.doesNotMatch(JSON.stringify(c), / lb|kg|best/);
});

test('comeback (Maya): the headline says welcome back, the usual is from before the break', () => {
  const c = of('maya');
  assert.equal(c.headline, 'Back after 22 days off');
  assert.equal(c.days, '1 training day in the last 7 · your usual 2');
  assert.deepEqual(c.wins, []);
});

test('full detail (Sam): a PR leads, the 3 latest others are wins, nothing repeated', () => {
  const c = of('sam');
  assert.equal(c.headline, 'New best: Bench Press 145 lb × 8');
  assert.equal(c.days, '4 training days in the last 7 · your usual 4');
  assert.deepEqual(c.wins, [
    'Seated Cable Row 110 lb × 10, your best',
    'Overhead Press 95 lb × 8, your best',
    'Lat Pulldown 115 lb × 10, your best',
    'Trained every week for 6 weeks',
  ]);
  // Every number is from the log or the digest built from it
  const said = new Set(numbers({ log: USERS.sam, d: input(USERS.sam).digest }));
  assert.deepEqual(numbers(c).filter(n => !said.has(n)), []);
});

test('watch: a stuck lift with its next number when no muscle is left behind, then a missed food goal', () => {
  const d = digest(USERS.sam, library, 'lbs', NOW);
  const c = checkIn(input(USERS.sam, { digest: { ...d, staleGroups: [] } }), NOW)!;
  assert.match(c.watch!, /^Squat at 185x5 ×3 for \d sessions · next \d+x\d+/);

  const food = { goal: { kind: 'protein' as const, target: 160 }, hit: 1, logged: 5, met: false };
  const goals = { muscles: [], custom: [], food, timesMet: 0, setsMet: 0 };
  const jordan = digest(USERS.jordan, library, 'lbs', NOW);
  const missed = checkIn(input(USERS.jordan, { digest: { ...jordan, staleGroups: [] }, goals }), NOW)!;
  assert.equal(missed.watch, 'Protein goal met on 1 of 5 days with food logged');
  // Met on most days is no signal; met on every day is a win
  assert.equal(checkIn(input(USERS.jordan, { digest: { ...jordan, staleGroups: [] }, goals: { ...goals, food: { ...food, hit: 3 } } }), NOW)!.watch, undefined);
  const all = checkIn(input(USERS.jordan, { goals: { ...goals, food: { ...food, hit: 5, met: true } } }), NOW)!;
  assert.ok(all.wins.includes('Protein goal met on all 5 days with food logged'));
});

test('a first workout: no usual yet, nothing to watch, no wins', () => {
  const c = checkIn(input(USERS.jordan.filter(w => w.date === '2026-10-07')), NOW)!;
  assert.equal(c.days, '1 training day in the last 7');
  assert.equal(c.watch, undefined);
  assert.deepEqual(c.wins, []);
});

test('next 7 days: planned days not yet done, with the next number for the first lift', () => {
  const lower: WorkoutTemplate = {
    id: 't1', name: 'Lower B', muscleGroups: ['quads'], createdAt: '', usageCount: 0,
    exercises: [{ name: 'Walk', muscleGroup: 'cardio', sets: 1, reps: 1 }, { exerciseId: 'squat', name: 'Squat', muscleGroup: 'quads', sets: 3, reps: 5 }],
  };
  const upper: WorkoutTemplate = { ...lower, id: 't2', name: 'Upper', exercises: [{ name: 'Pull-ups', muscleGroup: 'back', sets: 3, reps: 8 }] };
  const at = (date: string, templateId: string, more: Partial<TemplateSchedule> = {}): TemplateSchedule => ({ id: date, date, templateId, isRecurring: false, completed: false, ...more });
  const schedule = [
    at('2026-10-07', 't2'), // yesterday
    at('2026-10-12', 't2'),
    at('2026-10-09', 't1'),
    at('2026-10-08', 't2'),
    at('2026-10-10', 't2', { skipped: true }),
    at('2026-10-11', 'gone'), // its template was deleted
    at('2026-10-15', 't2'), // 7 days out
  ];
  const c = of('sam', { schedule, templates: [lower, upper] });
  assert.equal(c.next.length, 3);
  assert.equal(c.next[0], 'Today · Upper');
  assert.match(c.next[1], /^Tomorrow · Lower B · Squat next \d+x\d+/);
  assert.equal(c.next[2], 'Monday · Upper');
  // Names-only: no lift numbers to give
  assert.deepEqual(of('jordan', { schedule, templates: [lower, upper] }).next, ['Today · Upper', 'Tomorrow · Lower B', 'Monday · Upper']);
});
