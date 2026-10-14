import { format, parseISO, subDays } from 'date-fns';
import { analyzeWeeklyVolume } from './coach';
import { digest, target } from './insights';
import { exerciseKey } from '../data/catalog';
import { knownIdFor, displayName } from './exerciseIdentity';
import { entriesFor, metricFor, personalRecords, foodByDay, foodWeek } from './progress';
import { localFoodParse, usualPortions, sumMacros } from './foods';
import { amountLabel } from './foodUnits';
import { foodById } from '../data/foods';
import { trainingWindow, ymd } from './pace';
import { workoutName, exerciseNumbers } from './format';
import { clean, exerciseLine, foodHabits, note, setLine, type PackInput } from './coachPack';
import { MAX_TOOL_RESULT_CHARS, TOOL_NAMES } from '../server/src/coach';
import type { MuscleGroup } from '../types/workout';
import type { FoodItem } from '../types/food';

// The coach's read tools, run on the phone over its own log (data/lifttext-agentic/report.md §2.2).
// Pure and deterministic: the same inputs give the same JSON, so evals/coach can run them on a fixture.
// Every number in a result is traceable to the log, which lets services/coachGuards.ts hold the coach
// to it. Results are compact and capped (MAX_TOOL_RESULT_CHARS); the Worker refuses bigger ones.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WORKOUT_DAYS = 31;
const MAX_FOOD_DAYS = 14;
const SESSIONS = 10;

// A date span the user asked about, clipped to today and to a maximum length (counted back from `to`)
function span(input: Record<string, unknown>, now: Date, maxDays: number): { from: string; to: string } | { error: string } {
  const { from, to } = input;
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE.test(from) || !DATE.test(to)) return { error: 'from and to must be YYYY-MM-DD' };
  const today = ymd(now);
  const [a, b] = from <= to ? [from, to] : [to, from];
  const end = b > today ? today : b;
  const earliest = ymd(subDays(parseISO(end), maxDays - 1));
  return { from: a < earliest ? earliest : a, to: end };
}

const round1 = (n: number) => Math.round(n * 2) / 2;

function queryWorkouts(input: Record<string, unknown>, data: PackInput, now: Date) {
  const s = span(input, now, MAX_WORKOUT_DAYS);
  if ('error' in s) return s;
  const days = data.workouts
    .filter(w => w.date >= s.from && w.date <= s.to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => clean({ date: w.date, name: workoutName(w.muscleGroups), exercises: w.exercises.map(exerciseLine), notes: note(w.notes) }));
  return { from: s.from, to: s.to, days, trainingDays: new Set(days.map(d => d.date)).size };
}

function exerciseHistory(input: Record<string, unknown>, data: PackInput, now: Date) {
  const name = typeof input.exercise === 'string' ? input.exercise.trim() : '';
  const d = digest(data.workouts, data.library, data.settings.weightUnit, now);
  const key = exerciseKey(name);
  const known = key ? knownIdFor(name, data.library) : undefined;
  const summary = d.exercises.find(e => e.id === known) ?? d.exercises.find(e => exerciseKey(e.name) === key) ?? d.exercises.find(e => key && (exerciseKey(e.name).includes(key) || key.includes(exerciseKey(e.name))));
  if (!summary) return { error: `Nothing logged as "${name}"`, logged: d.exercises.slice(0, 12).map(e => e.name) };
  const id = summary.id;
  const today = ymd(now);
  const entries = entriesFor(data.workouts, id, data.library).filter(e => e.date <= today);
  const metric = metricFor(id, data.library);
  // One line per day, the top set (heaviest, then most reps) when weights were logged
  const byDay = new Map<string, (typeof entries)[number]>();
  for (const e of entries) {
    const t = byDay.get(e.date);
    const w = e.exercise.weight ?? 0;
    if (!t || w > (t.exercise.weight ?? 0) || (w === (t.exercise.weight ?? 0) && (e.exercise.reps ?? 0) > (t.exercise.reps ?? 0))) byDay.set(e.date, e);
  }
  const sessions = [...byDay.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SESSIONS)
    .map(e => {
      const x = e.exercise;
      const n = x.weight ? setLine({ weight: x.weight, reps: x.reps, sets: x.sets }) : exerciseNumbers(x);
      return `${e.date}${n ? ` ${n}` : ''}${x.notes ? ` (${note(x.notes)})` : ''}`;
    });
  const pr = personalRecords(entries, metric, data.settings.weightUnit);
  const unit = data.settings.weightUnit;
  const at = (e?: { date: string }) => (e ? ` on ${e.date}` : '');
  const prs = clean({
    heaviest: pr.heaviest && `${pr.heaviest.exercise.weight} ${pr.heaviest.exercise.unit ?? unit}${pr.heaviest.exercise.reps ? ` x${pr.heaviest.exercise.reps}` : ''}${at(pr.heaviest)}`,
    bestEstimated1RM: pr.bestE1rm && `${pr.bestE1rm.value} ${unit}${at(pr.bestE1rm.entry)}`,
    mostReps: pr.mostReps && `${pr.mostReps.exercise.reps} reps${pr.mostReps.exercise.weight ? ` at ${pr.mostReps.exercise.weight}` : ''}${at(pr.mostReps)}`,
    longest: pr.longest && `${pr.longest.exercise.duration} min${at(pr.longest)}`,
    longestDistance: pr.longestDistance && `${pr.longestDistance.exercise.distance} ${pr.longestDistance.exercise.distanceUnit ?? 'km'}${at(pr.longestDistance)}`,
  });
  const trend = d.liftTrends.find(t => t.id === id);
  const next = trend && target(trend);
  return clean({
    exercise: displayName(id, data.library) ?? summary.name,
    lastDoneDaysAgo: summary.lastDoneDaysAgo,
    timesLast28Days: summary.timesLast28Days,
    sessions,
    prs: Object.keys(prs).length ? prs : undefined,
    trend: trend?.trend,
    heldSessions: trend?.sessionsAtSameTopSet,
    best: trend?.isAllTimeBest ? 'latest is the all-time best' : undefined,
    next: next?.next,
    why: next?.why,
  });
}

function muscleVolume(input: Record<string, unknown>, data: PackInput, now: Date) {
  const weeks = Math.min(8, Math.max(1, Math.round(Number(input.weeks)) || 4));
  const dates = data.workouts.map(w => w.date);
  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const win = trainingWindow(dates, 7, subDays(now, 7 * (weeks - 1 - i)));
    const volume = analyzeWeeklyVolume(data.workouts, win);
    const sets = Object.fromEntries(Object.values(volume).filter(v => v.totalSets > 0).map(v => [v.muscleGroup, round1(v.totalSets)])) as Partial<Record<MuscleGroup, number>>;
    return { from: win.first, to: win.last, trainingDays: win.trained.size, sets };
  });
  const d = digest(data.workouts, data.library, data.settings.weightUnit, now);
  return clean({ perWeek, daysSinceMuscle: d.daysSinceGroupTrained, waitingLongerThanUsual: d.staleGroups.length ? d.staleGroups : undefined });
}

function foodLog(input: Record<string, unknown>, data: PackInput, now: Date) {
  const s = span(input, now, MAX_FOOD_DAYS);
  if ('error' in s) return s;
  const entries = data.foodEntries.filter(e => e.date >= s.from && e.date <= s.to);
  const totals = foodByDay(entries);
  const days = [...totals.keys()].sort().map(date => {
    const meals = entries
      .filter(e => e.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(e => ({ time: format(new Date(e.createdAt), 'HH:mm'), foods: e.items.map(i => `${i.name} ${Math.round(i.grams ?? 0)} g: ${Math.round(i.macros.protein)} g protein, ${Math.round(i.macros.kcal)} kcal`) }));
    const m = sumMacros(entries.filter(e => e.date === date).flatMap(e => e.items));
    return { date, protein: Math.round(m.protein), kcal: Math.round(m.kcal), carbs: Math.round(m.carbs), fat: Math.round(m.fat), meals };
  });
  return { from: s.from, to: s.to, days };
}

function foodPatterns(data: PackInput, now: Date) {
  const since = ymd(subDays(now, 28));
  const today = ymd(now);
  const habits = foodHabits(data.foodEntries, now);
  const avoid = (data.settings.profile?.facts ?? []).filter(f => f.kind === 'food').map(f => f.text);
  return clean({
    usualMeals: Object.keys(habits.usualMeals).length ? habits.usualMeals : undefined,
    usualPortions: habits.usualPortions.length ? habits.usualPortions : undefined,
    topProtein: foodWeek(data.foodEntries, now).top,
    foodsLogged: [...new Set(data.foodEntries.filter(e => e.date >= since && e.date <= today).flatMap(e => e.items.map(i => i.name)))].slice(0, 40),
    avoid: avoid.length ? avoid : undefined,
  });
}

// USDA numbers for a meal written as "amount food" items; foods the table doesn't know come back by
// name. `parsed` is the priced items themselves, for the meal card (services/coachCards.ts).
export function estimateMeal(items: unknown, foodEntries: PackInput['foodEntries']): { result: Record<string, unknown>; parsed: FoodItem[] } {
  const list = Array.isArray(items) ? items.filter((i): i is string => typeof i === 'string' && i.trim() !== '').slice(0, 12) : [];
  if (!list.length) return { result: { error: 'items must be a list of foods with amounts, like "200 g chicken breast"' }, parsed: [] };
  const parsed = localFoodParse(list.join(', '), usualPortions(foodEntries)).items;
  const known = parsed.filter(i => i.source === 'usda');
  const total = sumMacros(known);
  const unknown = parsed.filter(i => i.source === 'estimate').map(i => i.said ?? i.name);
  const result = clean({
    items: known.map(i => ({
      food: i.name,
      amount: amountLabel(i.qty, i.unit, i.foodId ? foodById.get(i.foodId) : undefined),
      grams: i.grams,
      protein: Math.round(i.macros.protein),
      kcal: Math.round(i.macros.kcal),
      carbs: Math.round(i.macros.carbs),
      fat: Math.round(i.macros.fat),
    })),
    total: known.length ? { protein: Math.round(total.protein), kcal: Math.round(total.kcal), carbs: Math.round(total.carbs), fat: Math.round(total.fat) } : undefined,
    unknown: unknown.length ? unknown : undefined,
  });
  return { result, parsed: known };
}

// A result the Worker accepts: while it is too long, the longest top-level list loses its last entry
function fit<T extends Record<string, unknown>>(result: T): T {
  let out: Record<string, unknown> = { ...result };
  while (JSON.stringify(out).length > MAX_TOOL_RESULT_CHARS) {
    const lists = Object.entries(out).filter(([, v]) => Array.isArray(v) && v.length > 1) as [string, unknown[]][];
    if (!lists.length) break;
    const [k, v] = lists.sort((a, b) => JSON.stringify(b[1]).length - JSON.stringify(a[1]).length)[0];
    out = { ...out, [k]: v.slice(0, -1), truncated: true };
  }
  return out as T;
}

// Runs one tool call. Unknown names and bad inputs come back as { error } for the model to read.
export function runTool(name: string, input: unknown, data: PackInput, now: Date = new Date()): Record<string, unknown> {
  const args = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  if (!TOOL_NAMES.includes(name)) return { error: `No tool called ${name}` };
  switch (name) {
    case 'query_workouts': return fit(queryWorkouts(args, data, now));
    case 'exercise_history': return fit(exerciseHistory(args, data, now));
    case 'muscle_volume': return fit(muscleVolume(args, data, now));
    case 'food_log': return fit(foodLog(args, data, now));
    case 'food_patterns': return fit(foodPatterns(data, now));
    default: return fit(estimateMeal(args.items, data.foodEntries).result);
  }
}
