// Exercise identity: turns the name on a logged exercise into a stable exerciseId, deterministically
// and without AI. Order: the user's own aliases, the catalog (and old exercise-list names), the
// user's custom exercises, then a guess that is marked unsure, then a new custom exercise.
// A name is never changed; only exerciseId and match are added.

import { v4 as uuidv4 } from 'uuid';
import { AMBIGUOUS_WORDS, CATALOG, LEGACY_NAMES, catalogById, exerciseKey, normalizeWords } from '../data/catalog';
import type { CustomExercise, Exercise, ExerciseLibrary, MuscleGroup, Workout } from '../types/workout';

export const emptyLibrary = (): ExerciseLibrary => ({ custom: [], renames: {}, aliases: {}, merged: {} });

// Catalog names, aliases and old exercise-list names → id. The catalog tests guarantee no clashes.
const catalogKeys = new Map<string, string>();
for (const e of CATALOG) for (const w of [e.name, ...e.aliases]) catalogKeys.set(exerciseKey(w), e.id);
for (const [name, id] of Object.entries(LEGACY_NAMES)) catalogKeys.set(exerciseKey(name), id);
const ambiguousKeys = new Map(Object.entries(AMBIGUOUS_WORDS).map(([w, ids]) => [exerciseKey(w), ids]));

// Names the old parser produced from words that can mean another exercise. When the log's own
// text points elsewhere, the match is unsure (the user confirms it later); otherwise it stands.
const LOSSY: Record<string, RegExp> = {
  'pull-up': /\b(chin|assist)/,
  'barbell-row': /\b(cable|seated|db|dumbbell|one arm|single arm|machine) rows?\b|\brow(ed|ing)\b|\berg\b/,
  'rowing-machine': /\brows\b/,
  'dumbbell-curl': /\b(bb|barbell|ez|cable|hammer|preacher) curls?\b/,
  'chest-dip': /\b(tricep|triceps|bench|assisted|machine) dips?\b/,
  'tricep-dip': /\bbench dips?\b/,
  'bulgarian-split-squat': /^(?!.*\b(bulgarian|bss|rfess|rear foot)).*\bsplit squat/,
  'hanging-leg-raise': /\b(knee raises?|lying leg raises?)\b/,
  'skull-crusher': /\bfrench press\b/,
  'dumbbell-overhead-tricep-extension': /\b(cable|rope|french press)\b/,
  'barbell-shrug': /\b(db|dumbbell|trap bar|hex bar) shrugs?\b/,
  'lying-leg-curl': /\bseated\b/,
  'dumbbell-lunge': /\b(bb|barbell|bodyweight|bw) lunges?\b/,
  'upright-row': /\b(db|dumbbell) upright\b/,
};

export interface Resolution {
  exerciseId: string;
  match: 'sure' | 'unsure';
  custom?: CustomExercise; // a new custom exercise to add to the library
}

// An id after merges and catalog retirements
export function resolveId(id: string, library: ExerciseLibrary): string {
  for (let hops = 0; hops < 10; hops++) {
    const next = library.merged[id] ?? catalogById.get(id)?.replacedBy;
    if (!next) break;
    id = next;
  }
  return id;
}

export function displayName(id: string, library: ExerciseLibrary): string | undefined {
  return library.renames[id] ?? catalogById.get(id)?.name ?? library.custom.find((c) => c.id === id)?.name;
}

// The catalog id a name means on its own, if it names exactly one catalog exercise
export const catalogIdFor = (name: string) => catalogKeys.get(exerciseKey(name));

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

// One typo in names of 5+ letters, two in 8+
function nearestCatalogId(key: string): string | undefined {
  const allowed = key.length >= 8 ? 2 : key.length >= 5 ? 1 : 0;
  let best: { id: string; d: number } | undefined;
  for (const [k, id] of catalogKeys) {
    const d = editDistance(key, k);
    if (d <= allowed && (!best || d < best.d)) best = { id, d };
  }
  return best?.id;
}

// Names that can't be an exercise: the offline fallback's slice of the whole log, the edit
// screen's placeholder
const looksLikeJunk = (name: string) => /\d/.test(name) || name.length > 40 || exerciseKey(name) === 'newexercise';

export function resolveExercise(name: string, muscleGroup: MuscleGroup, library: ExerciseLibrary, rawInput = ''): Resolution {
  const key = exerciseKey(name);
  const sure = (id: string): Resolution => ({ exerciseId: resolveId(id, library), match: 'sure' });
  const unsure = (id: string): Resolution => ({ exerciseId: resolveId(id, library), match: 'unsure' });

  if (key && library.aliases[key]) return sure(library.aliases[key]);

  const catalogId = key ? catalogKeys.get(key) : undefined;
  if (catalogId) return LOSSY[catalogId]?.test(normalizeWords(rawInput)) ? unsure(catalogId) : sure(catalogId);

  const ownId =
    library.custom.find((c) => exerciseKey(c.name) === key)?.id ??
    Object.keys(library.renames).find((id) => exerciseKey(library.renames[id]) === key);
  if (key && ownId) return sure(ownId);

  const ambiguous = ambiguousKeys.get(key);
  if (ambiguous) return unsure(ambiguous[0]);

  if (!looksLikeJunk(name)) {
    const near = key ? nearestCatalogId(key) : undefined;
    if (near) return unsure(near);
  }

  const custom: CustomExercise = {
    id: `custom-${uuidv4()}`,
    name: name.trim() || 'Exercise',
    muscleGroup,
    metric: muscleGroup === 'cardio' ? 'distance-time' : 'weight-reps',
    createdAt: new Date().toISOString(),
  };
  return { exerciseId: custom.id, match: looksLikeJunk(name) ? 'unsure' : 'sure', custom };
}

// Fills exerciseId and match on every exercise that lacks one. New custom exercises join the
// library, so the same unknown name used twice gets the same id.
export function withIdentity(workout: Workout, library: ExerciseLibrary): { workout: Workout; library: ExerciseLibrary } {
  let lib = library;
  const exercises = workout.exercises.map((e): Exercise => {
    if (e.exerciseId) return e;
    const r = resolveExercise(e.name, e.muscleGroup, lib, workout.rawInput);
    if (r.custom) lib = { ...lib, custom: [...lib.custom, r.custom] };
    return { ...e, exerciseId: r.exerciseId, match: r.match };
  });
  return { workout: { ...workout, exercises }, library: lib };
}

// Persisted store version 0 → 1: adds ids to every logged exercise. Only adds fields, never
// changes a name or a number, and skips anything that already has an id, so it can run twice.
export function migrateToV1<T extends { workouts?: Workout[]; exerciseLibrary?: ExerciseLibrary }>(state: T) {
  let library = state.exerciseLibrary ?? emptyLibrary();
  const workouts = (state.workouts ?? []).map((w) => {
    const r = withIdentity(w, library);
    library = r.library;
    return r.workout;
  });
  return { ...state, workouts, exerciseLibrary: library };
}

export interface PickerOption {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  count: number; // times the user has logged it; 0 for catalog entries they haven't
}

// The picker's list: the user's own exercises first (most logged first), then catalog matches.
// A query matches any word sequence in a name or catalog alias.
export function searchExercises(query: string, workouts: Workout[], library: ExerciseLibrary, limit = 50): PickerOption[] {
  const q = normalizeWords(query);
  const counts = new Map<string, number>();
  for (const e of workouts.flatMap((w) => w.exercises)) {
    const id = e.exerciseId && resolveId(e.exerciseId, library);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const c of library.custom) if (!library.merged[c.id] && !counts.has(c.id)) counts.set(c.id, 0);

  const option = (id: string): PickerOption | undefined => {
    const entry = catalogById.get(id);
    const custom = library.custom.find((c) => c.id === id);
    const muscleGroup = entry?.primary ?? custom?.muscleGroup;
    const name = displayName(id, library);
    return name && muscleGroup ? { exerciseId: id, name, muscleGroup, count: counts.get(id) ?? 0 } : undefined;
  };
  const matches = (id: string) =>
    !q || [displayName(id, library) ?? '', ...(catalogById.get(id)?.aliases ?? [])].some((w) => normalizeWords(w).includes(q));

  const yours = [...counts.keys()].filter(matches).sort((a, b) => counts.get(b)! - counts.get(a)!);
  const catalog = q ? CATALOG.filter((e) => !e.replacedBy && !counts.has(e.id) && matches(e.id)).map((e) => e.id) : [];
  return [...yours, ...catalog].slice(0, limit).flatMap((id) => option(id) ?? []);
}
