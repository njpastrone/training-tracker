// Correction cases: a draft the user is reviewing plus the fix they typed under it, and the whole
// workout expected back. Scored like cases.ts. Run with `npm run eval:parse -- --set corrections`.
// The draft is what the app sends (finalizeParse output, possibly hand-edited); `input` repeats the fix
// so the results table reads well.

import type { Case } from './cases.ts';
import type { ParsedWorkoutResponse } from '../../types/workout.ts';

export interface CorrectionCase extends Case {
  draft: ParsedWorkoutResponse;
  fix: string;
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

const fixCase = (id: string, draft: ParsedWorkoutResponse, fix: string, rest: Omit<Case, 'id' | 'category' | 'input'>, unit: 'lbs' | 'kg' = 'lbs'): CorrectionCase => ({
  id, category: 'correction', input: fix, draft, fix, unit, ...rest,
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
];
