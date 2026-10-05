/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trainingWindow, usualPerWeek, onPace, perWeekRate, reportDays } from './pace';

const THU = new Date(2026, 9, 8, 9); // Thu 2026-10-08
const paceOf = (dates: string[], perWeek: number, days = 7) => {
  const win = trainingWindow(dates, days, THU);
  return onPace(perWeekRate(win.trained.size, win.elapsed), perWeek, win.elapsed);
};

test('the window is the last N days ending today, not the calendar week', () => {
  const win = trainingWindow(['2026-10-01', '2026-10-02', '2026-10-08', '2026-10-09'], 7, THU);
  assert.equal(win.first, '2026-10-02');
  assert.equal(win.last, '2026-10-08');
  assert.deepEqual([...win.trained].sort(), ['2026-10-02', '2026-10-08']); // Oct 1 too old, Oct 9 not yet
});

test('day one of a fresh start is on pace, trained or not', () => {
  assert.equal(trainingWindow([], 7, THU).elapsed, 0);
  assert.equal(paceOf([], 3), true);
  assert.equal(trainingWindow(['2026-10-08'], 7, THU).elapsed, 1);
  assert.equal(paceOf(['2026-10-08'], 5), true);
  // Started yesterday, nothing yet today: one day counts, 3/wk expects under one
  assert.equal(paceOf(['2026-10-07'], 3), true);
});

test('today only counts once trained, so an untrained today never fails you', () => {
  const morning = trainingWindow(['2026-09-01', '2026-10-06'], 7, THU);
  assert.equal(morning.elapsed, 6);
  assert.equal(trainingWindow(['2026-09-01', '2026-10-06', '2026-10-08'], 7, THU).elapsed, 7);
});

test('rest days between sessions keep a regular 3x/week user on pace', () => {
  // Mon/Wed/Fri trainer, checked on every day of the following week
  const history = ['2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07'];
  for (let day = 3; day <= 9; day++) {
    const now = new Date(2026, 9, day, 9);
    const past = history.filter(d => d <= `2026-10-0${day}`);
    const win = trainingWindow(past, 7, now);
    assert.equal(onPace(perWeekRate(win.trained.size, win.elapsed), 3, win.elapsed), true, `Oct ${day}`);
  }
});

test('falling behind your usual frequency is off pace', () => {
  // 5x/week user with one session in a full week
  assert.equal(paceOf(['2026-09-01', '2026-10-05'], 5), false);
  // 2x/week user with nothing in the last 7 days
  assert.equal(paceOf(['2026-09-01'], 2), false);
  // A 1x/week user still has today to get their one in
  assert.equal(paceOf(['2026-09-01'], 1), true);
});

test('per-week rates normalise long windows and take a first week as it stands', () => {
  assert.equal(perWeekRate(20, 14), 10);
  assert.equal(perWeekRate(10, 2), 10); // not extrapolated to 35
  // 10 sets in 2 days is on pace for an 8-set week; nothing is owed until the share reaches a whole one
  assert.equal(onPace(perWeekRate(10, 2), 8, 2), true);
  assert.equal(onPace(0, 2, 3), true);
  assert.equal(onPace(0, 2, 4), false);
  assert.equal(onPace(perWeekRate(14, 14), 8, 14), false);
  assert.equal(onPace(perWeekRate(16, 14), 8, 14), true);
});

test('usual frequency comes from the 4 weeks before the last 7 days', () => {
  assert.equal(usualPerWeek([], THU), 3);
  // 8 days between Sep 4 and Oct 1 → 2/wk; the last 7 days are ignored
  const dates = ['2026-09-04', '2026-09-06', '2026-09-11', '2026-09-13', '2026-09-18', '2026-09-20', '2026-09-25', '2026-10-01', '2026-10-05', '2026-10-06'];
  assert.equal(usualPerWeek(dates, THU), 2);
  assert.equal(usualPerWeek(['2026-09-30'], THU), 1);
});

test('the report window is longer for people who train less', () => {
  assert.equal(reportDays(1), 14);
  assert.equal(reportDays(3), 14);
  assert.equal(reportDays(4), 12);
  assert.equal(reportDays(6), 10);
});
