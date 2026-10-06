import { addDays, differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { catalogById, exerciseKey } from '../data/catalog';
import { displayName, resolveId } from './exerciseIdentity';
import { trainingWindow, usualPerWeek, ymd } from './pace';
import type { Exercise, ExerciseLibrary, MuscleGroup, WeightUnit, Workout } from '../types/workout';

// The facts everything on the Progress tab (and later the check-in) is built from. Local and
// deterministic, no AI. Detail is optional in this app: every exercise counts by when and how
// often it was done, numbers are extras, and a missing number is unknown, never zero.

const daysBetween = (a: string, b: string) => differenceInCalendarDays(parseISO(a), parseISO(b));
const hasNumbers = (e: Exercise) => Boolean(e.sets || e.reps || e.weight || e.duration || e.distance);

export type LoggingStyle = 'names only' | 'mixed' | 'full detail';

export interface ExerciseSummary {
  id: string; // resolved exercise id (or the name, for an entry without one)
  name: string;
  lastDate: string;
  lastDoneDaysAgo: number;
  timesLast28Days: number; // distinct days
  withNumbers: boolean;
}

export interface LiftSet {
  date: string;
  weight: number;
  unit: WeightUnit;
  reps?: number;
  sets?: number;
  note?: string;
}

export interface LiftTrend {
  id: string;
  lift: string;
  recent: LiftSet[]; // newest first, at most 5, all in the latest set's unit
  isAllTimeBest: boolean; // the latest top set beats every earlier one
  sessionsAtSameTopSet: number; // how many sessions in a row the latest weight × reps has held
  trend: 'up' | 'flat';
}

export type Digest = ReturnType<typeof digest>;

export function digest(workouts: Workout[], library: ExerciseLibrary, unit: WeightUnit, now: Date = new Date()) {
  const today = ymd(now);
  const since = (n: number) => ymd(subDays(now, n));
  const past = workouts.filter((w) => w.date <= today);
  const dates = past.map((w) => w.date);
  const all = past.flatMap((w) => w.exercises.map((e) => ({ date: w.date, e, id: e.exerciseId ? resolveId(e.exerciseId, library) : e.name })));
  const nameOf = (id: string, fallback: string) => displayName(id, library) ?? fallback;

  // Every exercise, numbers or not: when it was last done and how often lately
  const byId = new Map<string, typeof all>();
  for (const x of all) byId.set(x.id, [...(byId.get(x.id) ?? []), x]);
  const exercises: ExerciseSummary[] = [...byId.entries()]
    .map(([id, xs]) => {
      const lastDate = xs.reduce((m, x) => (x.date > m ? x.date : m), xs[0].date);
      return {
        id,
        name: nameOf(id, xs[0].e.name),
        lastDate,
        lastDoneDaysAgo: daysBetween(today, lastDate),
        timesLast28Days: new Set(xs.filter((x) => x.date > since(28)).map((x) => x.date)).size,
        withNumbers: xs.some((x) => hasNumbers(x.e)),
      };
    })
    .sort((a, b) => b.timesLast28Days - a.timesLast28Days || a.lastDoneDaysAgo - b.lastDoneDaysAgo);

  // Weighted lifts done at least twice, last within 4 weeks. Unsure entries wait for the user,
  // as they do for PRs (services/progress.ts).
  const liftTrends: LiftTrend[] = [...byId.entries()].flatMap(([id, xs]) => {
    // One top set per day (heaviest, then most reps): warm-ups and repeated entries aren't sessions
    const top = new Map<string, LiftSet>();
    for (const x of xs) {
      if (!x.e.weight || x.e.match === 'unsure') continue;
      const s = { date: x.date, weight: x.e.weight, unit: x.e.unit ?? unit, reps: x.e.reps, sets: x.e.sets, note: x.e.notes };
      const t = top.get(s.date);
      if (!t || s.weight > t.weight || (s.weight === t.weight && (s.reps ?? 0) > (t.reps ?? 0))) top.set(s.date, s);
    }
    const sets = [...top.values()].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sets[0];
    // Stored units are never converted, so only sets in the latest unit compare
    const same = sets.filter((s) => s.unit === latest?.unit);
    if (same.length < 2 || latest.date <= since(28)) return [];
    let held = 0;
    for (const s of same) if (s.weight === latest.weight && s.reps === latest.reps) held++; else break;
    const earlier = same.slice(1);
    return [{
      id,
      lift: nameOf(id, xs[0].e.name),
      recent: same.slice(0, 5),
      isAllTimeBest: earlier.every((s) => s.weight < latest.weight || (s.weight === latest.weight && (s.reps ?? 0) < (latest.reps ?? 0))),
      sessionsAtSameTopSet: held,
      trend: held < 3 && latest.weight > same[same.length - 1].weight ? 'up' : 'flat',
    }];
  });

  const numbered = all.filter((x) => hasNumbers(x.e)).length / Math.max(1, all.length);
  const loggingStyle: LoggingStyle = numbered === 0 ? 'names only' : numbered >= 0.7 ? 'full detail' : 'mixed';

  // A break of 10+ days that ended in the last 4 weeks. "Usual" is then the 4 weeks before it,
  // so a comeback is welcomed rather than judged against the empty weeks.
  const days = [...new Set(dates)].sort();
  const gaps = days.slice(1).map((to, i) => ({ from: days[i], to, days: daysBetween(to, days[i]) }));
  const comeback = gaps.filter((g) => g.to > since(28) && g.days >= 10).at(-1) ?? null;
  const usualNow = comeback ? addDays(parseISO(comeback.from), 7) : now;
  // No sessions in those 4 weeks means no usual yet (pace.ts would assume 3 a week)
  const hasUsual = trainingWindow(dates, 28, subDays(usualNow, 7)).trained.size > 0;

  const groupLast: Partial<Record<MuscleGroup, string>> = {};
  for (const w of past) for (const g of w.muscleGroups) if (!groupLast[g] || w.date > groupLast[g]!) groupLast[g] = w.date;

  return {
    today,
    sessionsLast7: trainingWindow(dates, 7, now).trained.size, // distinct training days
    usualPerWeek: hasUsual ? usualPerWeek(dates, usualNow) : null, // distinct training days
    // Training days in each rolling 7-day block, oldest first, ending today
    weeklySessionsLast8: Array.from({ length: 8 }, (_, i) => trainingWindow(dates, 7, subDays(now, 7 * (7 - i))).trained.size),
    daysSinceLastWorkout: days.length ? daysBetween(today, days[days.length - 1]) : null,
    comeback,
    daysSinceGroupTrained: Object.fromEntries(Object.entries(groupLast).map(([g, d]) => [g, daysBetween(today, d!)])) as Partial<Record<MuscleGroup, number>>,
    exercises,
    liftTrends,
    runs: all
      .filter((x) => x.id === 'running' && x.e.distance && x.e.duration)
      .map((x) => ({ date: x.date, distance: x.e.distance!, distanceUnit: x.e.distanceUnit ?? 'km', minutes: x.e.duration! }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    loggingStyle,
    numberedShare: Math.round(numbered * 100) / 100,
    recentLog: past.filter((w) => w.date > since(21)).sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ date: w.date, rawInput: w.rawInput })),
  };
}

// ---------------------------------------------------------------- next-session targets
// Double progression, computed in code so the AI never invents a number. The user's own notes
// ("felt heavy", "felt easy") are the brake and the accelerator.

export interface Target {
  id: string;
  lift: string;
  last: string;
  next: string;
  why: string;
}

const HEAVY = /heavy|hard|grind|tough|struggl|fail/i;
const EASY = /easy|light|smooth|more in the tank/i;

export function target(t: LiftTrend): Target {
  const { weight, unit, reps, sets, note = '' } = t.recent[0];
  const { pattern, equipment } = catalogById.get(t.id) ?? {};
  const kg = unit === 'kg' ? 'kg' : '';
  // Unknown reps or sets stay unknown: the target only says what the user's own log can support
  const show = (w: number, r?: string | number) => `${w}${kg}${r === undefined ? '' : `x${r}`}${sets && sets > 1 ? ` ×${sets}` : ''}`;
  const last = show(weight, reps);
  const inc = unit === 'kg' ? 2.5 : 5;
  const round = (x: number) => Math.round(x / inc) * inc;
  const lower = pattern === 'squat' || pattern === 'hinge' || pattern === 'lunge';
  const step = equipment === 'dumbbell' || pattern === 'isolation' ? 0 : lower ? 2 * inc : inc;
  const heavyLately = t.recent.slice(0, 3).some((s) => HEAVY.test(s.note ?? ''));
  const base = { id: t.id, lift: t.lift, last };

  if (t.sessionsAtSameTopSet >= 3 && heavyLately) {
    return { ...base, next: show(round(weight * 0.9), reps === undefined ? undefined : reps + 2), why: `Stuck at ${last} for ${t.sessionsAtSameTopSet} sessions and it's felt heavy. Drop about 10%, add reps, rebuild for 2–3 weeks.` };
  }
  if (HEAVY.test(note)) return { ...base, next: last, why: 'Felt heavy last time. Repeat it and own it.' };
  if (reps === undefined) return { ...base, next: show(weight + (step || inc)), why: 'Small step up.' };
  if (step === 0) {
    // Dumbbells and isolation: add reps first, weight once the top of the range is reached
    return reps >= 12
      ? { ...base, next: show(weight + inc, reps - 4), why: 'Top of the rep range: go up one weight step, reset reps.' }
      : { ...base, next: show(weight, `${reps + 1}–${reps + 2}`), why: 'Add a rep or two before adding weight.' };
  }
  const why = EASY.test(note) ? 'Felt easy: add weight.' : t.sessionsAtSameTopSet >= 2 ? `Held ${weight}${kg} twice: time to add weight.` : 'Moving well: small step up.';
  return { ...base, next: show(weight + step, reps), why };
}

// ---------------------------------------------------------------- checks on AI replies
// Every AI line the app shows passes these first. They match names and numbers, not meaning:
// a guard, not proof.

// Remarks about how someone logs ("log your weights", "more detail") are never shown
export const NAG = /\b(log(ging)? (more|your|the)|(?<!on )track(ing)?\b(?! (record|day))|record(ing)? (your|more)|more detail|weights? and reps|set counts?|numbers? (to|so)|missing)\b/i;

// Exercises a reply names that the user has never logged
export const unknownExercises = (names: string[], d: Digest) => {
  const known = new Set(d.exercises.map((e) => exerciseKey(e.name)));
  return names.filter((n) => !known.has(exerciseKey(n)));
};

// Numbers in a reply that appear nowhere in what the model was given. 1-3 are too common to check.
export function inventedNumbers(text: string, given: unknown): string[] {
  const NUM = /\d+(?:\.\d+)?/g;
  const source = new Set((JSON.stringify(given).match(NUM) ?? []).map(Number));
  const nums = text.match(NUM) ?? [];
  return [...new Set(nums.filter((n) => !/^[123]$/.test(n) && !source.has(Number(n))))];
}
