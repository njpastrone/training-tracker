/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logChips, planChips, missedChips, PLAN_STARTERS } from './suggestions';
import type { MuscleGroup, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// Thursday, October 8 2026
const now = new Date(2026, 9, 8, 9);
const workout = (date: string, groups: MuscleGroup[], names: string[]): Workout => ({
  id: date + names.join(),
  date,
  rawInput: '',
  createdAt: date,
  muscleGroups: groups,
  exercises: names.map((name, i) => ({ id: `${i}`, name, muscleGroup: groups[0] ?? 'cardio' })),
});
const push = workout('2026-10-05', ['chest', 'shoulders', 'biceps', 'triceps'], ['Bench Press', 'Lateral Raise', 'Curl', 'Pushdown']);
const back = workout('2026-10-06', ['back'], ['Seated Cable Row', 'Lat Pulldown']);
const backAgain = workout('2026-10-01', ['back'], ['Barbell Row']);
const legs = workout('2026-09-20', ['quads', 'glutes'], ['Squat', 'Lunge']);

test('logChips gives a new user whole examples', () => {
  assert.deepEqual(logChips([push, back], null, now).map(c => c.label), ['Chest and back: bench, rows', 'Ran 3 miles', 'Legs: squats, lunges']);
});

test('logChips offers the two most recent different workouts, skipping today', () => {
  const today = workout('2026-10-08', ['core'], ['Plank']);
  const chips = logChips([today, back, push, backAgain, legs], null, now);
  assert.deepEqual(chips, [
    { label: 'Like Tuesday · back', text: 'Seated Cable Row, Lat Pulldown' },
    { label: 'Like Monday · chest, shoulders, biceps +1', text: 'Bench Press, Lateral Raise, Curl, Pushdown' },
  ]);
});

test('logChips says yesterday and dates past a week, and ignores anything older than 4 weeks', () => {
  const yesterday = workout('2026-10-07', ['back'], ['Row']);
  const old = workout('2026-08-01', ['calves'], ['Calf Raise']);
  assert.deepEqual(logChips([yesterday, legs, old], null, now).map(c => c.label), ['Like yesterday · back', 'Like Sep 20 · quads, glutes']);
});

test('logChips is empty when nothing is recent, so the bar shows no chips row', () => {
  const old = ['2026-07-01', '2026-07-02', '2026-07-03'].map(d => workout(d, ['back'], ['Row']));
  assert.deepEqual(logChips(old, null, now), []);
});

test('logChips puts the planned workout for today first, for new users too', () => {
  const plan: WorkoutTemplate = { id: 'legs', name: 'Legs', exercises: [{ name: 'Squat', muscleGroup: 'quads', sets: 3, reps: 5 }], muscleGroups: ['quads'], createdAt: '', usageCount: 0 };
  assert.deepEqual(logChips([back, push, legs], plan, now).map(c => c.label), ["Today's plan · Legs", 'Like Tuesday · back', 'Like Monday · chest, shoulders, biceps +1']);
  assert.deepEqual(logChips([], plan, now)[0], { label: "Today's plan · Legs", text: 'Squat' });
});

test('planChips repeats this week, uses the days-a-week setting, and offers a re-entry week only after a break', () => {
  assert.deepEqual(planChips([push, back, legs], 4, now), [
    { label: 'Repeat this week', text: 'Next week, the same as this week: Mon chest, shoulders, biceps +1; Tue back' },
    { label: 'Next week, 4 days', text: 'Next week, 4 days' },
  ]);
  const before = ['2026-09-01', '2026-09-02', '2026-09-03'].map(d => workout(d, ['back'], ['Row']));
  assert.deepEqual(planChips(before, undefined, now).map(c => c.label), ['Next week', 'Re-entry week']);
  assert.equal(planChips([back], 3, now), PLAN_STARTERS);
});

test('missedChips lists planned days in the last week with nothing logged', () => {
  const template = (id: string, name: string): WorkoutTemplate => ({
    id,
    name,
    exercises: [{ name: 'Squat', muscleGroup: 'quads', sets: 3, reps: 5 }, { name: 'Lunge', muscleGroup: 'quads', sets: 3, reps: 10 }],
    muscleGroups: ['quads'],
    createdAt: '',
    usageCount: 0,
  });
  const planned = (date: string, extra: Partial<TemplateSchedule> = {}): TemplateSchedule => ({
    id: date, date, templateId: 'legs', isRecurring: false, completed: false, ...extra,
  });
  const schedule = [
    planned('2026-10-07'), // yesterday, missed
    planned('2026-10-06'), // back was logged that day
    planned('2026-10-04', { skipped: true }),
    planned('2026-10-03'), // missed
    planned('2026-10-02'), // more than 6 days ago
    planned('2026-10-08'), // today, still to do
  ];
  assert.deepEqual(missedChips([back], schedule, [template('legs', 'Legs')], now), [
    { label: 'Log Wednesday · Legs', text: 'Legs on Wednesday: Squat, Lunge' },
    { label: 'Log Saturday · Legs', text: 'Legs on Saturday: Squat, Lunge' },
  ]);
  assert.deepEqual(missedChips([back], schedule, [], now), []);
});
