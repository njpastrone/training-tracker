import { analyzeWeeklyVolume } from './coach';
import { displayName } from './exerciseIdentity';
import { trainingWindow } from './pace';
import { entriesFor, foodWeek, inUnit, personalRecords } from './progress';
import type { CustomGoal, ExerciseLibrary, FoodGoal, Goals, MuscleGroup, Workout } from '../types/workout';
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

// The food goal, checked only on the days with food logged in the last 7
export interface FoodProgress {
  goal: FoodGoal;
  hit: number; // logged days that met it
  logged: number; // days with food logged
  met: boolean; // every logged day met it
}

type DayFood = { protein: number; kcal: number };
// The number a food goal measures: protein grams, or kcal on a cut or bulk
export const foodValue = (goal: FoodGoal, t: DayFood) => (goal.kind === 'protein' ? t.protein : t.kcal);
// Met: at least the target for protein and a bulk, at or under it on a cut
export const foodMet = (goal: FoodGoal, t: DayFood) => (goal.kind === 'cut' ? t.kcal <= goal.target : foodValue(goal, t) >= goal.target);
export const foodGoalName = (goal: FoodGoal) => (goal.kind === 'protein' ? 'Protein' : 'Calories');
// "160 g" or "2,000"
export const foodTarget = (goal: FoodGoal) => (goal.kind === 'protein' ? `${goal.target} g` : goal.target.toLocaleString('en-US'));
// Calories against a cut or bulk in plain words, never a grade: "876 left · cutting", "124 over · cutting", "876 to go · bulking", "reached · bulking"
export function calorieLeft(goal: FoodGoal, kcal: number): string {
  const diff = goal.target - kcal;
  const n = (v: number) => Math.round(v).toLocaleString('en-US');
  if (goal.kind === 'cut') return `${diff >= 0 ? `${n(diff)} left` : `${n(-diff)} over`} · cutting`;
  return `${diff > 0 ? `${n(diff)} to go` : 'reached'} · bulking`;
}

// Persisted settings from before the one food goal: a protein target becomes a protein food goal
export function withFoodGoal<T extends { settings?: { goals?: Goals & { protein?: number } } }>(state: T): T {
  const goals = state.settings?.goals;
  if (!goals || goals.protein === undefined) return state;
  const { protein, ...rest } = goals;
  return { ...state, settings: { ...state.settings, goals: { ...rest, food: rest.food ?? { kind: 'protein', target: protein } } } };
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

  let foodGoal: FoodProgress | undefined;
  if (goals.food) {
    const goal = goals.food;
    const week = foodWeek(food, now);
    const hit = week.days.filter(d => d.total && foodMet(goal, d.total)).length;
    foodGoal = { goal, hit, logged: week.logged, met: week.logged > 0 && hit === week.logged };
  }

  return {
    muscles,
    custom,
    food: foodGoal,
    timesMet: muscles.filter(m => m.timesGoal !== undefined && m.times >= m.timesGoal).length,
    setsMet: muscles.filter(m => m.setsGoal !== undefined && m.sets >= m.setsGoal).length,
  };
}

// What Progress shows: workout goals only once there are workouts; the food goal and the food
// week whenever they apply, so someone who only logs food still sees them
export function progressSections(hasWorkouts: boolean, goals: ReturnType<typeof goalProgress> | undefined, foodLogged: number) {
  const shown = goals && (hasWorkouts ? goals : { ...goals, muscles: [], custom: [], timesMet: 0, setsMet: 0 });
  return {
    goals: shown && (shown.muscles.length > 0 || shown.custom.length > 0 || !!shown.food) ? shown : undefined,
    food: foodLogged > 0,
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
