import { analyzeWeeklyVolume } from './coach';
import { displayName } from './exerciseIdentity';
import { trainingWindow } from './pace';
import { entriesFor, foodWeek, inUnit, personalRecords } from './progress';
import type { CustomGoal, ExerciseLibrary, Goals, MuscleGroup, Workout } from '../types/workout';
import type { FoodEntry } from '../types/food';

// Goals checked against the log over the same rolling last 7 days as the sky and the tiles
// (services/pace.ts). Local and deterministic, no AI. Sets count only where they were written:
// a missing count is unknown, never a guess, so a muscle with one shows its sets as a floor.

export const GOAL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves',
];
export const DEFAULT_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves'];
export const DEFAULT_MIN_SETS = 8; // most people's minimum effective volume is 6–10 sets a week
export const NO_GOALS: Goals = { muscles: DEFAULT_MUSCLES, custom: [] };

export interface MuscleProgress {
  group: MuscleGroup;
  times: number; // days trained as a main muscle
  timesGoal?: number;
  sets: number; // written sets: 1 for the main muscle, ½ for each helper
  setsGoal?: number;
  setsMissing: boolean; // some exercise for it had no set count
  met: boolean;
}

export interface CustomProgress {
  goal: CustomGoal;
  name: string;
  now: number; // lift: best weight ever, in the goal's unit (0 if never logged); often: days in the last 7
  target: number;
  met: boolean;
}

// Protein a day, checked only on the days with food logged in the last 7
export interface ProteinProgress {
  target: number; // g a day
  hit: number; // logged days at or over the target
  logged: number; // days with food logged
  met: boolean; // every logged day hit it
}

export const hasMuscleGoals = (g: Goals) => g.timesPerWeek !== undefined || g.minSets !== undefined;
export const minSetsFor = (g: Goals, group: MuscleGroup) => g.minSets?.[group] ?? DEFAULT_MIN_SETS;

export function goalProgress(goals: Goals, workouts: Workout[], library: ExerciseLibrary, food: FoodEntry[] = [], now: Date = new Date()) {
  const win = trainingWindow(workouts.map(w => w.date), 7, now);
  const volume = analyzeWeeklyVolume(workouts, win);

  const muscles: MuscleProgress[] = hasMuscleGoals(goals)
    ? goals.muscles.map(group => {
        const v = volume[group];
        const timesGoal = goals.timesPerWeek;
        const setsGoal = goals.minSets ? minSetsFor(goals, group) : undefined;
        const met = (timesGoal === undefined || v.frequency >= timesGoal) && (setsGoal === undefined || v.totalSets >= setsGoal);
        return { group, times: v.frequency, timesGoal, sets: v.totalSets, setsGoal, setsMissing: v.missingSets, met };
      })
    : [];

  const custom: CustomProgress[] = goals.custom.map(goal => {
    const entries = entriesFor(workouts, goal.exerciseId, library);
    const name = displayName(goal.exerciseId, library) ?? goal.exerciseId;
    if (goal.kind === 'lift') {
      const best = personalRecords(entries, 'weight-reps', goal.unit).heaviest?.exercise;
      const top = best?.weight ? Math.round(inUnit(best.weight, best.unit, goal.unit) * 10) / 10 : 0;
      return { goal, name, now: top, target: goal.weight, met: top >= goal.weight };
    }
    const days = new Set(entries.filter(e => e.date >= win.first && e.date <= win.last).map(e => e.date)).size;
    return { goal, name, now: days, target: goal.perWeek, met: days >= goal.perWeek };
  });

  let protein: ProteinProgress | undefined;
  if (goals.protein) {
    const target = goals.protein;
    const week = foodWeek(food, now);
    const hit = week.days.filter(d => d.total && d.total.protein >= target).length;
    protein = { target, hit, logged: week.logged, met: week.logged > 0 && hit === week.logged };
  }

  return {
    muscles,
    custom,
    protein,
    timesMet: muscles.filter(m => m.timesGoal !== undefined && m.times >= m.timesGoal).length,
    setsMet: muscles.filter(m => m.setsGoal !== undefined && m.sets >= m.setsGoal).length,
  };
}

// "8", "5½", and "5½+" when some sets weren't written down
export const formatSets = (sets: number, missing: boolean) =>
  `${Math.floor(sets)}${sets % 1 ? '½' : ''}${missing ? '+' : ''}`.replace(/^0½/, '½');

export const muscleName = (g: MuscleGroup) => (g === 'full_body' ? 'Full body' : g.charAt(0).toUpperCase() + g.slice(1));

// The goals in plain words, for the planner
export function goalLines(goals: Goals, library: ExerciseLibrary): string[] {
  const list = goals.muscles.join(', ');
  return [
    ...(goals.muscles.length && goals.timesPerWeek ? [`Each of ${list} on at least ${goals.timesPerWeek} days a week`] : []),
    ...(goals.muscles.length && goals.minSets ? [`At least these sets a week: ${goals.muscles.map(g => `${g} ${minSetsFor(goals, g)}`).join(', ')}`] : []),
    ...goals.custom.map(g => {
      const name = displayName(g.exerciseId, library) ?? g.exerciseId;
      return g.kind === 'lift' ? `${name}: reach ${g.weight} ${g.unit}` : `${name} on ${g.perWeek} days a week`;
    }),
  ];
}
