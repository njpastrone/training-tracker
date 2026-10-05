import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';

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
  if (!Array.isArray(workouts) || !workouts.every((w) => isObject(w) && typeof w.id === 'string' && typeof w.date === 'string')) fail(DAMAGED);
  for (const key of BACKUP_KEYS.slice(1)) {
    if (b.data[key] != null && !Array.isArray(b.data[key])) fail(DAMAGED);
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

// Writes a dated backup when the last one is a week old; skips when there are no workouts yet
export async function runWeeklyBackup(now = new Date()): Promise<File | null> {
  const last = lastWeeklyBackupDate();
  if (last && differenceInCalendarDays(now, parseISO(last)) < 7) return null;
  const backup = await createBackup();
  const store = backup.data[STORE_KEY] as { state?: { workouts?: unknown[] } } | null;
  if (!store?.state?.workouts?.length) return null;
  return writeBackupFile('weekly', format(now, 'yyyy-MM-dd'), backup, WEEKLY_KEEP);
}

// Saves the current data as a safety backup, then replaces everything with the backup's data.
// Returns the safety file so the user can undo.
export async function restoreBackup(backup: Backup): Promise<File> {
  const safety = writeBackupFile('safety', format(new Date(), 'yyyy-MM-dd-HHmmss'), await createBackup(), SAFETY_KEEP);
  for (const key of BACKUP_KEYS) {
    const value = backup.data[key];
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  }
  // Rehydrating runs the store's persist migration on backups from older app versions
  await useWorkoutStore.persist.rehydrate();
  const { loadTemplates, loadSchedule } = useWorkoutStore.getState();
  await Promise.all([loadTemplates(), loadSchedule()]);
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
