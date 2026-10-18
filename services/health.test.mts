/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { format, subDays } from 'date-fns';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

// A fake HealthKit module that records every call
let calls: [string, ...unknown[]][] = [];
let canSave = true;
const fake = {
  isAvailable: () => true,
  requestAccess: async (write: boolean) => { calls.push(['requestAccess', write]); return write && canSave; },
  canSaveWorkouts: () => canSave,
  workouts: async (since: number) => [{ start: since + 3_600_000, end: since + 5_520_000, activity: 37, source: 'Apple Watch of Sam' }],
  bodyWeights: async () => [{ date: Date.parse('2026-10-18T07:00:00'), kg: 80 }, { date: Date.parse('2026-09-20T07:00:00'), kg: 81.5 }],
  saveWorkout: async (...args: unknown[]) => { calls.push(['saveWorkout', ...args]); return true; },
  deleteWorkouts: async (ids: string[]) => { calls.push(['deleteWorkouts', ids]); return ids.length; },
};
mock.module('expo', { namedExports: { requireOptionalNativeModule: (name: string) => (name === 'LiftTextHealth' ? fake : null) } });

const { useWorkoutStore } = await import('../stores/workoutStore');
const health = await import('./health');
health.startHealthSync();
const store = () => useWorkoutStore.getState();
const flush = () => new Promise((r) => setTimeout(r, 0)); // lets the sync queue run

const today = format(new Date(), 'yyyy-MM-dd');
const workout = (id: string, date = today, createdAt = new Date().toISOString(), exercises: any[] = [{ id: `${id}-e`, name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 185, unit: 'lbs' }]) =>
  ({ id, date, rawInput: 'bench', muscleGroups: ['chest'], createdAt, exercises }) as any;

beforeEach(async () => {
  await store().clearAllData();
  await flush();
  calls = [];
  canSave = true;
});

test('a workout gets an end when it was logged (or noon on a past day) and lasts its cardio minutes, else an hour', () => {
  const now = new Date('2026-10-18T19:00:00');
  const logged = new Date('2026-10-18T18:30:00');
  const t = health.healthTimes(workout('a', '2026-10-18', logged.toISOString()), now)!;
  assert.equal(t.end, logged.getTime());
  assert.equal(t.end - t.start, 60 * 60_000);
  assert.equal(t.activity, 50); // strength training

  const runs = [{ name: 'Run', muscleGroup: 'cardio', duration: 30 }, { name: 'Bike', muscleGroup: 'cardio', duration: 15 }];
  const cardio = health.healthTimes(workout('b', '2026-10-15', logged.toISOString(), runs), now)!;
  assert.equal(cardio.start, new Date('2026-10-15T12:00:00').getTime());
  assert.equal(cardio.end - cardio.start, 45 * 60_000);
  assert.equal(cardio.activity, 73); // mixed cardio, only when every exercise is cardio

  const mixed = health.healthTimes(workout('c', '2026-10-18', logged.toISOString(), [...runs, { name: 'Squat', muscleGroup: 'quads' }]), now)!;
  assert.equal(mixed.activity, 50);
  assert.equal(health.healthTimes(workout('d', '2026-10-19'), now), null, 'nothing for a day still to come');
});

test('nothing goes to Apple Health until saving is on', async () => {
  store().updateSettings({ appleHealth: { connected: true } });
  store().addWorkout(workout('a'));
  store().deleteWorkouts(['a']);
  await flush();
  assert.deepEqual(calls, []);
});

test('with saving on, a logged workout is saved, a change replaces it, a delete removes it, and Undo saves it again', async () => {
  store().updateSettings({ appleHealth: { saveSince: new Date(Date.now() - 1000).toISOString() } });
  store().addWorkout(workout('a'));
  await flush();
  assert.deepEqual(calls.map((c) => c[0]), ['deleteWorkouts', 'saveWorkout']);
  assert.equal(calls[1][1], 'a');

  calls = [];
  store().updateWorkout('a', { date: format(subDays(new Date(), 1), 'yyyy-MM-dd') });
  await flush();
  assert.deepEqual(calls.map((c) => c[0]), ['deleteWorkouts', 'saveWorkout'], 'replaced, never doubled');

  calls = [];
  store().deleteWithUndo(['a']);
  await flush();
  assert.deepEqual(calls, [['deleteWorkouts', ['a']]]);

  calls = [];
  store().restoreWorkouts(store().undo!);
  await flush();
  assert.deepEqual(calls.map((c) => c[0]), ['deleteWorkouts', 'saveWorkout']);
});

test('workouts logged before saving was turned on are never copied', async () => {
  store().updateSettings({ appleHealth: { saveSince: new Date().toISOString() } });
  store().addWorkout(workout('old', today, new Date(Date.now() - 86_400_000).toISOString()));
  store().updateWorkout('old', { notes: 'felt good' });
  await flush();
  assert.ok(!calls.some((c) => c[0] === 'saveWorkout'));
});

test('imports and Clear all data leave Apple Health alone', async () => {
  store().updateSettings({ appleHealth: { saveSince: new Date(Date.now() - 1000).toISOString() } });
  store().importWorkouts([workout('imported')], store().exerciseLibrary);
  await store().clearAllData();
  await flush();
  assert.deepEqual(calls, []);
});

test('when Apple Health refuses saving, nothing is written', async () => {
  store().updateSettings({ appleHealth: { saveSince: new Date(Date.now() - 1000).toISOString() } });
  canSave = false;
  store().addWorkout(workout('a'));
  await flush();
  assert.deepEqual(calls, []);
  assert.equal(await health.requestHealthAccess(true), false);
});

test('what Progress reads stays in memory: the store and storage never see it', async () => {
  store().updateSettings({ appleHealth: { connected: true }, weightUnit: 'lbs' });
  await flush();
  const before = JSON.stringify([...mem]);
  const week = await health.readHealthWeek('lbs', new Date('2026-10-18T20:00:00'));
  assert.equal(health.activityName(week.workouts[0].activity), 'Running');
  assert.deepEqual(week.weight, { now: 176.4, change: -3.3, since: '2026-09-20' });
  await flush();
  assert.equal(JSON.stringify([...mem]), before);
  assert.doesNotMatch(JSON.stringify([...mem]), /Apple Watch of Sam|176\.4/);
  assert.deepEqual(health.weightTrend([{ date: 0, kg: 70 }], 'kg'), { now: 70 });
  assert.equal(health.weightTrend([], 'kg'), undefined);
});

// Source scan: Health data must never reach the server or the AI. Only these files may import Health code, and
// none of them sends anything: a new importer has to be checked against that promise before it's added here.
const repo = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(repo, file), 'utf8');
const importsOf = (src: string) => [...src.matchAll(/(?:from\s*|import\s*\(\s*|require\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(path.join(repo, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'ios' ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.fixtures\./.test(e.name) ? [rel] : [];
  });

test('only Settings, the Progress card and startup import Health code, and services/health.ts reaches nothing that sends', () => {
  const importers = ['app', 'components', 'services', 'hooks', 'stores', 'contexts', 'modules']
    .flatMap(sourceFiles)
    .filter((f) => importsOf(read(f)).some((i) => /(^|\/)health$|modules\/health/.test(i)));
  assert.deepEqual(importers.sort(), ['app/_layout.tsx', 'app/settings.tsx', 'components/HealthCard.tsx', 'services/health.ts']);
  const src = read('services/health.ts');
  assert.deepEqual(new Set(importsOf(src)), new Set(['date-fns', '../modules/health', '../stores/workoutStore', './progress', '../types/workout']));
  assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|updateSettings|setState/);
  assert.doesNotMatch(read('components/HealthCard.tsx'), /\bfetch\s*\(|updateSettings|setState|services\/(claude|ask|coach|backup)/);
});
