/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWeeklyVolume, generateFallbackAnalysis, reportWindow } from './coach';
import { trainingWindow } from './pace';
import type { Exercise, Workout } from '../types/workout';

const workout = (date: string, ...exercises: Partial<Exercise>[]): Workout => ({
  id: date, date, rawInput: '', muscleGroups: ['chest'], createdAt: 't',
  exercises: exercises.map((e, i) => ({ id: `${date}-${i}`, name: 'x', muscleGroup: 'chest', ...e })),
});

test('a set counts 1 for the primary muscle and ½ for each secondary', () => {
  const week = analyzeWeeklyVolume([
    workout('2026-09-29',
      { exerciseId: 'bench-press', sets: 4 }, // chest; triceps, shoulders
      { exerciseId: 'close-grip-bench-press', sets: 2 }, // triceps; chest, shoulders
      { exerciseId: 'lateral-raise', sets: 3 }, // shoulders only
      { name: 'Landmine Press', muscleGroup: 'shoulders', sets: 2 }), // no catalog id: stored group only
  ], trainingWindow(['2026-09-29'], 7, new Date('2026-09-30T12:00:00')));
  assert.equal(week.chest.totalSets, 4 + 1);
  assert.equal(week.triceps.totalSets, 2 + 2);
  assert.equal(week.shoulders.totalSets, 3 + 2 + 2 + 1);
  assert.equal(week.chest.frequency, 1); // frequency stays primary-only (the workout's groups)
  assert.equal(week.triceps.frequency, 0);
});

const THU = new Date(2026, 9, 8, 9); // Thu 2026-10-08
const bench = (date: string, sets: number) => workout(date, { exerciseId: 'bench-press', sets });

test('the report window ignores Monday and scales to frequency', () => {
  const win = reportWindow([bench('2026-10-01', 3), bench('2026-10-06', 3)], THU);
  assert.equal(win.days, 14); // default 3/wk → 14 days
  assert.equal(win.first, '2026-09-25');
  assert.equal(win.trained.size, 2); // last week's session still counts on Thursday
});

test('a fresh start is graded by pace, not against a full week', () => {
  // First ever workout yesterday: 10 chest sets, 1 session
  const fresh = [bench('2026-10-07', 10)];
  const report = generateFallbackAnalysis(reportWindow(fresh, THU), fresh);
  assert.ok(!report.volumeIssues.some(i => i.startsWith('chest')));
  assert.ok(!report.frequencyIssues.some(i => i.startsWith('chest')));
  // The same single session 4 weeks into training is too little chest
  const old = [bench('2026-09-01', 10), bench('2026-10-07', 10)];
  const later = generateFallbackAnalysis(reportWindow(old, THU), old);
  assert.ok(later.volumeIssues.some(i => i.startsWith('chest')));
  assert.ok(later.frequencyIssues.some(i => i.startsWith('chest')));
});

test('weekly volume is a per-week rate over the window', () => {
  // 14-day window, 4 sessions of 8 chest sets; today isn't trained yet so 13 days count
  const dates = ['2026-09-01', '2026-09-25', '2026-09-28', '2026-10-01', '2026-10-05'];
  const ws = dates.map(d => bench(d, 8));
  const report = generateFallbackAnalysis(reportWindow(ws, THU), ws);
  assert.equal(report.window.days, 14);
  assert.equal(report.weeklyVolume.chest, 17.2); // 32 * 7 / 13
});
