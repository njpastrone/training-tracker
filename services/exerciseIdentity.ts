// Exercise identity: turns the name on a logged exercise into a stable exerciseId, deterministically
// and without AI. Order: the user's own aliases, the catalog (and old exercise-list names), the
// user's custom exercises, then a guess that is marked unsure, then a new custom exercise.
// A name is never changed; only exerciseId and match are added.

import { v4 as uuidv4 } from 'uuid';
import { AMBIGUOUS_WORDS, CATALOG, LEGACY_NAMES, catalogById, exerciseKey, normalizeWords } from '../data/catalog';
import { aliasFor, exerciseWords, fitsPrompt, saidInLog, type Candidate } from '../server/src/identity';
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

// The name an id had before any merge, for "merged in" lists
export const ownName = (id: string, library: ExerciseLibrary): string | undefined =>
  library.renames[id] ?? catalogById.get(id)?.name ?? library.custom.find((c) => c.id === id)?.name;

export const displayName = (id: string, library: ExerciseLibrary) => ownName(resolveId(id, library), library);

// The catalog id a name means on its own, if it names exactly one catalog exercise
export const catalogIdFor = (name: string) => catalogKeys.get(exerciseKey(name));

const ownIdFor = (key: string, library: ExerciseLibrary) =>
  library.custom.find((c) => exerciseKey(c.name) === key)?.id ??
  Object.keys(library.renames).find((id) => exerciseKey(library.renames[id]) === key);

// The id a name surely means: one of your aliases, a catalog name, or one of your exercises
export function knownIdFor(name: string, library: ExerciseLibrary): string | undefined {
  const key = exerciseKey(name);
  const id = key ? aliasFor(name, library.aliases) ?? catalogKeys.get(key) ?? ownIdFor(key, library) : undefined;
  return id && resolveId(id, library);
}

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

  const aliasId = aliasFor(name, library.aliases);
  if (aliasId) return sure(aliasId);

  const catalogId = key ? catalogKeys.get(key) : undefined;
  if (catalogId) return LOSSY[catalogId]?.test(normalizeWords(rawInput)) ? unsure(catalogId) : sure(catalogId);

  const ownId = key ? ownIdFor(key, library) : undefined;
  if (ownId) return sure(ownId);

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
    // The parser may already have flagged a new exercise (its words weren't in the log)
    return { ...e, exerciseId: r.exerciseId, match: e.match === 'unsure' ? 'unsure' : r.match };
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

// Times the user has logged each exercise; their custom exercises count even at 0
function loggedCounts(workouts: Workout[], library: ExerciseLibrary) {
  const counts = new Map<string, number>();
  for (const e of workouts.flatMap((w) => w.exercises)) {
    const id = e.exerciseId && resolveId(e.exerciseId, library);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const c of library.custom) if (!library.merged[c.id] && !counts.has(c.id)) counts.set(c.id, 0);
  return counts;
}

function pickerOption(id: string, counts: Map<string, number>, library: ExerciseLibrary): PickerOption | undefined {
  const entry = catalogById.get(id);
  const custom = library.custom.find((c) => c.id === id);
  const muscleGroup = entry?.primary ?? custom?.muscleGroup;
  const name = displayName(id, library);
  return name && muscleGroup ? { exerciseId: id, name, muscleGroup, count: counts.get(id) ?? 0 } : undefined;
}

// The picker's list: the user's own exercises first (most logged first), then catalog matches.
// A query matches any word sequence in a name or catalog alias, or names an exercise outright.
export function searchExercises(query: string, workouts: Workout[], library: ExerciseLibrary, limit = 50): PickerOption[] {
  const q = normalizeWords(query);
  const counts = loggedCounts(workouts, library);
  const matches = (id: string) =>
    !q || [displayName(id, library) ?? '', ...(catalogById.get(id)?.aliases ?? [])].some((w) => normalizeWords(w).includes(q));

  const yours = [...counts.keys()].filter(matches).sort((a, b) => counts.get(b)! - counts.get(a)!);
  const catalog = q ? CATALOG.filter((e) => !e.replacedBy && !library.merged[e.id] && !counts.has(e.id) && matches(e.id)).map((e) => e.id) : [];
  const known = knownIdFor(query, library);
  const ids = known && !yours.includes(known) && !catalog.includes(known) ? [known, ...yours, ...catalog] : [...yours, ...catalog];
  return ids.slice(0, limit).flatMap((id) => pickerOption(id, counts, library) ?? []);
}

// The few exercises an unsure entry most likely is, offered first in the picker: the parse's guess,
// its second choice, the exercises its words can mean (the ones you log most first), then search hits
export function likelyExercises(
  e: { name: string; exerciseId?: string; alt?: string; said?: string },
  workouts: Workout[],
  library: ExerciseLibrary,
  limit = 3,
): PickerOption[] {
  const words = (e.said && exerciseWords(e.said)) || e.name;
  const counts = loggedCounts(workouts, library);
  const meanings = [...(ambiguousKeys.get(exerciseKey(words)) ?? [])].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const ids = [e.exerciseId, e.alt, ...meanings].flatMap((id) => (id ? [resolveId(id, library)] : []));
  const options = [...new Set(ids)].flatMap((id) => pickerOption(id, counts, library) ?? []);
  const more = searchExercises(words, workouts, library, limit).filter((o) => !options.some((x) => x.exerciseId === o.exerciseId));
  return [...options, ...more].slice(0, limit);
}

// The user's exercises for the parser's candidate list, most recently logged first, each with up
// to 3 of their own alias wordings. Exercises still unsure aren't the user's yet.
export function yourExercises(workouts: Workout[], library: ExerciseLibrary): Omit<Candidate, 'yours'>[] {
  const seen = new Map<string, Omit<Candidate, 'yours'>>();
  for (const w of [...workouts].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const e of w.exercises) {
      const id = e.exerciseId && e.match !== 'unsure' ? resolveId(e.exerciseId, library) : undefined;
      if (!id || seen.has(id)) continue;
      const entry = catalogById.get(id);
      const also = Object.entries(library.aliases).filter(([, a]) => resolveId(a, library) === id).map(([words]) => words).slice(0, 3);
      seen.set(id, {
        id,
        name: displayName(id, library) ?? e.name,
        muscleGroup: entry?.primary ?? library.custom.find((c) => c.id === id)?.muscleGroup ?? e.muscleGroup,
        ...(also.length ? { also } : {}),
        ...(entry?.family ? { family: entry.family } : {}),
      });
    }
  }
  return [...seen.values()];
}

export const sentenceCase = (words: string) => words.charAt(0).toUpperCase() + words.slice(1);

// Offer to call a catalog exercise by the user's words only when they typed them, it isn't
// already called that, and the words don't mean another exercise
export function offersName(words: string, exerciseId: string, fix: string, library: ExerciseLibrary) {
  const id = resolveId(exerciseId, library);
  const known = knownIdFor(words, library);
  return catalogById.has(id) && fitsPrompt(words) && saidInLog(words, fix) &&
    (known ? known === id : !ambiguousKeys.has(exerciseKey(words))) &&
    exerciseKey(words) !== exerciseKey(displayName(id, library) ?? '');
}

// "Call it 'Machine flys' from now on": the words become its display name and an alias, so later
// logs pick it by those words and cards show them
export function rememberName(library: ExerciseLibrary, exerciseId: string, words: string): ExerciseLibrary {
  const id = resolveId(exerciseId, library);
  return {
    ...library,
    renames: { ...library.renames, [id]: sentenceCase(words.trim()) },
    aliases: { ...library.aliases, [normalizeWords(words)]: id },
  };
}

// How an exercise reads on a card: the user's own name for it when they have one (a remembered name,
// or the words they logged that their aliases map to it), with the catalog name as secondary when it
// differs. Otherwise the name it was logged under.
export function shownName(e: Pick<Exercise, 'name' | 'exerciseId' | 'said'>, library: ExerciseLibrary): { name: string; catalog?: string } {
  const id = e.exerciseId && resolveId(e.exerciseId, library);
  const entry = id ? catalogById.get(id) : undefined;
  const said = e.said ? exerciseWords(e.said) : '';
  const own = id && (library.renames[id] ?? (said && resolveId(aliasFor(said, library.aliases) ?? '', library) === id ? sentenceCase(said) : undefined));
  if (!entry) return { name: (id && library.renames[id]) || e.name }; // your own exercise, renamed
  if (!own) return { name: e.name };
  return { name: own, ...(exerciseKey(own) !== exerciseKey(entry.name) ? { catalog: entry.name } : {}) };
}

// The words a pick is remembered by: what the user typed for the exercise, without its numbers. None
// when there are no such words or they already name a catalog exercise, so a pick never redefines one.
export function pickWords(said?: string): string | undefined {
  const words = said ? exerciseWords(said) : '';
  return words && fitsPrompt(words) && !catalogIdFor(words) ? words : undefined;
}

// A pick from the picker: the user's words now mean that exercise, so later logs pick it by them. It
// replaces any alias the same words had, so an alias never belongs to two exercises.
export function rememberPick(library: ExerciseLibrary, words: string, exerciseId: string): ExerciseLibrary {
  const key = exerciseKey(words);
  const others = Object.entries(library.aliases).filter(([w]) => exerciseKey(w) !== key);
  return { ...library, aliases: { ...Object.fromEntries(others), [normalizeWords(words)]: resolveId(exerciseId, library) } };
}

// Undo of rememberPick: the words get back the alias they had in `before`, or none
export function forgetPick(library: ExerciseLibrary, words: string, before: ExerciseLibrary): ExerciseLibrary {
  const key = exerciseKey(words);
  const others = Object.entries(library.aliases).filter(([w]) => exerciseKey(w) !== key);
  const had = Object.entries(before.aliases).filter(([w]) => exerciseKey(w) === key);
  return { ...library, aliases: Object.fromEntries([...others, ...had]) };
}

// Aliases with merged ids followed, for the parser: it only knows the user's exercises by their current ids
export const liveAliases = (library: ExerciseLibrary) =>
  Object.fromEntries(Object.entries(library.aliases).map(([words, id]) => [words, resolveId(id, library)]));

// The user's words for an exercise (an alias now means it)
export const aliasesOf = (exerciseId: string, library: ExerciseLibrary) =>
  Object.keys(library.aliases).filter((w) => resolveId(library.aliases[w], library) === exerciseId);

export const removeAlias = (library: ExerciseLibrary, words: string): ExerciseLibrary => ({
  ...library,
  aliases: Object.fromEntries(Object.entries(library.aliases).filter(([w]) => w !== words)),
});

// A new display name only: the id stays, so every log, chart, PR and goal keeps it. Empty or its
// own catalog name clears the rename.
export function renameExercise(library: ExerciseLibrary, exerciseId: string, name: string): ExerciseLibrary {
  const { [exerciseId]: _, ...renames } = library.renames;
  const base = catalogById.get(exerciseId)?.name ?? library.custom.find((c) => c.id === exerciseId)?.name;
  const keep = name.trim() && name.trim() !== base;
  return { ...library, renames: keep ? { ...renames, [exerciseId]: name.trim() } : renames };
}

// Every log of `from` (and its aliases and anything merged into it) now resolves to `into`. Only
// the merge is recorded, never the logs rewritten, so unmerge puts everything back.
export function mergeExercise(library: ExerciseLibrary, from: string, into: string): ExerciseLibrary {
  const target = resolveId(into, library);
  if (target === from) return library;
  return { ...library, merged: { ...library.merged, [from]: target } };
}

export function unmergeExercise(library: ExerciseLibrary, from: string): ExerciseLibrary {
  const { [from]: _, ...merged } = library.merged;
  return { ...library, merged };
}

// Exercises merged straight into this one, for its screen's Undo
export const mergedInto = (exerciseId: string, library: ExerciseLibrary) =>
  Object.keys(library.merged).filter((from) => library.merged[from] === exerciseId);

// What the user wrote for one log: their words without numbers, else the name it was logged under
const wordingOf = (e: Exercise) => (e.said && exerciseWords(e.said)) || normalizeWords(e.name);

// An exercise's logs grouped by what the user wrote ("incline bench" ×5, "bench" ×40), most first
export function wordings(workouts: Workout[], exerciseId: string, library: ExerciseLibrary): { words: string; count: number }[] {
  const groups = new Map<string, { words: string; count: number }>();
  for (const e of workouts.flatMap((w) => w.exercises)) {
    if (!e.exerciseId || resolveId(e.exerciseId, library) !== exerciseId) continue;
    const words = wordingOf(e);
    const g = groups.get(exerciseKey(words)) ?? { words, count: 0 };
    g.count++;
    groups.set(exerciseKey(words), g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export interface Split {
  moved: { workoutId: string; entryId: string; exerciseId: string }[]; // each log's id before
  words: string;
  before: ExerciseLibrary;
}

// Moves the logs of `from` written as `words` to `into`. The words then mean `into`, unless they
// name a catalog exercise (a split never redefines one); then an alias of theirs for `from` goes.
export function splitExercise(workouts: Workout[], library: ExerciseLibrary, from: string, words: string, into: string) {
  const key = exerciseKey(words);
  const target = resolveId(into, library);
  const hit = (e: Exercise) => target !== from && !!e.exerciseId && resolveId(e.exerciseId, library) === from && exerciseKey(wordingOf(e)) === key;
  const moved: Split['moved'] = [];
  const next = workouts.map((w) => {
    if (!w.exercises.some(hit)) return w;
    return {
      ...w,
      exercises: w.exercises.map((e) => {
        if (!hit(e)) return e;
        moved.push({ workoutId: w.id, entryId: e.id, exerciseId: e.exerciseId! });
        return { ...e, exerciseId: target };
      }),
    };
  });
  const alias = Object.keys(library.aliases).find((w) => exerciseKey(w) === key && resolveId(library.aliases[w], library) === from);
  const lib = !moved.length ? library : pickWords(words) ? rememberPick(library, words, target) : alias ? removeAlias(library, alias) : library;
  return { workouts: next, library: lib, split: { moved, words, before: library } as Split };
}

// Undo of splitExercise: each moved log goes back to the id it had; the words get back their alias
export function unsplitExercise(workouts: Workout[], library: ExerciseLibrary, { moved, words, before }: Split) {
  const was = new Map(moved.map((m) => [`${m.workoutId}/${m.entryId}`, m.exerciseId]));
  const next = workouts.map((w) =>
    w.exercises.some((e) => was.has(`${w.id}/${e.id}`))
      ? { ...w, exercises: w.exercises.map((e) => (was.has(`${w.id}/${e.id}`) ? { ...e, exerciseId: was.get(`${w.id}/${e.id}`) } : e)) }
      : w,
  );
  return { workouts: next, library: forgetPick(library, words, before) };
}
