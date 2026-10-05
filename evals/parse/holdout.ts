// Holdout cases: written after the first prompt rewrite and never used to tune it, to check the
// main set's score generalises. Run with `npm run eval:parse -- --set holdout`. Same format as cases.ts.
// Don't tune the prompt against these; add a case to cases.ts instead and keep these fresh.

import type { Case } from './cases.ts';

const SUPERSET = [['superset', 'super set', 'paired']];

export const cases: Case[] = [
  { id: 'h-front-hack', category: 'holdout', input: 'front squats 4x6 at 185 and hack squat 3x10 180',
    exercises: [
      { name: 'Front Squat', muscleGroup: 'quads', sets: 4, reps: 6, weight: 185, unit: 'lbs' },
      { name: 'Hack Squat', muscleGroup: 'quads', sets: 3, reps: 10, weight: 180, unit: 'lbs' },
    ] },
  { id: 'h-bp-decimal-kg', category: 'holdout', input: 'bp 5x3 @ 102.5kg',
    exercises: [{ name: 'Bench Press', muscleGroup: 'chest', sets: 5, reps: 3, weight: 102.5, unit: 'kg' }] },
  { id: 'h-arnold-upright', category: 'holdout', input: 'did arnold presses 3x10 w 35s and upright rows 3x12 65',
    exercises: [
      { name: 'Arnold Press', muscleGroup: 'shoulders', sets: 3, reps: 10, weight: 35, unit: 'lbs' },
      { name: 'Upright Rows', muscleGroup: 'shoulders', sets: 3, reps: 12, weight: 65, unit: 'lbs' },
    ] },
  { id: 'h-spin-wrecked', category: 'holdout', input: '45 minute spin class, wrecked',
    exercises: [{ name: 'Cycling', muscleGroup: 'cardio', duration: 45 }],
    notes: [['wrecked', 'exhaust', 'tired', 'spent', 'drained']] },
  { id: 'h-laps', category: 'holdout', input: 'swam 20 laps',
    exercises: [{ name: 'Swimming', muscleGroup: 'cardio', notes: ['20'] }] },
  { id: 'h-split-days', category: 'holdout', input: 'monday: legs. tuesday: push',
    exercises: [
      { name: 'Leg Workout', alt: ['Legs Workout', 'Leg Day'], muscleGroup: 'quads', dayOffset: -5 },
      { name: 'Push Workout', alt: ['Push Day'], muscleGroup: 'chest', dayOffset: -4 },
    ],
    muscleGroups: ['quads', 'hamstrings', 'glutes', 'chest', 'shoulders', 'triceps'] },
  { id: 'h-posterior-chain', category: 'holdout', input: 'nordic curls 3x5, ghr 3x8, good mornings 3x10 at 95',
    exercises: [
      { name: 'Nordic Curl', muscleGroup: 'hamstrings', sets: 3, reps: 5 },
      { name: 'Glute Ham Raise', muscleGroup: 'hamstrings', sets: 3, reps: 8 },
      { name: 'Good Mornings', muscleGroup: 'hamstrings', sets: 3, reps: 10, weight: 95, unit: 'lbs' },
    ] },
  { id: 'h-hammer-reps-list', category: 'holdout', input: 'hammer curls 12/10/8 with 35s',
    exercises: [
      { name: 'Hammer Curls', muscleGroup: 'biceps', sets: 1, reps: 12, weight: 35, unit: 'lbs' },
      { name: 'Hammer Curls', muscleGroup: 'biceps', sets: 1, reps: 10, weight: 35, unit: 'lbs' },
      { name: 'Hammer Curls', muscleGroup: 'biceps', sets: 1, reps: 8, weight: 35, unit: 'lbs' },
    ] },
  { id: 'h-sumo-belt', category: 'holdout', input: 'sumo deads 3x3 at 180kg, belt on for the last set',
    exercises: [{ name: 'Sumo Deadlift', muscleGroup: 'glutes', sets: 3, reps: 3, weight: 180, unit: 'kg', notes: ['belt'] }] },
  { id: 'h-slash-superset', category: 'holdout', input: 'superset: db curls 3x12 25s / overhead extension 3x12 40',
    exercises: [
      { name: 'Dumbbell Curl', muscleGroup: 'biceps', sets: 3, reps: 12, weight: 25, unit: 'lbs', notes: SUPERSET },
      { name: 'Overhead Tricep Extension', muscleGroup: 'triceps', sets: 3, reps: 12, weight: 40, unit: 'lbs', notes: SUPERSET },
    ] },
  { id: 'h-dog-walk', category: 'holdout', input: 'walked the dog for an hour',
    exercises: [{ name: 'Walking', muscleGroup: 'cardio', duration: 60 }],
    notes: '*' },
  { id: 'h-skipped-gym', category: 'holdout', input: 'my wrist hurts so I skipped the gym', exercises: [], notes: '*' },
  { id: 'h-groups-two-days', category: 'holdout', input: 'yesterday I hit back, today chest',
    exercises: [
      { name: 'Back Workout', muscleGroup: 'back', dayOffset: -1 },
      { name: 'Chest Workout', muscleGroup: 'chest' },
    ] },
  { id: 'h-machine-stacks', category: 'holdout', input: 'leg ext 4x15 stack 9, seated leg curl 4x12 stack 7',
    exercises: [
      { name: 'Leg Extension', muscleGroup: 'quads', sets: 4, reps: 15, notes: ['stack'] },
      { name: 'Seated Leg Curl', muscleGroup: 'hamstrings', sets: 4, reps: 12, notes: ['stack'] },
    ] },
  { id: 'h-rope-burpees', category: 'holdout', input: 'skipped rope 3x2min then 50 burpees',
    exercises: [
      { name: 'Jump Rope', muscleGroup: 'cardio', sets: 3, duration: 2 },
      { name: 'Burpees', muscleGroup: 'cardio', sets: 1, reps: 50 },
    ] },
  { id: 'h-kg-default-three', category: 'holdout', unit: 'kg', input: 'squat 3x5 100, bench 3x5 70, row 3x5 60',
    exercises: [
      { name: 'Squats', muscleGroup: 'quads', sets: 3, reps: 5, weight: 100, unit: 'kg' },
      { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 70, unit: 'kg' },
      { name: 'Barbell Row', muscleGroup: 'back', sets: 3, reps: 5, weight: 60, unit: 'kg' },
    ] },
  { id: 'h-long-run-pr', category: 'holdout', input: 'ran 13.1 miles in 1:52!! new PR',
    exercises: [{ name: 'Running', muscleGroup: 'cardio', duration: 112, distance: 13.1, distanceUnit: 'mi' }],
    notes: [['PR', 'personal record', 'personal best']] },
  { id: 'h-chest-machines', category: 'holdout', input: 'pec deck 3x15, cable crossovers 3x12 30lbs, pushups to failure x2',
    exercises: [
      { name: 'Pec Deck', muscleGroup: 'chest', sets: 3, reps: 15 },
      { name: 'Cable Flyes', muscleGroup: 'chest', sets: 3, reps: 12, weight: 30, unit: 'lbs' },
      { name: 'Push-ups', muscleGroup: 'chest', sets: 2, notes: ['failure'] },
    ] },
  { id: 'h-plan-request', category: 'holdout', input: 'can you make me a workout plan', exercises: [] },
  { id: 'h-row-bike-days', category: 'holdout', input: 'Thursday 5k row 21:30, Friday 10 mile bike',
    exercises: [
      { name: 'Rowing', muscleGroup: 'cardio', duration: 21.5, distance: 5, distanceUnit: 'km', dayOffset: -2 },
      { name: 'Cycling', muscleGroup: 'cardio', distance: 10, distanceUnit: 'mi', dayOffset: -1 },
    ] },
];
