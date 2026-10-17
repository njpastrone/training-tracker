/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});
mock.module('expo-file-system', { namedExports: { File: class {} } });

const { readExport, parseCsv, importSummary } = await import('./importHistory');
const { emptyLibrary } = await import('./exerciseIdentity');
const { useWorkoutStore } = await import('../stores/workoutStore');

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const read = (name: string, unit: 'lbs' | 'kg' = 'lbs', existing: any[] = [], library = emptyLibrary()) => readExport(fixture(name), existing, library, unit);
const byName = (w: any, name: string) => w.exercises.filter((e: any) => e.name === name);

test('CSV fields can hold the delimiter, quotes and line breaks', () => {
  assert.deepEqual(parseCsv('a,"b, ""c""",d\r\n"x\ny",,\n\n', ','), [['a', 'b, "c"', 'd'], ['x\ny', '', '']]);
});

test('Strong: sets group by numbers, bodyweight and timed sets, and every skipped row has its reason', () => {
  const { preview, workouts, library } = read('strong.csv');
  assert.equal(preview.source, 'Strong');
  assert.equal(preview.needsUnit, true); // the current export has no unit column
  assert.equal(preview.first, '2026-01-30');
  assert.equal(preview.last, '2026-02-03');
  assert.equal(preview.workouts, 3);
  assert.deepEqual(preview.skipped, {
    'warm-up sets': 1,
    'rest timers': 2,
    'sets with nothing logged': 1,
    'rows with no exercise name': 1,
    "rows with a number that can't be read": 1,
    "rows with a date that can't be read": 1,
    'rows with missing or extra columns': 1,
  });

  const pull = workouts.find((w) => w.date === '2026-01-30')!;
  assert.equal(pull.notes, 'Felt strong, slept 8h');
  const dead = byName(pull, 'Deadlift (Barbell)');
  assert.deepEqual(dead.map((e: any) => [e.sets, e.reps, e.weight, e.unit]), [[2, 5, 225, 'lbs'], [1, 3, 245, 'lbs']]);
  assert.equal(dead[0].exerciseId, 'deadlift');
  assert.equal(dead[0].notes, 'Belt, mixed grip');
  assert.equal(dead[0].muscleGroup, 'back'); // the catalog's primary muscle
  assert.equal(byName(pull, 'Bicep Curl (Dumbbell)')[0].exerciseId, 'dumbbell-curl');

  const pullUps = byName(pull, 'Pull Up');
  assert.equal(pullUps[0].exerciseId, 'pull-up');
  assert.equal(pullUps[0].weight, undefined); // bodyweight
  assert.deepEqual(pullUps.map((e: any) => e.reps), [8, 7]);
  assert.deepEqual(byName(pull, 'Plank').map((e: any) => e.duration), [1, 0.75]);

  // An unknown name becomes the user's own exercise, under the name Strong gave it
  const odd = byName(pull, 'Zercher Carry Thing')[0];
  assert.match(odd.exerciseId, /^custom-/);
  assert.deepEqual(library.custom.map((c) => [c.name, c.metric]), [['Zercher Carry Thing', 'weight-reps']]);

  const run = workouts.find((w) => w.date === '2026-02-01')!;
  assert.equal(run.notes, 'Easy pace\nthen strides');
  assert.deepEqual(run.exercises.map((e) => [e.exerciseId, e.distance, e.distanceUnit, e.duration]), [['running', 3.1, 'mi', 32]]);
  assert.match(run.rawInput, /^Run: Running \(Treadmill\) 1 set · 32 min · 3\.1 mi$/);

  // The bad rows of Push Day are gone; its one good set stays
  assert.deepEqual(workouts.find((w) => w.date === '2026-02-03')!.exercises.map((e) => [e.sets, e.reps, e.exerciseId]), [[1, 5, 'bench-press']]);
  assert.equal(preview.sets, 2 + 1 + 2 + 2 + 2 + 1 + 1 + 1);
});

test('Strong without a unit column takes the unit picked for it, distance included', () => {
  const run = read('strong.csv', 'kg').workouts.find((w) => w.date === '2026-02-01')!;
  assert.equal(run.exercises[0].distanceUnit, 'km');
  const pull = read('strong.csv', 'kg').workouts.find((w) => w.date === '2026-01-30')!;
  assert.equal(byName(pull, 'Deadlift (Barbell)')[0].unit, 'kg');
});

test('older Strong exports: ";" separated with a unit on every row', () => {
  const { preview, workouts } = read('strong-older.csv', 'lbs');
  assert.equal(preview.needsUnit, false);
  assert.deepEqual(preview.skipped, {});
  const lift = workouts.find((w) => w.date === '2022-02-16')!;
  assert.deepEqual(lift.exercises.map((e) => [e.exerciseId, e.sets, e.weight, e.unit]), [['squat', 2, 100, 'kg'], ['overhead-press', 1, 95, 'lbs']]);
  const bike = workouts.find((w) => w.date === '2022-02-17')!.exercises[0];
  assert.deepEqual([bike.distance, bike.distanceUnit, bike.duration, bike.muscleGroup], [12.5, 'km', 30, 'cardio']);
});

test('Hevy: kg from the header, warm-ups left out, failure and drop sets kept', () => {
  const { preview, workouts } = read('hevy.csv', 'lbs');
  assert.equal(preview.source, 'Hevy');
  assert.equal(preview.needsUnit, false);
  assert.equal(preview.workouts, 2);
  assert.deepEqual(preview.skipped, {
    'warm-up sets': 1,
    "rows with a date that can't be read": 1,
    "rows with a number that can't be read": 1,
    'sets with nothing logged': 1,
  });
  const push = workouts.find((w) => w.date === '2026-05-22')!;
  assert.equal(push.notes, 'Gym was packed');
  const bench = byName(push, 'Bench Press (Barbell)');
  assert.deepEqual(bench.map((e: any) => [e.sets, e.reps, e.weight, e.unit, e.exerciseId]), [[2, 8, 80, 'kg', 'bench-press'], [1, 6, 80, 'kg', 'bench-press']]);
  assert.equal(bench[0].notes, 'Pause reps');
  assert.equal(byName(push, 'Pull Up (Assisted)')[0].exerciseId, 'assisted-pull-up');
  assert.equal(byName(push, 'Side Plank')[0].duration, 0.5);
  assert.deepEqual(byName(push, 'Lower Chest Fly').map((e: any) => e.sets), [2]);
  const run = workouts.find((w) => w.date === '2026-05-24')!.exercises[0];
  assert.deepEqual([run.exerciseId, run.distance, run.distanceUnit, run.duration], ['running', 10.2, 'km', 65]);
});

test('Hevy in pounds and miles', () => {
  const [w] = read('hevy-lbs.csv', 'kg').workouts;
  assert.deepEqual(w.exercises.map((e) => [e.exerciseId, e.weight, e.unit, e.distance, e.distanceUnit]), [
    ['squat', 225, 'lbs', undefined, undefined],
    ['walking', undefined, undefined, 1.5, 'mi'],
  ]);
});

test('importing the same file twice adds nothing, and unknown names keep one exercise', () => {
  const store = () => useWorkoutStore.getState();
  for (let i = 0; i < 2; i++) {
    const { workouts, library, preview } = readExport(fixture('hevy.csv'), store().workouts, store().exerciseLibrary, 'lbs');
    assert.equal(preview.workouts, i === 0 ? 2 : 0);
    assert.equal(preview.already, i === 0 ? 0 : 2);
    store().importWorkouts(workouts, library);
  }
  assert.equal(store().workouts.length, 2);
  assert.deepEqual(store().workouts.map((w) => w.date), ['2026-05-24', '2026-05-22']);
  // Another app's file of the same day adds its own workouts; the same exercise name finds the one made before
  const before = store().exerciseLibrary.custom.length;
  const again = readExport(fixture('hevy.csv').replace(/"Push Day!"/g, '"Push Day 2"'), store().workouts, store().exerciseLibrary, 'lbs');
  assert.equal(again.preview.workouts, 1);
  assert.equal(again.library.custom.length, before);
});

test('a file that is not an export says so', () => {
  assert.throws(() => readExport('{"app":"LiftText"}', [], emptyLibrary(), 'lbs'), /isn't a Strong or Hevy export/);
  assert.throws(() => readExport('', [], emptyLibrary(), 'lbs'), /isn't a Strong or Hevy export/);
});

test('the preview names the range, what is already there and every reason rows were left out', () => {
  const { preview } = read('strong.csv');
  const text = importSummary({ ...preview, already: 1 });
  assert.match(text, /^3 workouts and 12 sets from Strong, Jan 30, 2026 to Feb 3, 2026\./);
  assert.match(text, /1 workout already in LiftText is left out\./);
  assert.match(text, /• rest timers: 2\n• sets with nothing logged: 1/);
  assert.match(text, /doesn't say kg or lb: pick the unit Strong was set to/);
  assert.match(text, /The file stays on this phone\.$/);
  assert.match(importSummary({ ...preview, workouts: 0, sets: 0, skipped: {}, already: 3 }), /^No new workouts in this Strong file\.\n\n3 workouts already/);
});

test('Hevy with a byte-order mark and CRLF line endings reads the same as the plain file', () => {
  const plain = read('hevy.csv', 'lbs');
  const bom = readExport('﻿' + fixture('hevy.csv').replace(/\n/g, '\r\n'), [], emptyLibrary(), 'lbs');
  assert.equal(bom.preview.source, 'Hevy');
  assert.equal(bom.preview.needsUnit, false);
  assert.deepEqual(bom.preview, plain.preview);
  assert.deepEqual(bom.workouts.map((w) => [w.date, w.notes, w.exercises.map((e) => [e.name, e.sets, e.reps, e.weight, e.unit])]),
    plain.workouts.map((w) => [w.date, w.notes, w.exercises.map((e) => [e.name, e.sets, e.reps, e.weight, e.unit])]));
  assert.equal(byName(bom.workouts.find((w) => w.date === '2026-05-22')!, 'Bench Press (Barbell)')[0].unit, 'kg');
});

test('Strong rows with Infinity or a negative weight are skipped, not imported', () => {
  const header = fixture('strong.csv').split('\n')[0];
  const row = (weight: string, reps: string) => `2026-03-01 07:00:00,"Leg Day",1h,"Squat (Barbell)",1,${weight},${reps},0,0.0,,,`;
  const { preview, workouts } = readExport([header, row('Infinity', '5'), row('-20', '5'), row('100', '5')].join('\n'), [], emptyLibrary(), 'lbs');
  assert.deepEqual(preview.skipped, { "rows with a number that can't be read": 2 });
  assert.deepEqual(workouts.flatMap((w) => w.exercises.map((e) => [e.sets, e.reps, e.weight])), [[1, 5, 100]]);
});
