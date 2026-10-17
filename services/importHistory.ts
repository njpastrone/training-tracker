// Imports workout history from a Strong or Hevy CSV export, on the phone only: the file is never
// sent to the AI or the server. Neither app documents its columns; these are the headers their
// exports carry (see the fixtures in services/fixtures/):
// - Strong (current): Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
//   with no unit column (weights are in the unit Strong was set to), and "Rest Timer" rows between sets
// - Strong (older): Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration
//   separated by ";" or ","
// - Hevy: "title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type",
//   "weight_kg"|"weight_lbs","reps","distance_km"|"distance_miles","duration_seconds","rpe"
// Each workout's id comes from its app, start time and name, so importing the same file twice adds nothing.

import { File } from 'expo-file-system';
import { format, isValid, parse, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { catalogById, normalizeWords, type Equipment } from '../data/catalog';
import { knownIdFor, resolveExercise, type Resolution } from './exerciseIdentity';
import { exerciseNumbers } from './format';
import type { Exercise, ExerciseLibrary, MuscleGroup, WeightUnit, Workout } from '../types/workout';

export type ImportSource = 'Strong' | 'Hevy';

export interface ImportPreview {
  source: ImportSource;
  needsUnit: boolean; // the file doesn't say kg or lb: the user picks the unit their app was set to
  first?: string; // yyyy-MM-dd of the earliest new workout
  last?: string;
  workouts: number; // new workouts
  sets: number; // sets in the new workouts
  already: number; // workouts in the file that are already in LiftText
  skipped: Record<string, number>; // why rows were left out → how many
}

interface SetRow {
  name: string;
  weight: number;
  unit?: WeightUnit;
  reps: number;
  seconds: number;
  distance: number;
  distanceUnit?: Exercise['distanceUnit'];
  notes: string;
}

interface Session {
  id: string;
  date: string;
  createdAt: string;
  title: string;
  notes: string;
  sets: SetRow[];
}

const NOT_AN_EXPORT = "This file isn't a Strong or Hevy export. Export a CSV from the app's settings and pick that file.";

// RFC 4180: quoted fields may hold the delimiter, "" for a quote, and line breaks
export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') (field += '"'), i++;
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === delim) row.push(field), (field = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      rows.push([...row, field]);
      (row = []), (field = '');
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((r) => r.length > 1 || r[0].trim());
}

// Strong: "2020-12-30 18:51:52"; Hevy: "30 Jun 2025, 19:56"
function startTime(s: string): Date | undefined {
  return ['yyyy-MM-dd HH:mm:ss', 'd MMM yyyy, HH:mm'].map((f) => parse(s, f, new Date())).find(isValid);
}

// A short stable tag for a workout name (djb2)
const tag = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

const DISTANCE_UNITS: Record<string, Exercise['distanceUnit']> = { mi: 'mi', 'mi.': 'mi', miles: 'mi', km: 'km', m: 'm' };

class Skip extends Error {}

// The file's workouts and their sets, and the rows left out by reason
function readRows(rows: string[][], unit: WeightUnit): { sessions: Session[]; skipped: Record<string, number>; source: ImportSource; needsUnit: boolean } {
  const header = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''));
  const col = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
  const hevy = header.includes('exercise_title');
  if (!hevy && !(header.includes('Exercise Name') && header.includes('Set Order'))) throw new Error(NOT_AN_EXPORT);
  const source: ImportSource = hevy ? 'Hevy' : 'Strong';

  const c = hevy
    ? {
        start: col('start_time'), title: col('title'), name: col('exercise_title'), kind: col('set_type'),
        weight: col('weight_kg', 'weight_lbs'), reps: col('reps'), distance: col('distance_km', 'distance_miles'),
        seconds: col('duration_seconds'), notes: col('exercise_notes'), workoutNotes: col('description'),
        weightUnit: -1, distanceUnit: -1,
      }
    : {
        start: col('Date'), title: col('Workout Name'), name: col('Exercise Name'), kind: col('Set Order'),
        weight: col('Weight'), reps: col('Reps'), distance: col('Distance'), seconds: col('Seconds'),
        notes: col('Notes'), workoutNotes: col('Workout Notes'), weightUnit: col('Weight Unit'), distanceUnit: col('Distance Unit'),
      };
  if (c.start < 0 || c.name < 0) throw new Error(NOT_AN_EXPORT);
  const fileUnit: WeightUnit | undefined = hevy ? (header[c.weight] === 'weight_kg' ? 'kg' : header[c.weight] === 'weight_lbs' ? 'lbs' : undefined) : undefined;
  const fileDistance = hevy ? (header[c.distance] === 'distance_miles' ? 'mi' : 'km') : undefined;
  const needsUnit = c.weightUnit < 0 && !fileUnit;

  const sessions = new Map<string, Session>();
  const notes = new Map<string, string>();
  const skipped: Record<string, number> = {};
  for (const row of rows.slice(1)) {
    try {
      if (row.length !== header.length) throw new Skip('rows with missing or extra columns');
      const get = (i: number) => (i >= 0 ? row[i].trim() : '');
      const num = (i: number) => {
        const s = get(i).replace(',', '.'); // ";" files from comma-decimal locales
        const n = s === '' ? 0 : Number(s);
        if (!Number.isFinite(n) || n < 0) throw new Skip("rows with a number that can't be read");
        return n;
      };
      const title = get(c.title);
      const key = `${get(c.start)}|${title}`;
      // Strong writes the workout's notes on its first row, which may be a warm-up that's left out
      if (get(c.workoutNotes) && !notes.has(key)) notes.set(key, get(c.workoutNotes));
      const kind = get(c.kind).toLowerCase();
      if (kind === 'rest timer') throw new Skip('rest timers');
      if (kind === 'w' || kind === 'warmup') throw new Skip('warm-up sets');
      const name = get(c.name);
      if (!name) throw new Skip('rows with no exercise name');
      const when = startTime(get(c.start));
      if (!when) throw new Skip("rows with a date that can't be read");
      const set: SetRow = { name, weight: num(c.weight), reps: num(c.reps), seconds: num(c.seconds), distance: num(c.distance), notes: get(c.notes) };
      if (!set.weight && !set.reps && !set.seconds && !set.distance) throw new Skip('sets with nothing logged');
      const rowUnit = get(c.weightUnit).toLowerCase();
      set.unit = rowUnit === 'kg' ? 'kg' : rowUnit === 'lbs' || rowUnit === 'lb' ? 'lbs' : fileUnit ?? unit;
      set.distanceUnit = DISTANCE_UNITS[get(c.distanceUnit).toLowerCase()] ?? fileDistance ?? (set.unit === 'kg' ? 'km' : 'mi');

      if (!sessions.has(key)) {
        const id = `${source.toLowerCase()}-${format(when, 'yyyyMMddHHmmss')}-${tag(title)}`;
        sessions.set(key, { id, date: format(when, 'yyyy-MM-dd'), createdAt: when.toISOString(), title, notes: '', sets: [] });
      }
      sessions.get(key)!.sets.push(set);
    } catch (e) {
      if (!(e instanceof Skip)) throw e;
      skipped[e.message] = (skipped[e.message] ?? 0) + 1;
    }
  }
  for (const [key, s] of sessions) s.notes = notes.get(key) ?? '';
  return { sessions: [...sessions.values()], skipped, source, needsUnit };
}

const IMPLEMENTS: Record<string, Equipment> = {
  barbell: 'barbell', dumbbell: 'dumbbell', kettlebell: 'kettlebell', cable: 'cable', machine: 'machine', 'smith machine': 'smith',
  band: 'band', bodyweight: 'bodyweight', 'ez bar': 'ez-bar', 'trap bar': 'trap-bar', landmine: 'landmine',
};

// Strong and Hevy put the implement in brackets: "Incline Bench Press (Dumbbell)". The catalog id it
// surely means: the implement at each place in the name ("Incline Dumbbell Bench Press"), else the
// name without it when that catalog lift uses the same implement ("Romanian Deadlift (Barbell)")
function bracketedId(name: string, library: ExerciseLibrary): string | undefined {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return undefined;
  const words = m[1].split(/\s+/);
  for (let i = 0; i <= words.length; i++) {
    const id = knownIdFor([...words.slice(0, i), m[2], ...words.slice(i)].join(' '), library);
    if (id) return id;
  }
  const base = knownIdFor(m[1], library);
  return base && catalogById.get(base)?.equipment === IMPLEMENTS[normalizeWords(m[2])] ? base : undefined;
}

// The user's exercise of that name if they have one (an earlier import made it), else the catalog,
// else a new exercise under the app's name that the user can fix later
function resolve(set: SetRow, library: ExerciseLibrary): Resolution {
  const known = knownIdFor(set.name, library) ?? bracketedId(set.name, library);
  if (known) return { exerciseId: known, match: 'sure' };
  const r = resolveExercise(set.name.replace(/^(.*?)\s*\(([^)]+)\)\s*$/, '$2 $1'), set.distance ? 'cardio' : 'full_body', library);
  if (!r.custom) return r;
  const metric = set.distance ? 'distance-time' : set.weight ? 'weight-reps' : set.reps ? 'reps' : 'time';
  return { ...r, custom: { ...r.custom, name: set.name, metric } };
}

const sameNumbers = (a: SetRow, b: SetRow) =>
  a.name === b.name && a.weight === b.weight && a.unit === b.unit && a.reps === b.reps && a.seconds === b.seconds && a.distance === b.distance;

// `names` remembers each name's exercise for the rest of the file: years of history repeat the same few dozen
function toWorkout(s: Session, library: ExerciseLibrary, names: Map<string, Resolution>): { workout: Workout; library: ExerciseLibrary } {
  const exercises: Exercise[] = [];
  let prev: SetRow | undefined;
  for (const set of s.sets) {
    const last = exercises[exercises.length - 1];
    if (prev && last && sameNumbers(prev, set)) {
      last.sets = (last.sets ?? 1) + 1;
      if (set.notes && !last.notes?.includes(set.notes)) last.notes = last.notes ? `${last.notes}; ${set.notes}` : set.notes;
    } else {
      const r = names.get(set.name) ?? resolve(set, library);
      if (r.custom) library = { ...library, custom: [...library.custom, r.custom] };
      names.set(set.name, { exerciseId: r.exerciseId, match: r.match });
      const muscleGroup: MuscleGroup =
        catalogById.get(r.exerciseId)?.primary ?? library.custom.find((x) => x.id === r.exerciseId)?.muscleGroup ?? 'full_body';
      exercises.push({
        id: uuidv4(),
        exerciseId: r.exerciseId,
        match: r.match,
        name: set.name,
        muscleGroup,
        sets: 1,
        ...(set.reps ? { reps: set.reps } : {}),
        ...(set.weight ? { weight: set.weight, unit: set.unit } : {}),
        ...(set.seconds ? { duration: set.seconds / 60 } : {}),
        ...(set.distance ? { distance: set.distance, distanceUnit: set.distanceUnit } : {}),
        ...(set.notes ? { notes: set.notes } : {}),
      });
    }
    prev = set;
  }
  const summary = exercises.map((e) => `${e.name} ${exerciseNumbers(e)}`).join(', ');
  return {
    workout: {
      id: s.id,
      date: s.date,
      exercises,
      rawInput: s.title ? `${s.title}: ${summary}` : summary,
      muscleGroups: [...new Set(exercises.map((e) => e.muscleGroup))],
      ...(s.notes ? { notes: s.notes } : {}),
      createdAt: s.createdAt,
    },
    library,
  };
}

// Reads an untrusted export: the preview to confirm, and the new workouts with exercise identity
// filled in. `unit` is used only when the file doesn't say. Throws an Error with a user-facing message.
export function readExport(text: string, existing: Workout[], library: ExerciseLibrary, unit: WeightUnit) {
  const delim = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = parseCsv(text, delim);
  if (rows.length === 0) throw new Error(NOT_AN_EXPORT);
  const { sessions, skipped, source, needsUnit } = readRows(rows, unit);

  const have = new Set(existing.map((w) => w.id));
  const fresh = sessions.filter((s) => !have.has(s.id));
  const workouts: Workout[] = [];
  const names = new Map<string, Resolution>();
  for (const s of fresh) {
    const r = toWorkout(s, library, names);
    workouts.push(r.workout);
    library = r.library;
  }
  const dates = workouts.map((w) => w.date).sort();
  const preview: ImportPreview = {
    source,
    needsUnit,
    first: dates[0],
    last: dates[dates.length - 1],
    workouts: workouts.length,
    sets: workouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + (e.sets ?? 0), 0), 0),
    already: sessions.length - fresh.length,
    skipped,
  };
  return { preview, workouts, library };
}

const day = (d: string) => format(parseISO(d), 'MMM d, yyyy');
export const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

// The preview shown before anything is saved
export function importSummary(p: ImportPreview): string {
  const lines = [
    p.workouts
      ? `${plural(p.workouts, 'workout')} and ${plural(p.sets, 'set')} from ${p.source}, ${p.first === p.last ? day(p.first!) : `${day(p.first!)} to ${day(p.last!)}`}.`
      : `No new workouts in this ${p.source} file.`,
  ];
  if (p.already) lines.push(`${plural(p.already, 'workout')} already in LiftText ${p.already === 1 ? 'is' : 'are'} left out.`);
  const skipped = Object.entries(p.skipped);
  if (skipped.length) lines.push(`Rows left out:\n${skipped.map(([why, n]) => `• ${why}: ${n}`).join('\n')}`);
  if (p.needsUnit && p.workouts) lines.push(`${p.source}'s file doesn't say kg or lb: pick the unit ${p.source} was set to.`);
  lines.push('The file stays on this phone.');
  return lines.join('\n\n');
}

// Opens the file picker; null when cancelled. The text stays on the phone.
export async function pickExport(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['text/csv', 'text/comma-separated-values', 'text/plain'] });
  if (picked.canceled) return null;
  return picked.result.text();
}
