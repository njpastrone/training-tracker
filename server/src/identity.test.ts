import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates, resolvePick, saidInLog, type Candidate } from './identity.ts';
import { finalizeParse } from './parse.ts';

const yours = (...ids: [string, string, Candidate['muscleGroup'], string?][]) =>
  ids.map(([id, name, muscleGroup, family]) => ({ id, name, muscleGroup, ...(family ? { family } : {}) }));

// The model's answer for one exercise, checked against the candidates the log was sent with
function pick(input: string, raw: { said?: string; ex?: string; alt?: string; name?: string }, library: Omit<Candidate, 'yours'>[] = [], aliases = {}) {
  const candidates = buildCandidates(input, library);
  const key = (id: string) => `e${candidates.findIndex((c) => c.id === id) + 1}`;
  const r = resolvePick({ ...raw, ex: raw.ex && (raw.ex.startsWith('e') ? raw.ex : key(raw.ex)), alt: raw.alt && key(raw.alt) }, { input, candidates, aliases });
  return `${r.exerciseId ?? 'new'} ${r.match}`;
}

test('a listed pick that fits the words is sure', () => {
  assert.equal(pick('BB bench 3x5 225', { said: 'BB bench', ex: 'bench-press' }), 'bench-press sure');
  assert.equal(pick('incline DB bench 3x10', { said: 'incline DB bench', ex: 'incline-dumbbell-press' }), 'incline-dumbbell-press sure');
  assert.equal(pick('cgbp 3x8', { said: 'cgbp', ex: 'close-grip-bench-press' }), 'close-grip-bench-press sure');
});

test('a pick whose variant the words contradict or leave out is unsure', () => {
  assert.equal(pick('incline DB bench 3x10', { said: 'incline DB bench', ex: 'bench-press' }), 'bench-press unsure');
  assert.equal(pick('bench 3x5', { said: 'bench', ex: 'incline-bench-press' }), 'incline-bench-press unsure');
  assert.equal(pick('bench 3x5', { said: 'bench', ex: 'dumbbell-bench-press' }), 'dumbbell-bench-press unsure');
  assert.equal(pick('squats 5x5', { said: 'squats', ex: 'front-squat' }), 'front-squat unsure');
  assert.equal(pick('pull ups 3x8', { said: 'pull ups', ex: 'assisted-pull-up' }), 'assisted-pull-up unsure');
});

test('words that are another exercise\'s own name never confirm a lookalike pick', () => {
  assert.equal(pick('chin ups 3x8', { said: 'chin ups', ex: 'pull-up' }), 'pull-up unsure');
  assert.equal(pick('pull ups 3x8', { said: 'pull ups', ex: 'chin-up' }), 'chin-up unsure');
  assert.equal(pick('pull ups 3x8', { said: 'pull ups', ex: 'chin-up' }, yours(['chin-up', 'Chin-up', 'back', 'pull-up'])), 'chin-up unsure'); // even the user's only one
  assert.equal(pick('chin ups 3x8', { said: 'chin ups', ex: 'chin-up' }), 'chin-up sure');
});

test('made-up keys and words not in the log are never trusted', () => {
  assert.equal(pick('bench 3x5', { said: 'bench', ex: 'e99' }), 'bench-press sure'); // falls back to the words
  assert.equal(pick('bench 3x5', { said: 'squat', ex: 'squat' }), 'squat unsure'); // not in the log
  assert.equal(pick('bench 3x5', { said: 'bench', ex: 'bench-press', alt: 'dumbbell-bench-press' }), 'bench-press sure'); // "bench" is Bench Press's own alias
  assert.equal(pick('bench 3x5', { said: 'bench', ex: 'incline-bench-press', alt: 'bench-press' }), 'incline-bench-press unsure');
  assert.ok(saidInLog('dumbell bench', 'did dumbel bench'));
  assert.ok(!saidInLog('deadlift', 'bench 3x5'));
});

test('numbers the model copied with the words don\'t count as the words', () => {
  assert.equal(pick('dips 3x10', { said: 'dips 3x10', name: 'Dip' }), 'chest-dip unsure'); // ambiguous
  assert.equal(pick('rowed 2000m in 7:45', { said: 'rowed 2000m in 7:45', ex: 'rowing-machine' }), 'rowing-machine sure');
});

test('the user\'s alias table wins over the model', () => {
  const lib = yours(['overhead-press', 'Overhead Press', 'shoulders', 'overhead-press']);
  assert.equal(pick('the usual press 5x5', { said: 'the usual press', ex: 'e1' }, lib, { 'the usual press': 'overhead-press' }), 'overhead-press sure');
  assert.equal(pick('The Usual Press 5x5', { said: 'The Usual Press', ex: null as unknown as string, name: 'Push Press' }, lib, { 'the usual press': 'overhead-press' }), 'overhead-press sure');
});

test('an ambiguous word maps on its own only to the user\'s one exercise of that kind', () => {
  assert.equal(pick('rows 3x10', { said: 'rows', ex: 'barbell-row' }), 'barbell-row unsure');
  assert.equal(pick('rows 3x10', { said: 'rows', ex: 'e1' }, yours(['seated-cable-row', 'Seated Cable Row', 'back', 'row'])), 'seated-cable-row sure');
  assert.equal(pick('rows 3x10', { said: 'rows', ex: 'e1' }, yours(['seated-cable-row', 'Seated Cable Row', 'back', 'row'], ['barbell-row', 'Barbell Row', 'back', 'row'])), 'seated-cable-row unsure');
});

test('the implement of the user\'s only exercise in a family needn\'t be said', () => {
  assert.equal(pick('bench 3x10 70s', { said: 'bench', ex: 'e1' }, yours(['dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', 'bench-press'])), 'dumbbell-bench-press sure');
  const both = yours(['dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', 'bench-press'], ['bench-press', 'Bench Press', 'chest', 'bench-press']);
  assert.equal(pick('bench 3x10', { said: 'bench', ex: 'e1' }, both), 'dumbbell-bench-press unsure');
  // The catalog's Bench Press when the user's own dumbbell bench fits "bench" too
  const dbOnly = yours(['dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', 'bench-press']);
  assert.equal(pick('bench 3x10', { said: 'bench', ex: 'bench-press' }, dbOnly), 'bench-press unsure');
  assert.equal(pick('incline bb bench 3x10', { said: 'incline bb bench', ex: 'incline-bench-press' }, dbOnly), 'incline-bench-press sure');
});

test('no listed match: the proposed name is looked up, else it is a new exercise', () => {
  assert.equal(pick('pulled 405 for a single', { said: 'pulled', name: 'Deadlift' }), 'deadlift sure');
  assert.equal(pick('landmine press 3x8', { said: 'landmine press', name: 'Landmine Press' }), 'new sure');
});

test('finalizeParse maps keys to ids, keeps the user\'s words, and takes the group from the exercise', () => {
  const input = 'chins 3x8 and some landmine press';
  const candidates = buildCandidates(input, []);
  const e = (id: string) => `e${candidates.findIndex((c) => c.id === id) + 1}`;
  const text = JSON.stringify({ exercises: [
    { said: 'chins', ex: e('chin-up'), muscleGroup: 'biceps', sets: 3, reps: 8 },
    { said: 'landmine press', ex: null, name: 'Landmine Press', muscleGroup: 'shoulders' },
  ] });
  const out = finalizeParse(text, 'lbs', { input, candidates })!.exercises;
  assert.deepEqual(out.map((x) => [x.name, x.exerciseId, x.match, x.said, x.muscleGroup]), [
    ['Chin-up', 'chin-up', 'sure', 'chins', 'back'],
    ['Landmine Press', undefined, 'sure', 'landmine press', 'shoulders'],
  ]);
});

test('a log of names only is complete: no numbers, nothing unsure', () => {
  const input = 'squats and bench today';
  const candidates = buildCandidates(input, []);
  const e = (id: string) => `e${candidates.findIndex((c) => c.id === id) + 1}`;
  const text = JSON.stringify({ exercises: [{ said: 'squats', ex: e('squat') }, { said: 'bench', ex: e('bench-press') }] });
  assert.deepEqual(finalizeParse(text, 'lbs', { input, candidates })!.exercises.map((x) => x.match), ['sure', 'sure']);
});

test('library entries the Worker would reject are left out before keys are numbered', () => {
  const lib = yours(['custom-fly', 'Cable fly -> low to high', 'chest'], ['custom-long', 'x'.repeat(81), 'chest'], ['bench-press', 'Bench Press', 'chest', 'bench-press']);
  const out = buildCandidates('bench 3x5', [...lib.slice(0, 2), { ...lib[2], also: ['my <bench>', 'flat bench'] }]);
  assert.deepEqual(out[0], { id: 'bench-press', name: 'Bench Press', muscleGroup: 'chest', family: 'bench-press', also: ['flat bench'], yours: true });
  assert.ok(out.every((c) => c.id !== 'custom-fly' && c.id !== 'custom-long'));
});

test('a pick of the user\'s own exercise is sure only when the words fit its name', () => {
  assert.equal(pick('hack squat 3x10 180', { said: 'hack squat', ex: 'e1' }, yours(['custom-pendulum', 'Pendulum Squat', 'quads'])), 'custom-pendulum unsure');
  assert.equal(pick('incline DB press 3x10 60s', { said: 'incline DB press', ex: 'e1' }, yours(['custom-landmine', 'Landmine Press', 'shoulders'])), 'custom-landmine unsure');
  assert.equal(pick('pit shark 3x10 180', { said: 'pit shark', ex: 'e1' }, yours(['custom-pit-shark', 'Pit Shark Squat', 'quads'])), 'custom-pit-shark sure');
  assert.equal(pick('zorb pulls 3x12', { said: 'zorb pulls', ex: 'e1' }, yours(['custom-zorb', 'Cable Zorb Pull', 'back'])), 'custom-zorb sure');
});

test('an older Worker that returns names only: exact names are sure, the rest is left to the store', () => {
  const input = 'bench 3x5 and pit shark 3x10 and landmine press';
  const candidates = buildCandidates(input, yours(['custom-pit-shark', 'Pit Shark Squat', 'quads']));
  const text = JSON.stringify({ exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5 },
    { name: 'Pit Shark Squat', muscleGroup: 'quads', sets: 3, reps: 10 },
    { name: 'Landmine Press', muscleGroup: 'shoulders' },
  ] });
  const out = finalizeParse(text, 'lbs', { input, candidates })!.exercises;
  assert.deepEqual(out.map((x) => [x.name, x.exerciseId, x.match]), [
    ['Bench Press', 'bench-press', 'sure'],
    ['Pit Shark Squat', 'custom-pit-shark', 'sure'],
    ['Landmine Press', undefined, undefined],
  ]);
});

test('a pick with a key but no words is still checked, not read as an older Worker', () => {
  const input = 'hack squat 3x10';
  const candidates = buildCandidates(input, yours(['custom-pendulum', 'Pendulum Squat', 'quads']));
  const text = JSON.stringify({ exercises: [{ ex: 'e1', name: 'Pendulum Squat', muscleGroup: 'quads', sets: 3, reps: 10 }] });
  const [out] = finalizeParse(text, 'lbs', { input, candidates })!.exercises;
  assert.deepEqual([out.exerciseId, out.match], ['custom-pendulum', 'unsure']);
});
