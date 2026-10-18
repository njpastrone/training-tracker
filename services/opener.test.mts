/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format, subDays } from 'date-fns';
import { pickOpener, openerText, type OpenerInput } from './opener';
import { emptyLibrary } from './exerciseIdentity';
import type { MuscleGroup, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

const now = new Date(2026, 9, 17, 9);
const day = (n: number) => format(subDays(now, n), 'yyyy-MM-dd');
const today = day(0);
const workout = (date: string, groups: MuscleGroup[]): Workout => ({
  id: date + groups.join(),
  date,
  rawInput: '',
  createdAt: date,
  muscleGroups: groups,
  exercises: [{ id: '0', name: groups[0] === 'chest' ? 'Bench Press' : 'Squat', muscleGroup: groups[0] }],
});
// Three days a week for four weeks, the last one `gap` days ago, always chest
const usualWeeks = (gap: number) => Array.from({ length: 12 }, (_, i) => workout(day(gap + Math.floor(i / 3) * 7 + (i % 3) * 2), ['chest']));
const legs: WorkoutTemplate = { id: 't-legs', name: 'Legs', exercises: [], muscleGroups: ['quads', 'hamstrings'], createdAt: today, usageCount: 0 } as any;
const legsToday: TemplateSchedule = { id: 's1', date: today, templateId: 't-legs', isRecurring: false, completed: false };
const input = (o: Partial<OpenerInput>): OpenerInput => ({ workouts: [], schedule: [], templates: [legs], library: emptyLibrary(), unit: 'lbs', threadEmpty: false, ...o });

test('planned today: names the plan and a muscle not trained in the last 7 days', () => {
  const o = pickOpener(input({ workouts: usualWeeks(1), schedule: [legsToday] }), now);
  assert.deepEqual(o, { kind: 'planned', templateId: 't-legs', name: 'Legs', note: "Quads hasn't been trained in the last 7 days." });
  assert.equal(openerText(o!), 'Legs is planned for today.');
});

test('planned beats comeback', () => {
  assert.equal(pickOpener(input({ workouts: usualWeeks(6), schedule: [legsToday] }), now)?.kind, 'planned');
});

test('"Not today", a logged workout, a skipped plan or a missing template hide the plan', () => {
  assert.equal(pickOpener(input({ schedule: [legsToday], skippedOpener: today }), now), null);
  assert.equal(pickOpener(input({ schedule: [legsToday], workouts: [workout(today, ['chest'])] }), now), null);
  assert.equal(pickOpener(input({ schedule: [{ ...legsToday, skipped: true }] }), now), null);
  assert.equal(pickOpener(input({ schedule: [legsToday], templates: [] }), now), null);
});

test('comeback after 5+ days off with a usual week, not before', () => {
  const o = pickOpener(input({ workouts: usualWeeks(6) }), now);
  assert.deepEqual(o, { kind: 'comeback', days: 6 });
  assert.equal(openerText(o!), '6 days since your last workout. Start with whatever has rested longest.');
  assert.equal(pickOpener(input({ workouts: usualWeeks(4) }), now), null);
});

test('welcome only on an empty thread', () => {
  assert.deepEqual(pickOpener(input({ threadEmpty: true }), now), { kind: 'welcome' });
  assert.equal(pickOpener(input({}), now), null);
});
