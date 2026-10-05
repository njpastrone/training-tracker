/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekSky, usualWeeklyCount, mixHex, SKY } from './sky';

// Week of Mon 2026-10-05 .. Sun 2026-10-11
const MON = new Date(2026, 9, 5, 9);
const THU = new Date(2026, 9, 8, 9);
const SAT = new Date(2026, 9, 10, 9);
const SUN = new Date(2026, 9, 11, 20);
const w = (...dates: string[]) => dates.map(date => ({ date }));
const PLAN = w('2026-10-05', '2026-10-06', '2026-10-08', '2026-10-10');

test('Monday with nothing logged is dawn', () => {
  const sky = weekSky([], PLAN, MON);
  assert.equal(sky.phase, 'dawn');
  assert.equal(sky.progress, 0);
  assert.deepEqual(sky.stops, SKY.dawn);
  assert.equal(sky.target, 4);
  assert.equal(sky.planned, true);
});

test('each workout brightens the sky toward day', () => {
  const one = weekSky(w('2026-10-05'), PLAN, THU);
  const two = weekSky(w('2026-10-05', '2026-10-06'), PLAN, THU);
  assert.equal(one.progress, 0.25);
  assert.equal(two.progress, 0.5);
  assert.equal(two.phase, 'dawn');
  assert.equal(two.stops[0], mixHex(SKY.dawn[0], SKY.day[0], 0.5));
});

test('a complete week is full daylight', () => {
  const sky = weekSky(w('2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09'), PLAN, SAT);
  assert.equal(sky.phase, 'day');
  assert.deepEqual(sky.stops, SKY.day);
});

test('two sessions the same day count once', () => {
  assert.equal(weekSky(w('2026-10-05', '2026-10-05'), PLAN, THU).done, 1);
});

test('a week that can no longer be completed is dusk', () => {
  // Saturday, 1 of 4 done, 2 days left
  const sky = weekSky(w('2026-10-05'), PLAN, SAT);
  assert.equal(sky.phase, 'dusk');
  assert.deepEqual(sky.stops, SKY.dusk);
  // Sunday, 3 of 4 done, still possible today
  assert.equal(weekSky(w('2026-10-05', '2026-10-06', '2026-10-08'), PLAN, SUN).phase, 'dawn');
  // Sunday, 3 of 4 done with one of them today, so no day is left
  assert.equal(weekSky(w('2026-10-05', '2026-10-06', '2026-10-11'), PLAN, SUN).phase, 'dusk');
});

test('last week and next week do not count', () => {
  const sky = weekSky(w('2026-10-04', '2026-10-12'), [...PLAN, ...w('2026-10-13')], THU);
  assert.equal(sky.done, 0);
  assert.equal(sky.target, 4);
});

test('with no plan the target is the usual weekly count', () => {
  // 8 training days in the 4 weeks before (Sep 7 .. Oct 4) → 2 a week
  const history = w('2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23', '2026-09-28', '2026-10-04');
  const sky = weekSky([...history, ...w('2026-10-05')], [], THU);
  assert.equal(sky.planned, false);
  assert.equal(sky.target, 2);
  assert.equal(sky.progress, 0.5);
});

test('usualWeeklyCount falls back to 3 with no recent history and caps at 7', () => {
  assert.equal(usualWeeklyCount([], MON), 3);
  assert.equal(usualWeeklyCount(['2026-01-01'], MON), 3);
  assert.equal(usualWeeklyCount(['2026-09-30'], MON), 1);
});
