/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Exercise, ExerciseLibrary } from '../types/workout';

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
  assert.equal(stored.version, 2); // the latest version: v1's identity migration ran on the way
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

test('a pick from the picker is remembered for the user\'s words and Undo forgets it', async () => {
  const { likelyExercises, pickWords, rememberPick, forgetPick } = await import('./exerciseIdentity');
  const { resolvePick } = await import('../server/src/identity');
  const { editDraft, pickInDraft, unpickInDraft } = await import('./draft');
  const lib = emptyLibrary();

  // "rows" can mean several exercises: the guess, its second choice, then the one you log most
  const logged = [{ id: 'w', date: 'd', rawInput: '', muscleGroups: ['back' as const], createdAt: 't', exercises: [ex('a', 'T-Bar Row', { exerciseId: 't-bar-row' })] }];
  const row = { name: 'Barbell Row', exerciseId: 'barbell-row', alt: 'seated-cable-row', said: 'rows 3x10', match: 'unsure' as const, muscleGroup: 'back' as const, sets: 3, reps: 10 };
  assert.deepEqual(likelyExercises(row, logged, lib).map((o) => o.exerciseId), ['barbell-row', 'seated-cable-row', 't-bar-row']);

  // The alias is the user's words without numbers; a catalog name is never redefined
  assert.equal(pickWords('rows 3x10'), 'rows');
  assert.equal(pickWords('cable rows'), undefined);
  assert.equal(pickWords(undefined), undefined);

  const saved = rememberPick(lib, 'rows', 'seated-cable-row');
  const parse = (aliases: Record<string, string>) => resolvePick({ said: 'Rows', ex: 'e1' }, { input: 'Rows 3x10', candidates: [{ id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back' }], aliases });
  assert.deepEqual([parse(lib.aliases).exerciseId, parse(lib.aliases).match], ['barbell-row', 'unsure']);
  assert.deepEqual([parse(saved.aliases).exerciseId, parse(saved.aliases).match], ['seated-cable-row', 'sure']);
  assert.equal(resolveExercise('row', 'back', saved).exerciseId, 'seated-cable-row'); // any spelling of the words

  // An alias never belongs to two exercises: a new pick for the same words replaces the old one
  const again = rememberPick({ ...saved, aliases: { ...saved.aliases, 'my squat': 'back-squat' } }, 'Row', 'dumbbell-row');
  assert.deepEqual(again.aliases, { 'my squat': 'back-squat', row: 'dumbbell-row' });
  assert.deepEqual(forgetPick(again, 'Row', saved).aliases, { 'my squat': 'back-squat', rows: 'seated-cable-row' }); // back to what it was
  assert.deepEqual(forgetPick(saved, 'rows', lib).aliases, {});

  // The entry takes the pick and loses its flag; Undo puts it back flagged
  const draft = { exercises: [row], muscleGroups: ['back' as const], confidence: 0.9, unsure: [{ exercise: 0, field: 'name' as const }] };
  const picked = pickInDraft(draft, 0, { exerciseId: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back' });
  assert.deepEqual(picked.exercises[0], { ...row, exerciseId: 'seated-cable-row', name: 'Seated Cable Row', match: 'sure', alt: undefined });
  assert.deepEqual(picked.unsure, []);
  assert.deepEqual(unpickInDraft(picked, 0, row, 'seated-cable-row'), draft);
  assert.equal(unpickInDraft(draft, 0, row, 'seated-cable-row'), draft); // the entry changed since: left alone

  // Undo puts back only which exercise it is: numbers edited after the pick stay
  const edited = editDraft(picked, 0, 'sets', 4);
  assert.deepEqual(unpickInDraft(edited, 0, row, 'seated-cable-row'), { ...draft, exercises: [{ ...row, sets: 4 }] });
});

// The Exercises screen: a log of bench in the user's words, and their own "Spoto press" (a shoulders
// entry until it's merged into bench press)
const NOW = new Date('2026-10-10T12:00:00');
const SPOTO = { id: 'custom-spoto', name: 'Spoto press', muscleGroup: 'shoulders' as const, metric: 'weight-reps' as const, createdAt: 't' };
const day = (id: string, date: string, e: Exercise) => ({ id, date, rawInput: e.said ?? '', muscleGroups: [e.muscleGroup], createdAt: 't', exercises: [e] });
const LOG = [
  day('w1', '2026-10-08', ex('e1', 'Bench Press', { exerciseId: 'bench-press', said: 'bench 3x5 225', match: 'sure', sets: 3, reps: 5, weight: 225, unit: 'lbs' })),
  day('w2', '2026-10-06', ex('e2', 'Bench Press', { exerciseId: 'bench-press', said: 'paused bench 3x3 185', match: 'sure', sets: 3, reps: 3, weight: 185, unit: 'lbs' })),
  day('w3', '2026-10-04', ex('e3', 'Spoto press', { exerciseId: 'custom-spoto', said: 'spoto press 3x5 245', muscleGroup: 'shoulders', match: 'sure', sets: 3, reps: 5, weight: 245, unit: 'lbs' })),
  day('w4', '2026-10-02', ex('e4', 'Spoto press', { exerciseId: 'custom-spoto', said: 'spoto press 3x5 235', muscleGroup: 'shoulders', match: 'sure', sets: 3, reps: 5, weight: 235, unit: 'lbs' })),
  day('w5', '2026-09-30', ex('e5', 'Bench Press', { exerciseId: 'bench-press', said: 'bench 5x5 205', match: 'sure', sets: 5, reps: 5, weight: 205, unit: 'lbs' })),
];
const LIB: ExerciseLibrary = { ...emptyLibrary(), custom: [SPOTO], aliases: { spoto: 'custom-spoto' } };

test('merging moves every log, alias and number to the other exercise, and unmerge puts them back', async () => {
  const { mergeExercise, unmergeExercise, mergedInto, displayName, ownName, aliasesOf, liveAliases } = await import('./exerciseIdentity');
  const { exerciseOverview } = await import('./progress');
  const { digest } = await import('./insights');
  const { analyzeWeeklyVolume } = await import('./coach');
  const { goalProgress } = await import('./goals');
  const { summarizeHistory } = await import('./planner');
  const { trainingWindow } = await import('./pace');
  // Everything the app derives from ids: Exercises, Progress, PRs, muscle sets, goals, the planner
  const derived = (lib: ExerciseLibrary) => ({
    overview: exerciseOverview(LOG, lib, 'lbs', NOW).map((o) => `${o.name} ${o.count}× last ${o.lastDate} best ${o.best}`),
    progress: digest(LOG, lib, 'lbs', NOW).exercises.map((e) => e.name),
    chestSets: analyzeWeeklyVolume(LOG, trainingWindow(LOG.map((w) => w.date), 14, NOW), lib).chest.totalSets,
    benchGoal: goalProgress({ muscles: [], custom: [{ id: 'g', kind: 'lift', exerciseId: 'bench-press', weight: 250, unit: 'lbs' }] }, LOG, lib, [], NOW).custom[0].now,
    plannerLifts: summarizeHistory(LOG, [], [], 'lbs', lib, NOW).recentLifts.length,
  });

  const before = derived(LIB);
  assert.deepEqual(before, {
    overview: ['Bench Press 3× last 2026-10-08 best 225 lb × 5', 'Spoto press 2× last 2026-10-04 best 245 lb × 5'],
    progress: ['Bench Press', 'Spoto press'],
    chestSets: 11,
    benchGoal: 225,
    plannerLifts: 2,
  });

  const merged = mergeExercise(LIB, 'custom-spoto', 'bench-press');
  assert.deepEqual(derived(merged), {
    overview: ['Bench Press 5× last 2026-10-08 best 245 lb × 5'], // PRs recalculated
    progress: ['Bench Press'],
    chestSets: 17, // the Spoto sets now count for chest
    benchGoal: 245,
    plannerLifts: 1,
  });
  assert.deepEqual(LOG.map((w) => w.exercises[0].exerciseId)[2], 'custom-spoto'); // logs aren't rewritten
  assert.equal(resolveExercise('spoto', 'chest', merged).exerciseId, 'bench-press'); // the alias moved
  assert.equal(resolveExercise('Spoto press', 'chest', merged).exerciseId, 'bench-press'); // so did the name
  assert.deepEqual(aliasesOf('bench-press', merged), ['spoto']);
  assert.deepEqual(liveAliases(merged), { spoto: 'bench-press' });
  assert.equal(displayName('custom-spoto', merged), 'Bench Press');
  assert.equal(ownName('custom-spoto', merged), 'Spoto press');
  assert.deepEqual(mergedInto('bench-press', merged), ['custom-spoto']);
  assert.ok(!searchExercises('spoto', LOG, merged).some((o) => o.exerciseId === 'custom-spoto'));

  // Merging back the other way would loop: it's refused
  assert.equal(mergeExercise(merged, 'bench-press', 'custom-spoto'), merged);
  // A merged catalog exercise leaves the picker
  const incline = mergeExercise(LIB, 'incline-bench-press', 'bench-press');
  assert.ok(!searchExercises('incline', [], incline).some((o) => o.exerciseId === 'incline-bench-press'));

  assert.deepEqual(unmergeExercise(merged, 'custom-spoto'), LIB);
  assert.deepEqual(derived(unmergeExercise(merged, 'custom-spoto')), before);
});

test('renaming changes only the name: the id, logs and numbers stay', async () => {
  const { renameExercise, displayName, knownIdFor, shownName } = await import('./exerciseIdentity');
  const { exerciseOverview } = await import('./progress');
  const lib = renameExercise(LIB, 'bench-press', '  Flat bench ');
  assert.equal(displayName('bench-press', lib), 'Flat bench');
  assert.equal(knownIdFor('flat bench', lib), 'bench-press');
  assert.deepEqual(exerciseOverview(LOG, lib, 'lbs', NOW)[0], { id: 'bench-press', name: 'Flat bench', count: 3, lastDate: '2026-10-08', best: '225 lb × 5' });
  assert.deepEqual(renameExercise(lib, 'bench-press', 'Bench Press').renames, {}); // its own name again
  assert.deepEqual(renameExercise(lib, 'bench-press', '').renames, {});
  // Your own exercise shows its new name on cards too
  assert.deepEqual(shownName({ name: 'Spoto press', exerciseId: 'custom-spoto' }, renameExercise(LIB, 'custom-spoto', 'Spoto')), { name: 'Spoto' });
});

test('splitting moves the logs written one way to another exercise, and Undo moves them back', async () => {
  const { wordings, splitExercise, unsplitExercise, removeAlias, aliasesOf } = await import('./exerciseIdentity');
  const { exerciseOverview } = await import('./progress');
  assert.deepEqual(wordings(LOG, 'bench-press', LIB), [{ words: 'bench', count: 2 }, { words: 'paused bench', count: 1 }]);

  // To a new exercise: the words now mean it
  const PAUSED = { ...SPOTO, id: 'custom-paused', name: 'Paused bench', muscleGroup: 'chest' as const };
  const lib = { ...LIB, custom: [...LIB.custom, PAUSED] };
  const r = splitExercise(LOG, lib, 'bench-press', 'paused bench', 'custom-paused');
  assert.deepEqual(r.split.moved, [{ workoutId: 'w2', entryId: 'e2', exerciseId: 'bench-press' }]);
  assert.deepEqual(exerciseOverview(r.workouts, r.library, 'lbs', NOW).map((o) => `${o.name} ${o.count}`), ['Bench Press 2', 'Paused bench 1', 'Spoto press 2']);
  assert.equal(resolveExercise('paused bench', 'chest', r.library).exerciseId, 'custom-paused');
  assert.deepEqual(unsplitExercise(r.workouts, r.library, r.split), { workouts: LOG, library: lib });

  // Words that name a catalog exercise move their logs but aren't redefined
  const db = splitExercise(LOG, LIB, 'bench-press', 'Bench', 'dumbbell-bench-press');
  assert.equal(db.split.moved.length, 2);
  assert.equal(db.library, LIB);
  assert.equal(splitExercise(LOG, LIB, 'bench-press', 'bench', 'bench-press').split.moved.length, 0); // onto itself

  assert.deepEqual(aliasesOf('custom-spoto', removeAlias(LIB, 'spoto')), []);
});

test('the store applies merge and split to the saved log', () => {
  const s = useWorkoutStore.getState;
  useWorkoutStore.setState({ workouts: LOG, exerciseLibrary: LIB });
  s().mergeExercise('custom-spoto', 'bench-press');
  assert.equal(s().exerciseLibrary.merged['custom-spoto'], 'bench-press');
  s().unmergeExercise('custom-spoto');
  assert.deepEqual(s().exerciseLibrary, LIB);
  const split = s().splitExercise('bench-press', 'paused bench', 'custom-spoto');
  assert.equal(s().workouts[1].exercises[0].exerciseId, 'custom-spoto');
  s().unsplitExercise(split);
  assert.deepEqual(s().workouts, LOG);
  assert.deepEqual(s().exerciseLibrary, LIB);
});
