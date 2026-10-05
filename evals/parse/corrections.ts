// Correction cases: a draft the user is reviewing plus the fix (or question) they typed under it, and
// the whole workout expected back, with a reply when the fix asks a question. Scored like cases.ts. Run with `npm run eval:parse -- --set corrections`.
// The draft is what the app sends (finalizeParse output, possibly hand-edited); `input` repeats the fix
// so the results table reads well.

import type { Case } from './cases.ts';
import type { ParsedWorkoutResponse } from '../../types/workout.ts';

export interface CorrectionCase extends Case {
  draft: ParsedWorkoutResponse;
  fix: string;
  reply?: boolean; // the fix asks a question, so an answer is expected (default: none)
  callIt?: { exercise: string; words: string }; // the offer to call that exercise by the user's words
}

const upperA: ParsedWorkoutResponse = {
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135, unit: 'lbs', notes: 'felt easy' },
    { name: 'Seated Cable Row', muscleGroup: 'back', sets: 3, reps: 10, weight: 100, unit: 'lbs' },
    { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 3, reps: 10, weight: 30, unit: 'lbs' },
    { name: 'Lat Pulldown', muscleGroup: 'back', sets: 3, reps: 10, weight: 100, unit: 'lbs' },
    { name: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, reps: 12, weight: 40, unit: 'lbs' },
  ],
  muscleGroups: ['chest', 'back', 'shoulders', 'triceps'],
  confidence: 0.85,
};
const upperAExpected = () => [
  { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135, unit: 'lbs' as const, notes: ['easy'] },
  { name: 'Seated Cable Row', muscleGroup: 'back', sets: 3, reps: 10, weight: 100, unit: 'lbs' as const },
  { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 3, reps: 10, weight: 30, unit: 'lbs' as const },
  { name: 'Lat Pulldown', muscleGroup: 'back', sets: 3, reps: 10, weight: 100, unit: 'lbs' as const },
  { name: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, reps: 12, weight: 40, unit: 'lbs' as const },
];
const edit = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((e, j) => (j === i ? { ...e, ...patch } : e));

const legs: ParsedWorkoutResponse = {
  exercises: [
    { name: 'Squats', muscleGroup: 'quads', sets: 5, reps: 5, weight: 100, unit: 'kg' },
    { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, reps: 8, weight: 80, unit: 'kg' },
    { name: 'Running', muscleGroup: 'cardio', duration: 20, distance: 3, distanceUnit: 'km' },
  ],
  muscleGroups: ['quads', 'hamstrings', 'cardio'],
  notes: 'Knees felt good',
  confidence: 0.9,
};
const legsExpected = () => [
  { name: 'Squats', muscleGroup: 'quads', sets: 5, reps: 5, weight: 100, unit: 'kg' as const },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, reps: 8, weight: 80, unit: 'kg' as const },
  { name: 'Running', muscleGroup: 'cardio', duration: 20, distance: 3, distanceUnit: 'km' as const },
];

// The owner's log: "machine flys" came back as Pec Deck, a name they had never heard
const chest: ParsedWorkoutResponse = {
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135, unit: 'lbs' },
    { name: 'Pec Deck', muscleGroup: 'chest', sets: 3, reps: 12, weight: 90, unit: 'lbs' },
    { name: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, reps: 12, weight: 40, unit: 'lbs' },
  ],
  muscleGroups: ['chest', 'triceps'],
  confidence: 0.9,
};
const chestExpected = () => [
  { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135, unit: 'lbs' as const },
  { name: 'Pec Deck', muscleGroup: 'chest', sets: 3, reps: 12, weight: 90, unit: 'lbs' as const },
  { name: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 2, reps: 12, weight: 40, unit: 'lbs' as const },
];
const pecDeckIsMachineFlys = { exercise: 'Pec Deck', words: 'machine flys' };

type Rest = Omit<CorrectionCase, 'id' | 'category' | 'input' | 'draft' | 'fix' | 'unit'>;
const fixCase = (id: string, draft: ParsedWorkoutResponse, fix: string, rest: Rest, unit: 'lbs' | 'kg' = 'lbs'): CorrectionCase => ({
  id, category: rest.reply ? 'question' : 'correction', input: fix, draft, fix, unit, ...rest,
});

export const cases: CorrectionCase[] = [
  fixCase('fix-reps', upperA, 'actually 3x10 on bench, not 3x8', {
    exercises: edit(upperAExpected(), 0, { reps: 10 }) }),
  fixCase('fix-weight-loose-name', upperA, 'the rows were 120', {
    exercises: edit(upperAExpected(), 1, { weight: 120 }) }),
  fixCase('fix-unit', upperA, 'shoulder press was in kg', {
    exercises: edit(upperAExpected(), 2, { unit: 'kg' }) }),
  fixCase('fix-remove', upperA, 'drop the pushdowns, I skipped them', {
    exercises: upperAExpected().slice(0, 4), notes: '*' }),
  fixCase('fix-add', upperA, 'also did curls 3x12 with 25s', {
    exercises: [...upperAExpected(), { name: 'Dumbbell Curl', muscleGroup: 'biceps', sets: 3, reps: 12, weight: 25, unit: 'lbs' }] }),
  fixCase('fix-rename', upperA, 'it was incline bench, not flat', {
    exercises: edit(upperAExpected(), 0, { name: 'Incline Bench Press' }) }),
  fixCase('fix-all-sets', upperA, 'everything was 4 sets', {
    exercises: upperAExpected().map(e => ({ ...e, sets: 4 })) }),
  fixCase('fix-day', upperA, 'this was yesterday', {
    exercises: upperAExpected().map(e => ({ ...e, dayOffset: -1 })) }),
  fixCase('fix-split-sets', upperA, 'last bench set was 155 for 5', {
    exercises: [
      { name: 'Bench Press', muscleGroup: 'chest', sets: 2, reps: 8, weight: 135, unit: 'lbs' },
      { name: 'Bench Press', muscleGroup: 'chest', sets: 1, reps: 5, weight: 155, unit: 'lbs' },
      ...upperAExpected().slice(1),
    ], notes: '*' }),
  fixCase('fix-workout-note', upperA, 'new bench PR btw', {
    exercises: upperAExpected(), notes: ['PR'] }),
  fixCase('fix-distance', legs, 'run was 5k not 3', {
    exercises: edit(legsExpected(), 2, { distance: 5 }), notes: ['knee'] }, 'kg'),
  fixCase('fix-keep-others', legs, 'rdl 3x10', {
    exercises: edit(legsExpected(), 1, { reps: 10 }), notes: ['knee'] }, 'kg'),
  fixCase('fix-pec-deck-reps', chest, 'pec deck was 3x15', {
    exercises: edit(chestExpected(), 1, { reps: 15 }) }),

  // Questions: answered in reply, the draft unchanged; a question with a fix does both
  fixCase('ask-pec-deck-same', chest, 'is pec deck the same as machine flys?', {
    exercises: chestExpected(), reply: true, callIt: pecDeckIsMachineFlys }),
  fixCase('ask-pec-deck-owner', chest, "is 'pec deck machine flys? ive never heard it called that.", {
    exercises: chestExpected(), reply: true, callIt: pecDeckIsMachineFlys }),
  fixCase('ask-what-is-rdl', legs, "what's a romanian deadlift?", {
    exercises: legsExpected(), notes: ['knee'], reply: true }, 'kg'),
  fixCase('ask-why-sets', upperA, 'why does the pushdown say 2 sets?', {
    exercises: upperAExpected(), reply: true }),
  fixCase('ask-and-fix-pec-deck', chest, 'is pec deck machine flys? also it was 4 sets not 3', {
    exercises: edit(chestExpected(), 1, { sets: 4 }), reply: true, callIt: pecDeckIsMachineFlys }),
  fixCase('ask-and-fix-rdl', legs, "what's a romanian deadlift? and the squats were 110", {
    exercises: edit(legsExpected(), 0, { weight: 110 }), notes: ['knee'], reply: true }, 'kg'),
];
