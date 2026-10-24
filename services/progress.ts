// Progress and personal records, keyed on exercise identity (never on names).

import { catalogById, type Metric } from '../data/catalog';
import { displayName, resolveId } from './exerciseIdentity';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import type { Exercise, ExerciseLibrary, WeightUnit, Workout } from '../types/workout';
import type { FoodEntry, Macros } from '../types/food';

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

// A record in a few words: "225 lb × 5", "20 reps", "45 min", "5 km". Undefined without one.
export function bestLine(pr: PersonalRecords, unit: WeightUnit): string | undefined {
  const x = (pr.heaviest ?? pr.mostReps ?? pr.longestDistance ?? pr.longest)?.exercise;
  if (!x) return undefined;
  if (pr.heaviest) return `${x.weight} ${(x.unit ?? unit) === 'kg' ? 'kg' : 'lb'}${x.reps ? ` × ${x.reps}` : ''}`;
  if (pr.mostReps) return `${x.reps} reps`;
  if (pr.longestDistance) return `${x.distance} ${x.distanceUnit ?? 'km'}`;
  return `${x.duration} min`;
}

export interface ExerciseOverview {
  id: string;
  name: string;
  count: number; // logs, counting everything merged into it
  lastDate?: string;
  best?: string;
}

// Every exercise you have, A to Z: logged ones by their resolved id, plus your own not logged yet
export function exerciseOverview(workouts: Workout[], library: ExerciseLibrary, unit: WeightUnit, now: Date = new Date()): ExerciseOverview[] {
  const today = format(now, 'yyyy-MM-dd');
  const byId = new Map<string, Entry[]>();
  for (const w of workouts.filter((w) => w.date <= today)) {
    for (const exercise of w.exercises) {
      const id = exercise.exerciseId && resolveId(exercise.exerciseId, library);
      if (id) byId.set(id, [...(byId.get(id) ?? []), { date: w.date, workoutId: w.id, exercise }]);
    }
  }
  for (const c of library.custom) if (resolveId(c.id, library) === c.id && !byId.has(c.id)) byId.set(c.id, []);
  return [...byId.entries()]
    .map(([id, entries]) => ({
      id,
      name: displayName(id, library) ?? entries[0]?.exercise.name ?? 'Exercise',
      count: entries.length,
      lastDate: entries.reduce<string | undefined>((m, e) => (!m || e.date > m ? e.date : m), undefined),
      best: bestLine(personalRecords(entries, metricFor(id, library), unit), unit),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Each day's food: protein and calories summed (rounded once, for the day), how many foods and meals (logged messages)
export interface FoodDayTotal {
  protein: number;
  kcal: number;
  foods: number;
  meals: number;
  fiber?: number; // g, only when some food that day carries a fiber number
  lowGiMeals?: number; // meals whose foods all carry a GI and average 55 or under, only when some meal carries GI numbers
}

export const LOW_GI = 55;

// A meal's GI: the carb-weighted average of its foods', unknown unless every food has one
export function mealGi(items: { macros: Macros; gi?: number }[]): number | undefined {
  if (!items.length || items.some(i => i.gi === undefined)) return undefined;
  const carbs = items.reduce((s, i) => s + i.macros.carbs, 0);
  return carbs ? items.reduce((s, i) => s + i.gi! * i.macros.carbs, 0) / carbs : items.reduce((s, i) => s + i.gi!, 0) / items.length;
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
      if (i.macros.fiber !== undefined) t.fiber = (t.fiber ?? 0) + i.macros.fiber;
    }
    const gi = mealGi(e.items);
    if (gi !== undefined) t.lowGiMeals = (t.lowGiMeals ?? 0) + (gi <= LOW_GI ? 1 : 0);
    raw.set(e.date, t);
  }
  for (const t of raw.values()) {
    t.protein = Math.round(t.protein);
    t.kcal = Math.round(t.kcal);
    if (t.fiber !== undefined) t.fiber = Math.round(t.fiber);
  }
  return raw;
}

// The last 7 days of food, oldest first, for the Food details screen and the food goal. Averages are over the
// days with food logged: a day nothing was written down is unknown, not zero. `top` is where most
// of the protein came from: up to 3 short names ("chicken breast", "egg"), most first.
export function foodWeek(entries: FoodEntry[], now: Date = new Date()) {
  const totals = foodByDay(entries);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(now, 6 - i), 'yyyy-MM-dd');
    return { date, total: totals.get(date) };
  });
  const logged = days.flatMap(d => (d.total ? [d.total] : []));
  const avg = (sum: number) => (logged.length ? Math.round(sum / logged.length) : 0);
  const items = entries.filter(e => e.date >= days[0].date && e.date <= days[6].date).flatMap(e => e.items);
  const sum = (k: 'carbs' | 'fat') => items.reduce((s, i) => s + i.macros[k], 0);
  const byName = new Map<string, number>();
  for (const i of items) {
    const name = i.name.split(',')[0].trim().toLowerCase(); // "Rice, white" → "rice"
    byName.set(name, (byName.get(name) ?? 0) + i.macros.protein);
  }
  const top = [...byName].filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  return {
    days,
    logged: logged.length,
    protein: avg(logged.reduce((s, t) => s + t.protein, 0)),
    kcal: avg(logged.reduce((s, t) => s + t.kcal, 0)),
    carbs: avg(sum('carbs')),
    fat: avg(sum('fat')),
    top,
  };
}

// What happened between two progress photos, from the log alone (no AI): training days and how many a week,
// and for up to 3 of your most-done lifts the heaviest weight up to the first photo against the heaviest since
export function photoSpan(workouts: Workout[], from: string, to: string, library: ExerciseLibrary, unit: WeightUnit) {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const between = workouts.filter((w) => w.date > a && w.date <= b);
  const days = new Set(between.map((w) => w.date)).size;
  const weeks = Math.max(1, differenceInCalendarDays(parseISO(b), parseISO(a)) / 7);
  const heaviest = (list: Workout[]) => {
    const top = new Map<string, { name: string; weight: number; times: number }>();
    for (const w of list) {
      for (const e of w.exercises) {
        if (!e.exerciseId || !e.weight || e.match === 'unsure') continue;
        const id = resolveId(e.exerciseId, library);
        const t = top.get(id);
        top.set(id, { name: t?.name ?? e.name, weight: Math.max(t?.weight ?? 0, inUnit(e.weight, e.unit, unit)), times: (t?.times ?? 0) + 1 });
      }
    }
    return top;
  };
  const before = heaviest(workouts.filter((w) => w.date <= a));
  const lifts = [...heaviest(between)]
    .filter(([id]) => before.has(id))
    .sort((x, y) => y[1].times - x[1].times)
    .slice(0, 3)
    .map(([id, t]) => ({ name: t.name, from: Math.round(before.get(id)!.weight), to: Math.round(t.weight) }));
  return { days, perWeek: Math.round((days / weeks) * 10) / 10, lifts };
}
