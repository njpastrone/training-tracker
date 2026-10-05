/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addDays, format } from 'date-fns';

// In-memory AsyncStorage so the real services run under node
const mem = new Map<string, string>();
let failSetItem: string | null = null;
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (k === failSetItem) { failSetItem = null; throw new Error('disk full'); }
      mem.set(k, v);
    },
    removeItem: async (k: string) => void mem.delete(k),
  },
});

// expo-file-system over a temp dir
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lifttext-backup-'));
const join = (parts: any[]) => path.join(...parts.map((p) => (typeof p === 'string' ? p : p.uri)));
let picked: any = { canceled: true, result: null };
class FakeFile {
  uri: string;
  constructor(...parts: any[]) { this.uri = join(parts); }
  get name() { return path.basename(this.uri); }
  get exists() { return fs.existsSync(this.uri); }
  write(s: string) { fs.writeFileSync(this.uri, s); }
  async text() { return fs.readFileSync(this.uri, 'utf8'); }
  delete() { fs.rmSync(this.uri); }
  static pickFileAsync = async () => picked;
}
class FakeDirectory {
  uri: string;
  constructor(...parts: any[]) { this.uri = join(parts); }
  get exists() { return fs.existsSync(this.uri); }
  create() { fs.mkdirSync(this.uri, { recursive: true }); }
  list() {
    return fs.readdirSync(this.uri).map((n) => {
      const p = path.join(this.uri, n);
      return fs.statSync(p).isDirectory() ? new FakeDirectory(p) : new FakeFile(p);
    });
  }
}
const paths = { document: new FakeDirectory(root, 'doc'), cache: new FakeDirectory(root, 'cache') };
paths.cache.create();
mock.module('expo-file-system', { namedExports: { File: FakeFile, Directory: FakeDirectory, Paths: paths } });
const shared: string[] = [];
mock.module('expo-sharing', { namedExports: { shareAsync: async (uri: string) => void shared.push(uri) } });

const backup = await import('./backup');
const { useWorkoutStore } = await import('../stores/workoutStore');
const { templateService } = await import('./templates');
const { scheduleService } = await import('./schedule');
const { savePlan } = await import('./planner');

const workout = (id: string, date: string) => ({
  id, date, rawInput: 'bench 3x5 185', muscleGroups: ['chest'], createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
  exercises: [{ id: `${id}-e`, name: 'Bench press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 185, unit: 'lbs' }],
}) as any;

const snapshot = () => Object.fromEntries(backup.BACKUP_KEYS.map((k) => [k, mem.get(k)]));

async function seed() {
  useWorkoutStore.getState().addWorkout(workout('w1', '2026-10-01'));
  useWorkoutStore.getState().addWorkout(workout('w2', '2026-10-03'));
  useWorkoutStore.getState().updateSettings({ weightUnit: 'kg' });
  const t = await templateService.createTemplate({ name: 'Push', exercises: [] } as any);
  await scheduleService.scheduleWorkout('2026-10-06', t.id);
  await savePlan({
    name: 'Re-entry week',
    days: { UA: { name: 'Upper A', source: 'suggested', exercises: [{ name: 'Bench press', muscleGroup: 'chest', sets: 3, reps: 8 }] } },
    sessions: [{ date: format(addDays(new Date(), 1), 'yyyy-MM-dd'), day: 'UA' }],
    repeatWeeks: 1,
  } as any, 'plan a week', 'lbs');
  await new Promise((r) => setTimeout(r, 10)); // let the store's async persist land
}

beforeEach(async () => {
  mem.clear();
  shared.length = 0;
  fs.rmSync(path.join(root, 'doc'), { recursive: true, force: true });
  useWorkoutStore.setState({ workouts: [], templates: [], schedule: [] });
  useWorkoutStore.persist.setOptions({ version: 0, migrate: undefined });
  mem.clear();
});

test('every key the app persists is backed up', async () => {
  await seed(); // writes through the store, templates, schedule and planner
  assert.deepEqual([...mem.keys()].sort(), [...backup.BACKUP_KEYS].sort());
});

test('export → import restores identical data and takes a safety backup', async () => {
  await seed();
  const before = snapshot();
  await backup.shareBackup();
  const exported = fs.readFileSync(shared[0], 'utf8');

  // Diverge, then restore
  useWorkoutStore.getState().deleteWorkout('w1');
  useWorkoutStore.getState().addWorkout(workout('w3', '2026-10-04'));
  await templateService.saveTemplates([]);
  mem.delete('@training-tracker/plans');
  await new Promise((r) => setTimeout(r, 10));
  const diverged = snapshot();

  const { backup: b, summary } = backup.parseBackup(exported);
  assert.deepEqual({ ...summary, createdAt: undefined }, { workouts: 2, templates: 2, plans: 1, createdAt: undefined });
  const safety = await backup.restoreBackup(b);

  assert.deepEqual(snapshot(), before);
  assert.deepEqual(useWorkoutStore.getState().workouts.map((w) => w.id), ['w2', 'w1']);
  assert.equal(useWorkoutStore.getState().settings.weightUnit, 'kg');
  assert.equal(useWorkoutStore.getState().templates.length, 2);
  assert.equal(useWorkoutStore.getState().schedule.length, 2);

  // The safety backup holds the pre-restore data and restores it
  assert.deepEqual(backup.listBackups('safety').map((f) => f.uri), [safety.uri]);
  await backup.restoreBackup(backup.parseBackup(await safety.text()).backup);
  assert.deepEqual(snapshot(), diverged);
});

test('bad, old and too-new files are rejected without touching data', async () => {
  await seed();
  const before = snapshot();
  const base = await backup.createBackup();
  const good = (): any => structuredClone(base);
  const cases: [string, string, RegExp][] = [
    ['not JSON', 'hello', /isn't a LiftText backup/],
    ['other app', JSON.stringify({ ...good(), app: 'Strong' }), /isn't a LiftText backup/],
    ['no version', JSON.stringify({ ...good(), backupVersion: undefined }), /isn't a LiftText backup/],
    ['old format', JSON.stringify({ ...good(), backupVersion: 0 }), /no longer supported/],
    ['newer format', JSON.stringify({ ...good(), backupVersion: 2 }), /newer version/],
    ['newer store', JSON.stringify((() => { const g = good(); g.data['@training-tracker/storage'].version = 9; return g; })()), /newer version/],
    ['no workouts', JSON.stringify((() => { const g = good(); delete g.data['@training-tracker/storage'].state.workouts; return g; })()), /damaged/],
    ['bad workout', JSON.stringify((() => { const g = good(); g.data['@training-tracker/storage'].state.workouts.push({ id: 5 }); return g; })()), /damaged/],
    ['workout without exercises', JSON.stringify((() => { const g = good(); delete g.data['@training-tracker/storage'].state.workouts[0].exercises; return g; })()), /damaged/],
    ['bad exercise', JSON.stringify((() => { const g = good(); g.data['@training-tracker/storage'].state.workouts[0].exercises.push(null); return g; })()), /damaged/],
    ['no settings', JSON.stringify((() => { const g = good(); delete g.data['@training-tracker/storage'].state.settings; return g; })()), /damaged/],
    ['bad templates', JSON.stringify((() => { const g = good(); g.data['@training-tracker/templates'] = 'x'; return g; })()), /damaged/],
    ['null template', JSON.stringify((() => { const g = good(); g.data['@training-tracker/templates'].push(null); return g; })()), /damaged/],
    ['schedule without template', JSON.stringify((() => { const g = good(); delete g.data['@training-tracker/schedule'][0].templateId; return g; })()), /damaged/],
    ['plan without dates', JSON.stringify((() => { const g = good(); delete g.data['@training-tracker/plans'][0].startDate; return g; })()), /damaged/],
    ['bad date', JSON.stringify({ ...good(), createdAt: 'yesterday' }), /damaged/],
  ];
  for (const [label, text, message] of cases) {
    assert.throws(() => backup.parseBackup(text), message, label);
  }
  picked = { canceled: false, result: { text: async () => 'hello' } };
  await assert.rejects(backup.pickBackup(), /isn't a LiftText backup/);
  picked = { canceled: true, result: null };
  assert.equal(await backup.pickBackup(), null);

  assert.deepEqual(snapshot(), before);
  assert.deepEqual(backup.listBackups('safety'), []);
});

test('a restore that fails partway puts the previous data back', async () => {
  await seed();
  const before = snapshot();
  const other = await backup.createBackup();
  other.data['@training-tracker/storage'] = { ...(other.data['@training-tracker/storage'] as any), state: { ...(other.data['@training-tracker/storage'] as any).state, workouts: [] } };
  other.data['@training-tracker/templates'] = [];
  failSetItem = '@training-tracker/schedule';
  await assert.rejects(backup.restoreBackup(other), /LiftText-safety-.*\.json in Files/);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(useWorkoutStore.getState().workouts.map((w) => w.id), ['w2', 'w1']);
  assert.equal(useWorkoutStore.getState().templates.length, 2);
});

test('import runs the store migration on files from older app versions', async () => {
  await seed();
  const old = JSON.stringify(await backup.createBackup()); // store version 0
  useWorkoutStore.persist.setOptions({
    version: 1,
    migrate: (state: any, from) => ({ ...state, workouts: state.workouts.map((w: any) => ({ ...w, rawInput: `v${from}:${w.rawInput}` })) }),
  });
  await backup.restoreBackup(backup.parseBackup(old).backup);
  assert.equal(useWorkoutStore.getState().workouts[0].rawInput, 'v0:bench 3x5 185');
  assert.equal(JSON.parse(mem.get('@training-tracker/storage')!).version, 1);
});

test('weekly backup writes once a week, skips empty data and keeps the last 8', async () => {
  assert.equal(await backup.runWeeklyBackup(new Date(2026, 9, 1)), null);
  await seed();
  assert.ok(await backup.runWeeklyBackup(new Date(2026, 9, 1)));
  assert.equal(await backup.runWeeklyBackup(new Date(2026, 9, 7)), null);
  assert.ok(await backup.runWeeklyBackup(new Date(2026, 9, 8)));
  assert.equal(backup.lastWeeklyBackupDate(), '2026-10-08');
  for (let week = 2; week < 12; week++) await backup.runWeeklyBackup(new Date(2026, 9, 1 + week * 7));
  const files = backup.listBackups('weekly');
  assert.equal(files.length, 8);
  assert.equal(files[0].name, 'LiftText-weekly-2026-12-17.json');
  assert.deepEqual(backup.parseBackup(await files[0].text()).summary.workouts, 2);
});
