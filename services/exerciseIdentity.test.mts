/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Exercise } from '../types/workout';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

// A version-0 blob as the app stored it before exercise ids: names from the old prompt, the
// offline fallback, the edit screen and the user's own wording; kg and lb; a multi-day log.
const ex = (id: string, name: string, more: Partial<Exercise> = {}): Exercise => ({ id, name, muscleGroup: 'chest', ...more });
const V0 = {
  state: {
    workouts: [
      { id: 'w1', date: '2026-10-03', rawInput: 'bench 3x5 225, chins 3x8', muscleGroups: ['chest', 'back'], createdAt: 't',
        exercises: [ex('e1', 'Bench Press', { sets: 3, reps: 5, weight: 225, unit: 'lbs' }), ex('e2', 'Pull-ups', { muscleGroup: 'back', sets: 3, reps: 8 })] },
      { id: 'w2', date: '2026-10-02', rawInput: 'pull ups 3x10 then landmine press 3x8 40kg', muscleGroups: ['back'], createdAt: 't',
        exercises: [ex('e3', 'Pull-ups', { muscleGroup: 'back', sets: 3, reps: 10 }), ex('e4', 'Landmine Press', { muscleGroup: 'shoulders', sets: 3, reps: 8, weight: 40, unit: 'kg' })] },
      { id: 'w3', date: '2026-10-01', rawInput: 'landmine press again, squats 100kg 5x5', muscleGroups: ['quads'], createdAt: 't',
        exercises: [ex('e5', 'Landmine Press', { muscleGroup: 'shoulders' }), ex('e6', 'Squats', { muscleGroup: 'quads', sets: 5, reps: 5, weight: 100, unit: 'kg' })] },
      { id: 'w4', date: '2026-09-30', rawInput: 'bench 3x5 225, rows 3x8 185 (no internet)', muscleGroups: ['full_body'], createdAt: 't',
        exercises: [ex('e7', 'bench 3x5 225, rows 3x8 185 (no internet)', { muscleGroup: 'full_body' })] },
      { id: 'w5', date: '2026-09-29', rawInput: 'bench', muscleGroups: ['chest'], createdAt: 't',
        exercises: [ex('e8', 'New Exercise', { muscleGroup: 'full_body' }), ex('e9', 'Bench Pres', { sets: 1, reps: 1, weight: 100, unit: 'kg' })] },
      { id: 'w6', date: '2026-09-28', rawInput: 'rows 3x8 185', muscleGroups: ['cardio'], createdAt: 't',
        exercises: [ex('e10', 'Rowing', { muscleGroup: 'cardio', sets: 3, reps: 8, weight: 185, unit: 'lbs' })] },
    ],
    settings: { weightUnit: 'lbs' },
  },
  version: 0,
};
const raw = JSON.stringify(V0);
mem.set('@training-tracker/storage', raw);

const { useWorkoutStore } = await import('../stores/workoutStore');
const { resolveExercise, emptyLibrary, migrateToV1, withIdentity, searchExercises } = await import('./exerciseIdentity');

test('updating the app migrates stored workouts to version 1 after a byte-identical backup', async () => {
  await useWorkoutStore.persist.rehydrate();
  assert.equal(mem.get('@training-tracker/storage.v0-backup'), raw);

  const stored = JSON.parse(mem.get('@training-tracker/storage')!);
  assert.equal(stored.version, 1);
  const byId = Object.fromEntries(stored.state.workouts.flatMap((w: any) => w.exercises).map((e: any) => [e.id, e]));
  const got = (id: string) => [byId[id].exerciseId, byId[id].match];

  assert.deepEqual(got('e1'), ['bench-press', 'sure']);
  assert.deepEqual(got('e2'), ['pull-up', 'unsure']); // the log said "chins"
  assert.deepEqual(got('e3'), ['pull-up', 'sure']);
  assert.equal(byId.e4.match, 'sure');
  assert.match(byId.e4.exerciseId, /^custom-/);
  assert.equal(byId.e5.exerciseId, byId.e4.exerciseId); // same name, same custom exercise
  assert.deepEqual(got('e6'), ['squat', 'sure']);
  assert.equal(byId.e7.match, 'unsure'); // fallback junk
  assert.equal(byId.e8.match, 'unsure'); // edit-screen placeholder
  assert.deepEqual(got('e9'), ['bench-press', 'unsure']); // near spelling
  assert.deepEqual(got('e10'), ['rowing-machine', 'unsure']); // "rows" snapped onto Rowing by the old alias

  const library = stored.state.exerciseLibrary;
  assert.deepEqual(library.custom.map((c: any) => c.name).sort(), ['Landmine Press', 'New Exercise', 'bench 3x5 225, rows 3x8 185 (no internet)']);

  // Names and numbers are untouched: removing the added fields gives back the original workouts
  const stripped = stored.state.workouts.map((w: any) => ({
    ...w, exercises: w.exercises.map(({ exerciseId, match, ...e }: any) => e),
  }));
  assert.deepEqual(stripped, V0.state.workouts);
  assert.deepEqual(stored.state.settings, V0.state.settings);
});

test('migrating twice gives the same ids', () => {
  const once = migrateToV1(V0.state as any);
  assert.deepEqual(migrateToV1(once), once);
});

test('new logs get ids when saved, through the same resolver', () => {
  const before = useWorkoutStore.getState().exerciseLibrary.custom.length;
  useWorkoutStore.getState().addWorkout({
    id: 'n1', date: '2026-10-04', rawInput: 'landmine press 3x8, hammer curls 3x12, jefferson curl 3x5', muscleGroups: ['shoulders'], createdAt: 't',
    exercises: [ex('n1a', 'Landmine Press', { muscleGroup: 'shoulders' }), ex('n1b', 'Hammer Curls', { muscleGroup: 'biceps' }), ex('n1c', 'Jefferson Curl', { muscleGroup: 'back' })],
  });
  const saved = useWorkoutStore.getState().workouts.find((w) => w.id === 'n1')!.exercises;
  const custom = useWorkoutStore.getState().exerciseLibrary.custom;
  assert.equal(saved[0].exerciseId, custom.find((c) => c.name === 'Landmine Press')!.id);
  assert.deepEqual([saved[1].exerciseId, saved[1].match], ['hammer-curl', 'sure']);
  assert.equal(custom.length, before + 1); // only Jefferson Curl is new
  assert.equal(saved[2].exerciseId, custom.at(-1)!.id);
});

test('an exercise picked on the edit screen keeps its id', () => {
  useWorkoutStore.getState().updateWorkout('n1', {
    exercises: [ex('n1a', 'Bench', { exerciseId: 'incline-bench-press', match: 'sure' })],
  });
  const [e] = useWorkoutStore.getState().workouts.find((w) => w.id === 'n1')!.exercises;
  assert.deepEqual([e.exerciseId, e.match], ['incline-bench-press', 'sure']);
});

test('the resolver order: user alias, catalog, custom, ambiguous guess, near spelling, new', () => {
  const lib = { ...emptyLibrary(), aliases: { 'the usual press': 'overhead-press' }, custom: [{ id: 'custom-x', name: 'Pendulum Thing', muscleGroup: 'quads' as const, metric: 'weight-reps' as const, createdAt: 't' }] };
  const r = (name: string, rawInput = '') => {
    const { exerciseId, match } = resolveExercise(name, 'chest', lib, rawInput);
    return `${exerciseId} ${match}`;
  };
  assert.equal(r('The usual press'), 'overhead-press sure');
  assert.equal(r('Chin-ups'), 'chin-up sure');
  assert.equal(r('Pull-ups', 'did chin ups'), 'pull-up unsure');
  assert.equal(r('pendulum thing'), 'custom-x sure');
  assert.equal(r('Rows'), 'barbell-row unsure'); // ambiguous: never a confident pick
  assert.equal(r('Deadlfit'), 'deadlift unsure');
  assert.equal(r('Bulgarian Split Squat', 'bulgarian split squats 3x8'), 'bulgarian-split-squat sure');
  assert.equal(r('Bulgarian Split Squat', 'split squats 3x8'), 'bulgarian-split-squat unsure');
  assert.match(r('Copenhagen Plank'), /^custom-.* sure$/);
});

test('merged ids resolve forward', () => {
  const lib = { ...emptyLibrary(), aliases: { 'my bench': 'custom-old' }, merged: { 'custom-old': 'bench-press' } };
  assert.equal(resolveExercise('my bench', 'chest', lib).exerciseId, 'bench-press');
  const { workout } = withIdentity({ id: 'w', date: 'd', rawInput: '', muscleGroups: [], createdAt: 't', exercises: [ex('a', 'my bench')] }, lib);
  assert.equal(workout.exercises[0].exerciseId, 'bench-press');
});

test('the picker lists your exercises first, then catalog matches by name or alias', () => {
  const lib = { ...emptyLibrary(), custom: [{ id: 'custom-lp', name: 'Landmine Press', muscleGroup: 'shoulders' as const, metric: 'weight-reps' as const, createdAt: 't' }] };
  const logged = [
    { id: 'a', date: 'd', rawInput: '', muscleGroups: [], createdAt: 't', exercises: [ex('1', 'Bench', { exerciseId: 'incline-bench-press' })] },
  ];
  const names = (q: string) => searchExercises(q, logged, lib).map((o) => `${o.name}:${o.count}`);
  assert.deepEqual(names('').slice(0, 2), ['Incline Bench Press:1', 'Landmine Press:0']);
  assert.deepEqual(names('bench').slice(0, 2), ['Incline Bench Press:1', 'Bench Press:0']);
  assert.ok(names('ssb').includes('Safety Bar Squat:0')); // alias
  assert.equal(searchExercises('press', logged, lib)[1].muscleGroup, 'shoulders');
});

test('the picker offers the known exercise for a spelling variant instead of a new one', async () => {
  const { knownIdFor } = await import('./exerciseIdentity');
  const lib = { ...emptyLibrary(), custom: [{ id: 'custom-lp', name: 'Landmine Press', muscleGroup: 'shoulders' as const, metric: 'weight-reps' as const, createdAt: 't' }] };
  assert.equal(knownIdFor('pushups', lib), resolveExercise('push up', 'chest', lib).exerciseId);
  assert.equal(searchExercises('pushups', [], lib)[0].exerciseId, knownIdFor('pushups', lib));
  assert.equal(knownIdFor('landmine-press', lib), 'custom-lp');
  assert.equal(searchExercises('LANDMINE  press', [], lib)[0].exerciseId, 'custom-lp');
  assert.equal(knownIdFor('zercher carry walk', lib), undefined);
});

test('a template made from a workout keeps an unsure match unsure', async () => {
  const { templateService } = await import('./templates');
  const lib = emptyLibrary();
  const { workout } = withIdentity({ id: 'w', date: '2026-10-03', rawInput: 'pull-ups 3x10, then chins', muscleGroups: ['back'], createdAt: 't',
    exercises: [ex('a', 'Pull-ups', { muscleGroup: 'back', sets: 3, reps: 10 })] }, lib);
  assert.equal(workout.exercises[0].match, 'unsure');
  const template = await templateService.createTemplateFromWorkout(workout, 'Back');
  const logged = templateService.templateToWorkout(template).exercises[0];
  assert.equal(logged.exerciseId, workout.exercises[0].exerciseId);
  assert.equal(logged.match, 'unsure');
});

test('"Call it Machine flys" names a catalog exercise in the user\'s words and cards show both', async () => {
  const { rememberName, shownName, offersName, yourExercises } = await import('./exerciseIdentity');
  const fix = "is pec deck machine flys? i've never heard it called that";
  assert.equal(offersName('machine flys', 'pec-deck', fix, emptyLibrary()), true);
  assert.equal(offersName('butterfly', 'pec-deck', fix, emptyLibrary()), false); // not in the fix
  assert.equal(offersName('pec deck', 'pec-deck', fix, emptyLibrary()), false); // already its name
  assert.equal(offersName('machine flys', 'custom-1', fix, emptyLibrary()), false); // not a catalog exercise
  const other = 'is pec deck the same as a cable fly? or a chest fly?';
  assert.equal(offersName('cable fly', 'pec-deck', other, emptyLibrary()), false); // names another exercise
  assert.equal(offersName('chest fly', 'pec-deck', other, emptyLibrary()), false); // could mean another exercise

  const lib = rememberName(emptyLibrary(), 'pec-deck', 'machine flys');
  assert.equal(lib.renames['pec-deck'], 'Machine flys');
  assert.equal(lib.aliases['machine flys'], 'pec-deck');
  assert.equal(offersName('machine flys', 'pec-deck', fix, lib), false); // already called that

  // Logged before the rename, logged under the alias, and an exercise with no name of its own
  assert.deepEqual(shownName({ name: 'Pec Deck', exerciseId: 'pec-deck' }, lib), { name: 'Machine flys', catalog: 'Pec Deck' });
  const aliasOnly = { ...emptyLibrary(), aliases: { 'bb bench': 'bench-press' } };
  assert.deepEqual(shownName({ name: 'Bench Press', exerciseId: 'bench-press', said: 'BB bench 3x5' }, aliasOnly), { name: 'Bb bench', catalog: 'Bench Press' });
  assert.deepEqual(shownName({ name: 'Bench Press', exerciseId: 'bench-press', said: 'bench' }, lib), { name: 'Bench Press' });

  // The parser's candidate list now offers it by the user's words
  const workouts = [{ id: 'w', date: '2026-10-03', rawInput: '', muscleGroups: ['chest' as const], createdAt: 't', exercises: [ex('e', 'Pec Deck', { exerciseId: 'pec-deck', match: 'sure' })] }];
  assert.deepEqual(yourExercises(workouts, lib)[0], { id: 'pec-deck', name: 'Machine flys', muscleGroup: 'chest', also: ['machine flys'], family: 'fly' });
});
