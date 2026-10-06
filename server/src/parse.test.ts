import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorrectionRequest, buildParseRequest, finalizeParse, finalizeWithNames } from './parse.ts';

test('finalizeParse falls back to the default unit when the model omits or misspells it', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Squat', sets: 3, reps: 5, weight: 100, unit: null },
      { name: 'Bench Press', sets: 3, reps: 5, weight: 80, unit: 'KG' },
      { name: 'Deadlift', sets: 1, reps: 5, weight: 300, unit: 'lbs' },
      { name: 'Pull-ups', sets: 3, reps: 8, unit: null },
    ],
  });
  const units = finalizeParse(text, 'kg')!.exercises.map((e) => e.unit);
  assert.deepEqual(units, ['kg', 'kg', 'lbs', undefined]);
  assert.equal(finalizeParse(text)!.exercises[0].unit, undefined);
});

test('finalizeParse keeps a stated unit that differs from the default', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Squat', weight: 100, unit: ' KGS ' },
      { name: 'Bench Press', weight: 80, unit: 'Kilograms' },
      { name: 'Deadlift', weight: 300, unit: 'Pounds' },
    ],
  });
  assert.deepEqual(finalizeParse(text, 'lbs')!.exercises.map((e) => e.unit), ['kg', 'kg', 'lbs']);
  assert.deepEqual(finalizeParse(text, 'kg')!.exercises.map((e) => e.unit), ['kg', 'kg', 'lbs']);
});

test('finalizeParse keeps any past dayOffset and treats others as today', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Running', dayOffset: -21 },
      { name: 'Squat', dayOffset: -1.2 },
      { name: 'Bench Press', dayOffset: 3 },
      { name: 'Deadlift', dayOffset: 'yesterday' },
    ],
  });
  assert.deepEqual(finalizeParse(text)!.exercises.map((e) => e.dayOffset), [-21, -1, undefined, undefined]);
});

test('finalizeParse keeps valid unsure fields and renumbers them past dropped exercises', () => {
  const text = JSON.stringify({
    exercises: [{ name: '' }, { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 100 }, { name: 'Squat', weight: 225 }],
    unsure: [
      { exercise: 1, field: 'weight' },
      { exercise: 2, field: 'sets' },
      { exercise: 0, field: 'name' }, // dropped exercise
      { exercise: 2, field: 'unit' }, // not a field the app highlights
      { exercise: 9, field: 'reps' },
      'weight',
    ],
  });
  assert.deepEqual(finalizeParse(text)!.unsure, [{ exercise: 0, field: 'weight' }, { exercise: 1, field: 'sets' }]);
  assert.deepEqual(finalizeParse(JSON.stringify({ exercises: [{ name: 'Squat' }] }))!.unsure, []);
});

test('buildCorrectionRequest sends the draft with nulls and without app-only fields', () => {
  const draft = {
    exercises: [{ name: 'Running', muscleGroup: 'cardio' as const, distance: 5, distanceUnit: 'km' as const, dayOffset: -1 }],
    muscleGroups: ['cardio' as const],
    confidence: 0.4,
    unsure: [{ exercise: 0, field: 'distance' as const }],
  };
  const req = buildCorrectionRequest(draft, 'it was 6k', { date: '2026-10-03', unit: 'kg' });
  const content = req.messages[0].content;
  const sentDraft = JSON.parse(content.slice(content.indexOf('<draft>') + 7, content.indexOf('</draft>')));
  assert.deepEqual(sentDraft, {
    exercises: [{ name: 'Running', muscleGroup: 'cardio', sets: null, reps: null, weight: null, unit: null, duration: null, distance: 5, distanceUnit: 'km', dayOffset: -1, notes: null }],
    muscleGroups: ['cardio'],
    notes: null,
  });
  assert.match(content, /^Logging date: Saturday 2026-10-03[\s\S]*Default weight unit: kg\n<draft>/);
  assert.match(content, /<fix>it was 6k<\/fix>$/);
  assert.equal(req.model, buildParseRequest('x', { date: '2026-10-03', unit: 'kg' }).model);
});

test('finalizeParse merges identical sets in a row, keeping each note', () => {
  const text = JSON.stringify({ exercises: [
    { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg' },
    { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg', notes: 'wraps' },
    { name: 'Squat', sets: 1, reps: 3, weight: 150, unit: 'kg' },
    { name: 'Bench Press', sets: 3, reps: 5, weight: 100, unit: 'kg', dayOffset: -1 },
    { name: 'Bench Press', sets: 3, reps: 5, weight: 100, unit: 'kg' },
  ] });
  assert.deepEqual(finalizeParse(text)!.exercises.map((e) => [e.name, e.sets, e.weight, e.notes]), [
    ['Squat', 4, 140, 'wraps'], ['Squat', 1, 150, undefined], ['Bench Press', 3, 100, undefined], ['Bench Press', 3, 100, undefined],
  ]);
});

test('finalizeParse never stores assistance as a weight', async () => {
  const { buildCandidates } = await import('./identity.ts');
  const input = 'assisted pullups 3x8 with 50 lbs assistance';
  const candidates = buildCandidates(input, []);
  const ex = `e${candidates.findIndex((c) => c.id === 'assisted-pull-up') + 1}`;
  const text = JSON.stringify({ exercises: [{ said: 'assisted pullups', ex, sets: 3, reps: 8, weight: 50, unit: 'lbs' }] });
  const [e] = finalizeParse(text, 'lbs', { input, candidates })!.exercises;
  assert.deepEqual([e.weight, e.unit, e.notes], [undefined, undefined, '50 lbs assistance']);
});

test('finalizeParse maps unsure flags onto merged sets', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg' },
      { name: 'Squat', sets: 2, reps: 5, weight: 140, unit: 'kg' },
      { name: 'Bench Press', sets: 3, reps: 5, weight: 100, unit: 'kg' },
    ],
    unsure: [{ exercise: 1, field: 'weight' }, { exercise: 0, field: 'weight' }, { exercise: 2, field: 'reps' }],
  });
  assert.deepEqual(finalizeParse(text)!.unsure, [{ exercise: 0, field: 'weight' }, { exercise: 1, field: 'reps' }]);
});

test('finalizeWithNames returns a correction reply and renumbers callIt past merged sets', () => {
  const text = JSON.stringify({
    exercises: [
      { name: 'Bench Press', sets: 1, reps: 5, weight: 100 },
      { name: 'Bench Press', sets: 1, reps: 5, weight: 100 },
      { name: 'Pec Deck', sets: 3, reps: 10 },
    ],
    reply: ' Yes, a pec deck is the machine fly. ',
    callIt: { exercise: 2, words: 'machine flys' },
  });
  const r = finalizeWithNames(text)!;
  assert.equal(r.reply, 'Yes, a pec deck is the machine fly.');
  assert.deepEqual(r.callIt, { exercise: 1, words: 'machine flys' });
  const none = finalizeWithNames(JSON.stringify({ exercises: [{ name: 'Squat' }], reply: null, callIt: { exercise: 7, words: 'x' } }))!;
  assert.equal(none.reply, undefined);
  assert.equal(none.callIt, undefined);
});

test('buildParseRequest spells out the 13 days before the logging date, so a late add is a lookup', () => {
  const content = buildParseRequest('forgot to log last Tuesday: legs', { date: '2026-10-08', unit: 'lbs' }).messages[0].content;
  assert.match(content, /^Logging date: Thursday 2026-10-08\. Earlier days: Wednesday 2026-10-07 = -1; Tuesday 2026-10-06 = -2;/);
  assert.match(content, /Monday 2026-09-28 = -10;/);
  assert.match(content, /Friday 2026-09-25 = -13\. A bare weekday/);
});
