import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { GOAL_MUSCLES } from './goals';

// Every AsyncStorage key the app persists. A new persisted key must be added here or backups miss it.
export const BACKUP_KEYS = [
  '@training-tracker/storage', // zustand store: workouts + settings
  '@training-tracker/templates',
  '@training-tracker/schedule',
  '@training-tracker/plans',
];
const STORE_KEY = BACKUP_KEYS[0];
export const BACKUP_VERSION = 1;
const WEEKLY_KEEP = 8;
const SAFETY_KEEP = 5;

export interface Backup {
  app: 'LiftText';
  backupVersion: number;
  createdAt: string;
  data: Record<string, unknown>; // parsed AsyncStorage value per key, null when unset
}

export interface BackupSummary {
  workouts: number;
  templates: number;
  plans: number;
  createdAt: string;
}

type Kind = 'weekly' | 'safety';

// Documents/Backups shows in Files › On My iPhone › LiftText and is part of the iCloud device backup
export const backupDir = () => new Directory(Paths.document, 'Backups');
export const BACKUP_FOLDER = 'Files › On My iPhone › LiftText › Backups';

export async function createBackup(): Promise<Backup> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = await AsyncStorage.getItem(key);
    data[key] = raw === null ? null : JSON.parse(raw);
  }
  return { app: 'LiftText', backupVersion: BACKUP_VERSION, createdAt: new Date().toISOString(), data };
}

const fail = (message: string): never => {
  throw new Error(message);
};
const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasStrings = (v: unknown, ...keys: string[]) => isObject(v) && keys.every((k) => typeof v[k] === 'string');
const listOf = (v: unknown, ok: (item: any) => boolean) => Array.isArray(v) && v.every(ok);
const exercisesOk = (v: unknown) => listOf(v, (e) => hasStrings(e, 'name'));
const macrosOk = (m: unknown) => isObject(m) && ['kcal', 'protein', 'carbs', 'fat'].every((k) => Number.isFinite(m[k]));
const foodEntryOk = (e: any) => hasStrings(e, 'id', 'date', 'createdAt') && listOf(e.items, (i) => hasStrings(i, 'id', 'name') && macrosOk(i.macros));
const isCount = (v: unknown) => Number.isFinite(v) && (v as number) > 0;
const customGoalOk = (c: any) =>
  hasStrings(c, 'id', 'exerciseId') &&
  (c.kind === 'lift' ? isCount(c.weight) && (c.unit === 'lbs' || c.unit === 'kg') : c.kind === 'often' && isCount(c.perWeek));
const goalsOk = (g: any) =>
  isObject(g) &&
  listOf(g.muscles, (m) => GOAL_MUSCLES.includes(m)) &&
  (g.timesPerWeek === undefined || isCount(g.timesPerWeek)) &&
  (g.minSets === undefined || (isObject(g.minSets) && Object.values(g.minSets).every(isCount))) &&
  listOf(g.custom, customGoalOk);
// Shape of each array key's elements, checked down to the fields the screens dereference
const ITEM_CHECKS: Record<string, (item: any) => boolean> = {
  '@training-tracker/templates': (t) => hasStrings(t, 'id', 'name') && exercisesOk(t.exercises) && Array.isArray(t.muscleGroups),
  '@training-tracker/schedule': (s) => hasStrings(s, 'id', 'date', 'templateId'),
  '@training-tracker/plans': (p) => hasStrings(p, 'id', 'name', 'startDate', 'endDate'),
};
const NOT_A_BACKUP = "This file isn't a LiftText backup.";
const DAMAGED = 'This backup file is damaged and was not restored.';
const TOO_NEW = 'This backup was made by a newer version of LiftText. Update the app and try again.';

// Validates an untrusted backup file; throws an Error with a user-facing message
export function parseBackup(text: string): { backup: Backup; summary: BackupSummary } {
  let b: any;
  try {
    b = JSON.parse(text);
  } catch {
    fail(NOT_A_BACKUP);
  }
  if (!isObject(b) || b.app !== 'LiftText' || !isObject(b.data) || !Number.isInteger(b.backupVersion)) fail(NOT_A_BACKUP);
  if (b.backupVersion > BACKUP_VERSION) fail(TOO_NEW);
  if (b.backupVersion < BACKUP_VERSION) fail('This backup format is no longer supported.');
  if (typeof b.createdAt !== 'string' || isNaN(Date.parse(b.createdAt))) fail(DAMAGED);

  // Older store versions are fine: restore rehydrates through the store's persist migration
  const store = b.data[STORE_KEY];
  if (!isObject(store) || !isObject(store.state) || !Number.isInteger(store.version)) fail(DAMAGED);
  if (store.version > (useWorkoutStore.persist.getOptions().version ?? 0)) fail(TOO_NEW);
  const workouts = store.state.workouts;
  if (!listOf(workouts, (w) => hasStrings(w, 'id', 'date') && exercisesOk(w.exercises) && Array.isArray(w.muscleGroups))) fail(DAMAGED);
  if (!isObject(store.state.settings)) fail(DAMAGED);
  // A backup from before food logging restores with no food, not with this phone's
  if (store.state.foodEntries === undefined) store.state.foodEntries = [];
  if (!listOf(store.state.foodEntries, foodEntryOk)) fail(DAMAGED);
  const goals = store.state.settings.goals;
  if (goals !== undefined && !goalsOk(goals)) fail(DAMAGED);
  for (const key of BACKUP_KEYS.slice(1)) {
    if (b.data[key] != null && !listOf(b.data[key], ITEM_CHECKS[key])) fail(DAMAGED);
  }

  const backup: Backup = { app: 'LiftText', backupVersion: b.backupVersion, createdAt: b.createdAt, data: b.data };
  const count = (key: string) => (b.data[key] ?? []).length;
  return {
    backup,
    summary: {
      workouts: workouts.length,
      templates: count('@training-tracker/templates'),
      plans: count('@training-tracker/plans'),
      createdAt: b.createdAt,
    },
  };
}

// Newest first; names carry the date so they sort chronologically
export function listBackups(kind: Kind): File[] {
  const dir = backupDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((f): f is File => f instanceof File && f.name.startsWith(`LiftText-${kind}-`))
    .sort((a, b) => b.name.localeCompare(a.name));
}

function writeBackupFile(kind: Kind, stamp: string, backup: Backup, keep: number): File {
  const dir = backupDir();
  dir.create({ idempotent: true, intermediates: true });
  const file = new File(dir, `LiftText-${kind}-${stamp}.json`);
  file.write(JSON.stringify(backup));
  listBackups(kind).slice(keep).forEach((f) => f.delete());
  return file;
}

// 'yyyy-MM-dd' of the newest weekly backup, or null
export function lastWeeklyBackupDate(): string | null {
  const last = listBackups('weekly')[0];
  return last ? last.name.slice('LiftText-weekly-'.length, -'.json'.length) : null;
}

// Writes a dated backup when the last one is a week old; skips when nothing is logged yet
export async function runWeeklyBackup(now = new Date()): Promise<File | null> {
  const last = lastWeeklyBackupDate();
  if (last && differenceInCalendarDays(now, parseISO(last)) < 7) return null;
  const backup = await createBackup();
  const store = backup.data[STORE_KEY] as { state?: { workouts?: unknown[]; foodEntries?: unknown[] } } | null;
  if (!store?.state?.workouts?.length && !store?.state?.foodEntries?.length) return null;
  return writeBackupFile('weekly', format(now, 'yyyy-MM-dd'), backup, WEEKLY_KEEP);
}

async function writeData(data: Backup['data']): Promise<void> {
  for (const key of BACKUP_KEYS) {
    const value = data[key];
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  }
}

// Rehydrating runs the store's persist migration on backups from older app versions
async function reloadStore(): Promise<void> {
  await useWorkoutStore.persist.rehydrate();
  const { loadTemplates, loadSchedule } = useWorkoutStore.getState();
  await Promise.all([loadTemplates(), loadSchedule()]);
}

// Saves the current data as a safety backup, then replaces everything with the backup's data.
// Returns the safety file so the user can undo. A failed write puts the previous data back.
export async function restoreBackup(backup: Backup): Promise<File> {
  const current = await createBackup();
  const safety = writeBackupFile('safety', format(new Date(), 'yyyy-MM-dd-HHmmss'), current, SAFETY_KEEP);
  try {
    await writeData(backup.data);
  } catch {
    await writeData(current.data).catch(() => {});
    await reloadStore();
    fail(`The restore failed. Your previous data is saved as ${safety.name} in ${BACKUP_FOLDER}.`);
  }
  await reloadStore();
  return safety;
}

export async function shareBackup(): Promise<void> {
  const file = new File(Paths.cache, `LiftText-backup-${format(new Date(), 'yyyy-MM-dd')}.json`);
  file.write(JSON.stringify(await createBackup()));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export backup' });
}

// Opens the file picker; null when cancelled. Throws a user-facing Error for a bad file.
export async function pickBackup(): Promise<{ backup: Backup; summary: BackupSummary } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text());
}
