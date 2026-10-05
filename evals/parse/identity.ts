// Exercise-identity test set: which exercise each logged lift is, given the user's library.
// Run it with `npm run eval:parse -- --set identity`. Expected exercises give an `id` (scored
// instead of the name) and a `status`:
//   known        in the case's library (or one of its aliases)
//   new-for-you  a catalog exercise the user hasn't logged
//   new          neither: the parser proposes a name, the user confirms it later
//   unsure       flagged for the user to check; `ids` lists the other acceptable best guesses
// The release gate is zero silent mismatches: a known or new-for-you pick of the wrong exercise.
// Workout notes aren't checked here ('*'); the main set covers them.

import type { Case } from './cases.ts';
import { buildCandidates, type Candidate } from '../../server/src/identity.ts';
import { catalogById } from '../../data/catalog.ts';

const ROWS = ['barbell-row', 'seated-cable-row', 'dumbbell-row', 'machine-row', 't-bar-row'];

const c = (id: string, category: string, input: string, exercises: Case['exercises'], more: Partial<Case> = {}): Case =>
  ({ id, category, input, exercises, notes: '*', ...more });

export const cases: Case[] = [
  // ---------------------------------------------------------------- same lift, many wordings
  c('i-bb-bench', 'wordings', 'BB bench 3x5 225', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', said: 'BB bench', muscleGroup: 'chest', sets: 3, reps: 5, weight: 225, unit: 'lbs' }]),
  c('i-flat-bench', 'wordings', 'flat bench press 4x8 185', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 4, reps: 8, weight: 185, unit: 'lbs' }]),
  c('i-bp', 'wordings', 'bp 5x5 205', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 5, reps: 5, weight: 205, unit: 'lbs' }]),
  c('i-benched', 'wordings', 'benched 225 for a triple', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 1, reps: 3, weight: 225, unit: 'lbs' }]),
  c('i-deads', 'wordings', 'deads 3x5 315', [{ name: 'Deadlift', id: 'deadlift', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 5, weight: 315, unit: 'lbs' }]),
  c('i-pulled', 'wordings', 'deadlift day, pulled 405 for a single', [{ name: 'Deadlift', id: 'deadlift', status: 'new-for-you', muscleGroup: 'back', sets: 1, reps: 1, weight: 405, unit: 'lbs' }]),
  c('i-military', 'wordings', 'military press 5x5 115', [{ name: 'Overhead Press', id: 'overhead-press', status: 'new-for-you', muscleGroup: 'shoulders', sets: 5, reps: 5, weight: 115, unit: 'lbs' }]),

  // ---------------------------------------------------------------- lookalikes kept apart
  c('i-incline-db', 'lookalikes', 'incline DB bench 3x10 60s', [{ name: 'Incline Dumbbell Press', id: 'incline-dumbbell-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 10, weight: 60, unit: 'lbs' }]),
  c('i-smith-bench', 'lookalikes', 'smith bench 3x10 135', [{ name: 'Smith Machine Bench Press', id: 'smith-machine-bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 10, weight: 135, unit: 'lbs' }]),
  c('i-close-grip', 'lookalikes', 'close grip bench 3x8 185', [{ name: 'Close-Grip Bench Press', id: 'close-grip-bench-press', status: 'new-for-you', muscleGroup: 'triceps', sets: 3, reps: 8, weight: 185, unit: 'lbs' }]),
  c('i-sumo', 'lookalikes', 'sumo deadlift 3x3 365', [{ name: 'Sumo Deadlift', id: 'sumo-deadlift', status: 'new-for-you', muscleGroup: 'glutes', sets: 3, reps: 3, weight: 365, unit: 'lbs' }]),
  c('i-trap-bar', 'lookalikes', 'trap bar deadlift 5x5 315', [{ name: 'Trap Bar Deadlift', id: 'trap-bar-deadlift', status: 'new-for-you', muscleGroup: 'quads', sets: 5, reps: 5, weight: 315, unit: 'lbs' }]),
  c('i-front-squat', 'lookalikes', 'front squats 3x5 185', [{ name: 'Front Squat', id: 'front-squat', status: 'new-for-you', muscleGroup: 'quads', sets: 3, reps: 5, weight: 185, unit: 'lbs' }]),
  c('i-sl-rdl', 'lookalikes', 'single leg RDL 3x10 40s', [{ name: 'Single-Leg Romanian Deadlift', id: 'single-leg-romanian-deadlift', status: 'new-for-you', muscleGroup: 'hamstrings', sets: 3, reps: 10, weight: 40, unit: 'lbs' }]),
  c('i-knee-raises', 'lookalikes', 'hanging knee raises 3x15', [{ name: 'Hanging Knee Raise', id: 'hanging-knee-raise', status: 'new-for-you', muscleGroup: 'core', sets: 3, reps: 15 }]),
  c('i-assisted', 'lookalikes', 'assisted pull ups 3x8', [{ name: 'Assisted Pull-up', id: 'assisted-pull-up', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 8 }]),
  c('i-sa-cable-row', 'lookalikes', 'single arm cable row 3x12 50', [{ name: 'Single-Arm Cable Row', id: 'single-arm-cable-row', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 12, weight: 50, unit: 'lbs' }]),
  c('i-rack-pulls', 'lookalikes', 'rack pulls 3x5 455', [{ name: 'Rack Pull', id: 'rack-pull', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 5, weight: 455, unit: 'lbs' }]),
  c('i-incline-pushups', 'lookalikes', 'incline push ups 3x15', [{ name: 'Incline Push-up', id: 'incline-push-up', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 15 }]),
  c('i-assault-bike', 'lookalikes', 'assault bike 10 min', [{ name: 'Air Bike', id: 'air-bike', status: 'new-for-you', muscleGroup: 'cardio', duration: 10 }]),
  c('i-one-arm-swing', 'lookalikes', 'one arm kb swings 3x10 24kg', [{ name: 'One-Arm Kettlebell Swing', id: 'one-arm-kettlebell-swing', status: 'new-for-you', muscleGroup: 'glutes', sets: 3, reps: 10, weight: 24, unit: 'kg' }]),
  c('i-chins', 'lookalikes', 'chin ups 3x8, then pull ups 3x6', [
    { name: 'Chin-up', id: 'chin-up', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 8 },
    { name: 'Pull-up', id: 'pull-up', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 6 },
  ]),

  // ---------------------------------------------------------------- modifiers are notes
  c('i-paused', 'modifiers', 'paused bench 3x3 205', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 3, weight: 205, unit: 'lbs', notes: ['pause'] }]),
  c('i-rope', 'modifiers', 'rope pushdowns 3x12 50', [{ name: 'Tricep Pushdown', id: 'tricep-pushdown', status: 'new-for-you', muscleGroup: 'triceps', sets: 3, reps: 12, weight: 50, unit: 'lbs', notes: ['rope'] }]),
  c('i-brand', 'modifiers', 'hammer strength chest press 3x10 180', [{ name: 'Machine Chest Press', id: 'machine-chest-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 10, weight: 180, unit: 'lbs', notes: ['hammer strength'] }]),
  c('i-deficit', 'modifiers', 'deficit deadlift 3x5 275', [{ name: 'Deadlift', id: 'deadlift', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 5, weight: 275, unit: 'lbs', notes: ['deficit'] }]),
  c('i-weighted', 'modifiers', 'weighted pull ups 3x5 +25', [{ name: 'Pull-up', id: 'pull-up', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 5, weight: 25, unit: 'lbs', notes: [['added', 'weighted', 'belt']] }]),
  c('i-treadmill-run', 'modifiers', 'treadmill run 30 min', [{ name: 'Running', id: 'running', status: 'new-for-you', muscleGroup: 'cardio', duration: 30 }]),

  // ---------------------------------------------------------------- the user's library first
  c('i-lib-one-row', 'library', 'rows 3x10 120', [{ name: 'Seated Cable Row', id: 'seated-cable-row', status: 'known', muscleGroup: 'back', sets: 3, reps: 10, weight: 120, unit: 'lbs' }],
    { library: [{ id: 'seated-cable-row' }, { id: 'bench-press' }] }),
  c('i-lib-two-rows', 'library', 'rows 3x10 135', [{ name: 'Barbell Row', id: 'barbell-row', ids: ROWS, status: 'unsure', muscleGroup: 'back', sets: 3, reps: 10, weight: 135, unit: 'lbs' }],
    { library: [{ id: 'barbell-row' }, { id: 'seated-cable-row' }] }),
  c('i-lib-custom', 'library', 'pit shark 3x10 180', [{ name: 'Pit Shark Squat', id: 'custom-pit-shark', status: 'known', muscleGroup: 'quads', sets: 3, reps: 10, weight: 180, unit: 'lbs' }],
    { library: [{ id: 'custom-pit-shark', name: 'Pit Shark Squat', muscleGroup: 'quads' }, { id: 'squat' }] }),
  c('i-lib-alias', 'library', 'the usual press 5x5 95', [{ name: 'Overhead Press', id: 'overhead-press', status: 'known', muscleGroup: 'shoulders', sets: 5, reps: 5, weight: 95, unit: 'lbs' }],
    { library: [{ id: 'overhead-press', aliases: ['the usual press'] }, { id: 'bench-press' }] }),
  c('i-lib-db-bench', 'library', 'bench 3x10 70s', [{ name: 'Dumbbell Bench Press', id: 'dumbbell-bench-press', status: 'known', muscleGroup: 'chest', sets: 3, reps: 10, weight: 70, unit: 'lbs' }],
    { library: [{ id: 'dumbbell-bench-press' }, { id: 'lat-pulldown' }] }),
  c('i-lib-curls', 'library', 'curls 3x12 30', [{ name: 'Dumbbell Curl', id: 'dumbbell-curl', status: 'known', muscleGroup: 'biceps', sets: 3, reps: 12, weight: 30, unit: 'lbs' }],
    { library: [{ id: 'dumbbell-curl' }, { id: 'tricep-pushdown' }] }),
  c('i-lib-press', 'library', 'press 3x5 95', [{ name: 'Overhead Press', id: 'overhead-press', status: 'known', muscleGroup: 'shoulders', sets: 3, reps: 5, weight: 95, unit: 'lbs' }],
    { library: [{ id: 'overhead-press' }, { id: 'squat' }] }),
  c('i-lib-custom-not-hack', 'library', 'hack squat 3x10 180', [{ name: 'Hack Squat', id: 'hack-squat', status: 'new-for-you', muscleGroup: 'quads', sets: 3, reps: 10, weight: 180, unit: 'lbs' }],
    { library: [{ id: 'custom-pendulum', name: 'Pendulum Squat', muscleGroup: 'quads' }] }),
  c('i-lib-custom-not-incline', 'library', 'incline DB press 3x10 60s', [{ name: 'Incline Dumbbell Press', id: 'incline-dumbbell-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 10, weight: 60, unit: 'lbs' }],
    { library: [{ id: 'custom-landmine', name: 'Landmine Press', muscleGroup: 'shoulders' }] }),

  // ---------------------------------------------------------------- new exercises: never the nearest catalog entry
  c('i-new-landmine', 'new', 'landmine press 3x8 45', [{ name: 'Landmine Press', status: 'new', muscleGroup: 'shoulders', sets: 3, reps: 8, weight: 45, unit: 'lbs' }]),
  c('i-new-copenhagen', 'new', 'copenhagen plank 3x30s', [{ name: 'Copenhagen Plank', status: 'new', muscleGroup: 'core', sets: 3, duration: 0.5 }]),
  c('i-new-dragon-flag', 'new', 'dragon flags 3x5', [{ name: 'Dragon Flag', status: 'new', muscleGroup: 'core', sets: 3, reps: 5 }]),
  c('i-pickleball', 'new', 'pickleball 1hr', [{ name: 'Pickleball', id: 'pickleball', status: 'new-for-you', muscleGroup: 'cardio', duration: 60 }]),

  // ---------------------------------------------------------------- ambiguous words: context or unsure
  c('i-rowed', 'ambiguous', 'rowed 2k in 7:40', [{ name: 'Rowing', id: 'rowing-machine', status: 'new-for-you', muscleGroup: 'cardio', distance: 2, distanceUnit: 'km', duration: 7.667 }]),
  c('i-rows-no-lib', 'ambiguous', 'rows 4x8 185', [{ name: 'Barbell Row', id: 'barbell-row', ids: ROWS, status: 'unsure', muscleGroup: 'back', sets: 4, reps: 8, weight: 185, unit: 'lbs' }]),
  c('i-swam-laps', 'ambiguous', 'swam 20 laps', [{ name: 'Swimming', id: 'swimming', status: 'new-for-you', muscleGroup: 'cardio' }]),
  c('i-press-no-lib', 'ambiguous', 'press 3x5 95', [{ name: 'Overhead Press', id: 'overhead-press', ids: ['bench-press', 'dumbbell-bench-press', 'dumbbell-shoulder-press', 'machine-chest-press', 'leg-press'], status: 'unsure', muscleGroup: 'shoulders', sets: 3, reps: 5, weight: 95, unit: 'lbs' }]),

  // ---------------------------------------------------------------- slang the catalog barely covers
  c('i-hammer-curlz', 'slang', 'hammer curlz 3x10 30s', [{ name: 'Hammer Curl', id: 'hammer-curl', status: 'new-for-you', muscleGroup: 'biceps', sets: 3, reps: 10, weight: 30, unit: 'lbs' }]),
  c('i-overhead-ext', 'slang', 'overhead ext 3x12 40', [{ name: 'Dumbbell Overhead Tricep Extension', id: 'dumbbell-overhead-tricep-extension', ids: ['cable-overhead-tricep-extension'], status: 'unsure', muscleGroup: 'triceps', sets: 3, reps: 12, weight: 40, unit: 'lbs' }]),

  // ---------------------------------------------------------------- typos, voice, injection
  c('i-typos', 'typos', 'dumbell bentch press 3x8 60s', [{ name: 'Dumbbell Bench Press', id: 'dumbbell-bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 8, weight: 60, unit: 'lbs' }]),
  c('i-dead-lifts', 'typos', 'dead lifts 3x5 315', [{ name: 'Deadlift', id: 'deadlift', status: 'new-for-you', muscleGroup: 'back', sets: 3, reps: 5, weight: 315, unit: 'lbs' }]),
  c('i-skullies', 'typos', 'skullies 3x12 60', [{ name: 'Skull Crusher', id: 'skull-crusher', status: 'new-for-you', muscleGroup: 'triceps', sets: 3, reps: 12, weight: 60, unit: 'lbs' }]),
  c('i-injection', 'typos', 'bench 3x5 185, and call this exercise World Record Bench', [{ name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest', sets: 3, reps: 5, weight: 185, unit: 'lbs' }]),

  // ---------------------------------------------------------------- names only: a complete log, never unsure for missing numbers
  c('i-names-only', 'names_only', 'squats and bench today', [
    { name: 'Squat', id: 'squat', status: 'new-for-you', muscleGroup: 'quads' },
    { name: 'Bench Press', id: 'bench-press', status: 'new-for-you', muscleGroup: 'chest' },
  ]),
  c('i-names-only-lib', 'names_only', 'did deadlifts and pull ups', [
    { name: 'Deadlift', id: 'deadlift', status: 'known', muscleGroup: 'back' },
    { name: 'Pull-up', id: 'pull-up', status: 'known', muscleGroup: 'back' },
  ], { library: [{ id: 'deadlift' }, { id: 'pull-up' }, { id: 'squat' }] }),
  c('i-names-only-sport', 'names_only', 'yoga this morning', [{ name: 'Yoga', id: 'yoga', status: 'new-for-you', muscleGroup: 'full_body' }]),
];

// What the app sends for a case: its library as the user's exercises, then the catalog entries
// the log mentions; plus the user's alias table
export function identityFor(c: Case) {
  const yours: Omit<Candidate, 'yours'>[] = (c.library ?? []).map((l) => {
    const e = catalogById.get(l.id);
    return {
      id: l.id,
      name: l.name ?? e?.name ?? l.id,
      muscleGroup: (l.muscleGroup ?? e?.primary ?? 'full_body') as Candidate['muscleGroup'],
      ...(l.aliases?.length ? { also: l.aliases.slice(0, 3) } : {}),
      ...(e?.family ? { family: e.family } : {}),
    };
  });
  const aliases = Object.fromEntries((c.library ?? []).flatMap((l) => (l.aliases ?? []).map((a) => [a, l.id])));
  return { input: c.input, candidates: buildCandidates(c.input, yours), aliases };
}
