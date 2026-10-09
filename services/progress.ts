// Progress and personal records, keyed on exercise identity (never on names).

import { catalogById, type Metric } from '../data/catalog';
import { resolveId } from './exerciseIdentity';
import { format, subDays } from 'date-fns';
import type { Exercise, ExerciseLibrary, WeightUnit, Workout } from '../types/workout';
import type { FoodEntry } from '../types/food';

export interface Entry {
  date: string;
  workoutId: string;
  exercise: Exercise;
}

// Every logged entry of this exercise (and of anything merged into it), newest first
export function entriesFor(workouts: Workout[], exerciseId: string, library: ExerciseLibrary): Entry[] {
  const id = resolveId(exerciseId, library);
  return workouts
    .flatMap((w) => w.exercises.map((exercise) => ({ date: w.date, workoutId: w.id, exercise })))
    .filter((e) => e.exercise.exerciseId && resolveId(e.exercise.exerciseId, library) === id)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function metricFor(exerciseId: string, library: ExerciseLibrary): Metric {
  const id = resolveId(exerciseId, library);
  return catalogById.get(id)?.metric ?? library.custom.find((c) => c.id === id)?.metric ?? 'weight-reps';
}

const LB_PER_KG = 2.20462;
// Stored units are never converted; this is only for comparing
export const inUnit = (weight: number, from: WeightUnit | undefined, to: WeightUnit) =>
  !from || from === to ? weight : from === 'kg' ? weight * LB_PER_KG : weight / LB_PER_KG;

const METRES: Record<string, number> = { mi: 1609.344, km: 1000, m: 1 };
const PACE_BANDS = [1000, 5000, 10000, 21097.5, 42195];

export interface PersonalRecords {
  heaviest?: Entry; // weight-reps: heaviest weight
  bestE1rm?: { entry: Entry; value: number }; // weight-reps: best estimated 1RM (Epley, reps ≤ 12), in the user's unit
  repsAtWeight?: Record<string, Entry>; // weight-reps: most reps at each stored weight ("225 lbs")
  mostReps?: Entry; // reps, assisted-reps: most reps in one set
  longest?: Entry; // time: longest hold
  longestDistance?: Entry; // distance-time
  fastestPace?: Record<number, { entry: Entry; minPerKm: number }>; // distance-time: per band, in metres
}

// Unsure entries never count until the user confirms them. Sessions have no records.
export function personalRecords(entries: Entry[], metric: Metric, userUnit: WeightUnit): PersonalRecords {
  const sure = entries.filter((e) => e.exercise.match !== 'unsure');
  const best = <T>(list: T[], score: (x: T) => number | undefined) => {
    let top: T | undefined;
    let topScore = -Infinity;
    for (const x of list) {
      const s = score(x);
      if (s !== undefined && s > topScore) [top, topScore] = [x, s];
    }
    return top === undefined ? undefined : { item: top, score: topScore };
  };
  const weight = (e: Entry) => (e.exercise.weight ? inUnit(e.exercise.weight, e.exercise.unit, userUnit) : undefined);

  switch (metric) {
    case 'weight-reps': {
      const e1rm = best(sure, (e) => {
        const w = weight(e);
        const reps = e.exercise.reps ?? 1;
        return w && reps <= 12 ? (reps === 1 ? w : w * (1 + reps / 30)) : undefined;
      });
      return {
        heaviest: best(sure, weight)?.item,
        bestE1rm: e1rm && { entry: e1rm.item, value: Math.round(e1rm.score * 10) / 10 },
        repsAtWeight: sure.reduce<Record<string, Entry>>((acc, e) => {
          const key = e.exercise.weight ? `${e.exercise.weight} ${e.exercise.unit ?? userUnit}` : undefined;
          if (key && (e.exercise.reps ?? 0) > (acc[key]?.exercise.reps ?? 0)) acc[key] = e;
          return acc;
        }, {}),
      };
    }
    case 'reps':
    case 'assisted-reps':
      return { mostReps: best(sure, (e) => e.exercise.reps)?.item };
    case 'time':
      return { longest: best(sure, (e) => e.exercise.duration)?.item };
    case 'distance-time': {
      const metres = (e: Entry) => (e.exercise.distance ? e.exercise.distance * (METRES[e.exercise.distanceUnit ?? 'km'] ?? 0) : undefined);
      const fastestPace: PersonalRecords['fastestPace'] = {};
      for (const band of PACE_BANDS) {
        // Each run counts toward the largest band it covers
        const inBand = sure.filter((e) => {
          const m = metres(e);
          return m && e.exercise.duration && m >= band && PACE_BANDS.filter((b) => b <= m).at(-1) === band;
        });
        const fastest = best(inBand, (e) => -(e.exercise.duration! / (metres(e)! / 1000)));
        if (fastest) fastestPace[band] = { entry: fastest.item, minPerKm: -fastest.score };
      }
      return { longestDistance: best(sure, metres)?.item, fastestPace };
    }
    case 'session':
      return {};
  }
}

// Each day's food: protein and calories summed (rounded once, for the day), how many foods and meals (logged messages)
export interface FoodDayTotal {
  protein: number;
  kcal: number;
  foods: number;
  meals: number;
}

export function foodByDay(entries: FoodEntry[]): Map<string, FoodDayTotal> {
  const raw = new Map<string, FoodDayTotal>();
  for (const e of entries) {
    const t = raw.get(e.date) ?? { protein: 0, kcal: 0, foods: 0, meals: 0 };
    t.meals++;
    for (const i of e.items) {
      t.protein += i.macros.protein;
      t.kcal += i.macros.kcal;
      t.foods++;
    }
    raw.set(e.date, t);
  }
  for (const t of raw.values()) {
    t.protein = Math.round(t.protein);
    t.kcal = Math.round(t.kcal);
  }
  return raw;
}

// The last 7 days of food, oldest first, for Progress and the food goal. Averages are over the
// days with food logged: a day nothing was written down is unknown, not zero.
export function foodWeek(entries: FoodEntry[], now: Date = new Date()) {
  const totals = foodByDay(entries);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(now, 6 - i), 'yyyy-MM-dd');
    return { date, total: totals.get(date) };
  });
  const logged = days.flatMap(d => (d.total ? [d.total] : []));
  const avg = (k: 'protein' | 'kcal') => (logged.length ? Math.round(logged.reduce((s, t) => s + t[k], 0) / logged.length) : 0);
  return { days, logged: logged.length, protein: avg('protein'), kcal: avg('kcal') };
}
