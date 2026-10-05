/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekSky, mixHex, SKY } from './sky';

// Today is Thu 2026-10-08, so the last 7 days are Fri 2026-10-02 .. Thu 2026-10-08
const THU = new Date(2026, 9, 8, 9);
const MON = new Date(2026, 9, 5, 9);
const w = (...dates: string[]) => dates.map(date => ({ date }));
const PLAN = w('2026-10-02', '2026-10-04', '2026-10-06', '2026-10-08');
// 3x/week over the 4 weeks before the window (12 days), and older history so the window is full
const USUAL = w('2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11', '2026-09-14', '2026-09-16', '2026-09-18',
  '2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28', '2026-09-30');

test('a fresh start with nothing logged is dawn, not dusk', () => {
  const sky = weekSky([], [], THU);
  assert.equal(sky.phase, 'dawn');
  assert.equal(sky.progress, 0);
  assert.deepEqual(sky.stops, SKY.dawn);
  assert.equal(sky.target, 3);
  assert.equal(sky.planned, false);
});

test('Monday is not a reset: last week\'s workouts still count', () => {
  // The last 7 days on Mon Oct 5 are Sep 29 .. Oct 5
  const sky = weekSky([...USUAL, ...w('2026-10-01', '2026-10-03')], [], MON);
  assert.equal(sky.done, 3); // Sep 30, Oct 1, Oct 3
  assert.equal(sky.phase, 'day');
});

test('each workout brightens the sky toward day', () => {
  const one = weekSky([...USUAL, ...w('2026-10-06')], [], THU);
  const two = weekSky([...USUAL, ...w('2026-10-04', '2026-10-06')], [], THU);
  assert.equal(one.target, 3);
  assert.equal(two.done, 2);
  assert.equal(two.phase, 'dawn');
  assert.equal(two.stops[0], mixHex(SKY.dawn[0], SKY.day[0], 2 / 3));
});

test('the usual count in the last 7 days is full daylight', () => {
  const sky = weekSky([...USUAL, ...w('2026-10-02', '2026-10-05', '2026-10-07')], [], THU);
  assert.equal(sky.phase, 'day');
  assert.deepEqual(sky.stops, SKY.day);
});

test('two sessions the same day count once', () => {
  assert.equal(weekSky(w('2026-10-05', '2026-10-05'), [], THU).done, 1);
});

test('falling behind pace is dusk', () => {
  // 3x/week usual, one session in the last 7 days
  const sky = weekSky([...USUAL, ...w('2026-10-03')], [], THU);
  assert.equal(sky.phase, 'dusk');
  assert.deepEqual(sky.stops, SKY.dusk);
});

test('with a plan the target is the planned days in the last 7, and missing one already gone is dusk', () => {
  const onTrack = weekSky(w('2026-10-02', '2026-10-04', '2026-10-06'), PLAN, THU);
  assert.equal(onTrack.target, 4);
  assert.equal(onTrack.planned, true);
  assert.equal(onTrack.phase, 'dawn'); // today's session isn't owed until today is over
  assert.equal(weekSky(w('2026-10-02', '2026-10-06'), PLAN, THU).phase, 'dusk');
  // Planned days outside the last 7 don't count
  assert.equal(weekSky([], [...PLAN, ...w('2026-10-01', '2026-10-09')], THU).target, 4);
});
