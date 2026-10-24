import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { analyzeWeeklyVolume } from './coach';
import { mealsOf } from './foods';
import { DEFAULT_MUSCLES, foodKnown, foodMet, foodValue, hasMuscleGoals } from './goals';
import { foodByDay, type FoodDayTotal } from './progress';
import type { TrainingWindow } from './pace';
import type { FoodEntry } from '../types/food';
import type { ExerciseLibrary, FoodGoal, Goals, MuscleGroup, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// What the Training and Food twins and Today show, from the log alone (no AI): this calendar week,
// Monday first, the muscle grid with sets, protein by day and by meal, the 4-week trend and the next
// thing to do. "This week" is the calendar week; the sky and goals keep the rolling last 7 days.

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

// Monday to Sunday of the week `now` is in
export function weekDates(now: Date): string[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => ymd(addDays(monday, i)));
}

// "Oct 19 – 25", "Sep 28 – Oct 4"
export function weekRange(now: Date): string {
  const [first, , , , , , last] = weekDates(now).map(d => parseISO(d));
  return `${format(first, 'MMM d')} – ${format(last, first.getMonth() === last.getMonth() ? 'd' : 'MMM d')}`;
}

// "today", "tomorrow", "Saturday"; past a week the date
export function dayWord(date: string, today: string): string {
  const ahead = differenceInCalendarDays(parseISO(date), parseISO(today));
  return ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : ahead < 7 ? format(parseISO(date), 'EEEE') : format(parseISO(date), 'EEEE, MMM d');
}

export interface PlannedDay {
  date: string;
  name: string;
  exercises: number;
  groups: MuscleGroup[];
  templateId: string;
}

// Planned days from `from` on that aren't done, logged or skipped, soonest first
export function plannedDays(schedule: TemplateSchedule[], templates: WorkoutTemplate[], workouts: Workout[], from: string): PlannedDay[] {
  const trained = new Set(workouts.map(w => w.date));
  return schedule
    .filter(s => s.date >= from && !s.completed && !s.skipped && !trained.has(s.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap(s => {
      const t = templates.find(t => t.id === s.templateId);
      return t ? [{ date: s.date, name: t.name, exercises: t.exercises.length, groups: t.muscleGroups, templateId: t.id }] : [];
    });
}

export interface WeekDay {
  date: string;
  letter: string;
  today: boolean;
  future: boolean;
}

export interface TrainingWeek {
  days: (WeekDay & { trained: boolean; planned?: string })[];
  done: number; // days trained this week
  next?: PlannedDay; // the next planned day from today on that isn't done
}

export function trainingWeek(workouts: Workout[], schedule: TemplateSchedule[], templates: WorkoutTemplate[], now: Date): TrainingWeek {
  const today = ymd(now);
  const trained = new Set(workouts.map(w => w.date));
  const planned = plannedDays(schedule, templates, workouts, today);
  const days = weekDates(now).map((date, i) => ({
    date,
    letter: DAY_LETTERS[i],
    today: date === today,
    future: date > today,
    trained: trained.has(date),
    planned: planned.find(p => p.date === date)?.name,
  }));
  return { days, done: days.filter(d => d.trained).length, next: planned[0] };
}

export type Cell = 'on' | 'plan' | 'off';

export interface MuscleWeekRow {
  group: MuscleGroup;
  cells: Cell[]; // Monday first: trained as a main muscle, planned, or not
  times: number;
  sets: number;
  setsMissing: boolean;
  timesGoal?: number;
  setsGoal?: number;
  met?: boolean; // only with a goal to meet
}

// The grid: goal muscles (the default nine without goals), each day this week, sets so far
export function muscleWeek(goals: Goals | undefined, workouts: Workout[], schedule: TemplateSchedule[], templates: WorkoutTemplate[], library: ExerciseLibrary, now: Date): MuscleWeekRow[] {
  const dates = weekDates(now);
  const today = ymd(now);
  const win: TrainingWindow = { first: dates[0], last: dates[6], days: 7, elapsed: 0, trained: new Set() };
  const volume = analyzeWeeklyVolume(workouts, win, library);
  const trained = new Set(workouts.filter(w => w.date >= dates[0] && w.date <= dates[6]).flatMap(w => w.muscleGroups.map(g => `${w.date} ${g}`)));
  const planned = new Set(plannedDays(schedule, templates, workouts, today).filter(p => p.date <= dates[6]).flatMap(p => p.groups.map(g => `${p.date} ${g}`)));
  const withGoals = !!goals && hasMuscleGoals(goals);
  const groups = withGoals ? goals.muscles : DEFAULT_MUSCLES;
  return groups.map(group => {
    const cells = dates.map((date): Cell => (trained.has(`${date} ${group}`) ? 'on' : planned.has(`${date} ${group}`) ? 'plan' : 'off'));
    const times = cells.filter(c => c === 'on').length;
    const v = volume[group];
    const timesGoal = withGoals ? goals.timesPerWeek : undefined;
    const setsGoal = withGoals && goals.minSets ? goals.minSets[group] ?? 8 : undefined;
    const met = timesGoal === undefined && setsGoal === undefined ? undefined : (timesGoal === undefined || times >= timesGoal) && (setsGoal === undefined || v.totalSets >= setsGoal);
    return { group, cells, times, sets: v.totalSets, setsMissing: v.missingSets, timesGoal, setsGoal, met };
  });
}

export interface FoodWeek {
  days: (WeekDay & { total?: FoodDayTotal; ratio?: number; met?: boolean })[];
  logged: number; // days with food this week
  avg: number; // the goal's number (protein without a goal) a day, over logged days
  hit: number; // logged days that met the goal
}

// This week's food against the goal: a ring a day, the average and the days at goal
export function foodWeekOf(entries: FoodEntry[], goal: FoodGoal | undefined, now: Date): FoodWeek {
  const totals = foodByDay(entries);
  const today = ymd(now);
  const value = (t: FoodDayTotal) => (goal ? foodValue(goal, t) : t.protein);
  const days = weekDates(now).map((date, i) => {
    const total = totals.get(date);
    return {
      date,
      letter: DAY_LETTERS[i],
      today: date === today,
      future: date > today,
      total,
      ratio: total && goal ? Math.min(1, value(total) / goal.target) : undefined,
      met: total && goal ? foodMet(goal, total) : undefined,
    };
  });
  const logged = days.filter(d => d.total);
  return {
    days,
    logged: logged.length,
    avg: logged.length ? Math.round(logged.reduce((s, d) => s + value(d.total!), 0) / logged.length) : 0,
    hit: days.filter(d => d.met).length,
  };
}

export interface Trend {
  weeks: (number | undefined)[]; // the goal's number a day, the last 4 calendar weeks, oldest first; unknown with no food
  from?: number; // the oldest week with food
  to?: number; // this week
  line: string; // "a day · up 3 weeks running"
}

// The 4-week trend: a direction first, the bars second
export function foodTrend(entries: FoodEntry[], goal: FoodGoal | undefined, now: Date): Trend {
  const totals = foodByDay(entries);
  const value = (t: FoodDayTotal) => (goal ? foodValue(goal, t) : t.protein);
  const weeks = [3, 2, 1, 0].map(back => {
    const days = weekDates(subDays(now, 7 * back)).map(d => totals.get(d)).filter((t): t is FoodDayTotal => !!t);
    return days.length ? Math.round(days.reduce((s, t) => s + value(t), 0) / days.length) : undefined;
  });
  const known = weeks.filter((w): w is number => w !== undefined);
  const to = weeks[3];
  let up = 0;
  for (let i = 3; i > 0 && weeks[i] !== undefined && weeks[i - 1] !== undefined && weeks[i]! > weeks[i - 1]!; i--) up++;
  const last = weeks[2];
  const line = up >= 2 ? `a day · up ${up} weeks running` : up === 1 ? 'a day · up from last week' : to !== undefined && last !== undefined && to < last ? 'a day · down from last week' : 'a day';
  return { weeks, from: known.length > 1 ? known[0] : undefined, to, line };
}

export interface MealBubble {
  name: string; // "Morning", "Evening"
  time: string; // "8:10 am", "to go"
  hour: number; // 8.17; where it sits on the 6 am – 10 pm axis
  grams: number; // protein
  toGo?: boolean;
}

// Where the next meal usually lands, after the latest one
const SLOTS: [name: string, hour: number][] = [['Morning', 8], ['Midday', 12.5], ['Afternoon', 15.5], ['Evening', 19]];
// after today's logged meals (or from an hour and a half ago when none yet)
export const nextMeal = (meals: { hour: number }[], now: Date) => {
  const after = meals.length ? meals[meals.length - 1].hour : now.getHours() + now.getMinutes() / 60 - 1.5;
  return SLOTS.find(([, h]) => h > after);
};
const hourOf = (iso: string) => {
  const d = parseISO(iso);
  return d.getHours() + d.getMinutes() / 60;
};

// Today by meal: one bubble per logged message, sized by protein; meals within 45 minutes become one
// bubble, six is the most shown; a dashed bubble for what's left to the goal where the next meal usually lands
export function mealBubbles(todays: FoodEntry[], goal: FoodGoal | undefined, now: Date): MealBubble[] {
  let meals = mealsOf(todays).map(m => ({ name: m.name, time: m.time, hour: hourOf(m.entry.createdAt), grams: Math.round(m.macros.protein) }));
  const merge = (i: number) => {
    const [a, b] = [meals[i], meals[i + 1]];
    meals.splice(i, 2, { ...a, grams: a.grams + b.grams });
  };
  for (let i = 0; i < meals.length - 1; ) {
    if (meals[i + 1].hour - meals[i].hour <= 0.75) merge(i);
    else i++;
  }
  while (meals.length > 6) {
    let closest = 0;
    for (let i = 1; i < meals.length - 1; i++) if (meals[i + 1].hour - meals[i].hour < meals[closest + 1].hour - meals[closest].hour) closest = i;
    merge(closest);
  }
  const protein = meals.reduce((s, m) => s + m.grams, 0);
  const left = goal?.kind === 'protein' ? goal.target - protein : 0;
  const next = left > 0 ? nextMeal(meals, now) : undefined;
  return next ? [...meals, { name: next[0], time: 'to go', hour: next[1], grams: left, toGo: true }] : meals;
}

// Bubble centres in points on an axis `width` wide (6 am at the left edge, 10 pm at the right), kept
// `gap` apart so labels never overlap, and inside the edges
export function layoutMeals(hours: number[], width: number, gap: number, edge = 24): number[] {
  const xs = hours.map(h => edge + Math.min(1, Math.max(0, (h - 6) / 16)) * (width - 2 * edge));
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + gap);
  for (let i = xs.length - 1; i >= 0; i--) xs[i] = Math.min(xs[i], width - edge - (xs.length - 1 - i) * gap);
  return xs.map(x => Math.max(edge, x));
}

export interface NextUp {
  title: string;
  sub?: string;
  action?: 'start' | 'log' | 'plan'; // the button: start today's plan, log the next meal, plan tomorrow
  meal?: string; // "dinner", for the Log button's text
}

const MEAL_WORD: Record<string, string> = { Morning: 'breakfast', Midday: 'lunch', Afternoon: 'a snack', Evening: 'dinner' };

// "Start Legs" while today's plan isn't done; else the next meal with what's left and what you usually
// have then (for those who log food); "Plan tomorrow" for those who train when nothing is; else what's done
export function nextUp(input: {
  plannedToday?: PlannedDay;
  trainedToday: boolean;
  lifts: boolean; // has workouts or a plan
  eats: boolean; // logs food or set a food goal
  slot?: string; // nextMeal()'s name: the next meal's slot, none after the last
  goal?: FoodGoal;
  today?: FoodDayTotal;
  bubbles: MealBubble[]; // mealBubbles(): the dashed one is the next meal
  usual?: { items: string; around: string }; // what you usually log in that slot
  plannedAhead: boolean;
}): NextUp {
  const { plannedToday, trainedToday, lifts, eats, slot, goal, today, bubbles, usual, plannedAhead } = input;
  if (plannedToday && !trainedToday) return { title: `Start ${plannedToday.name}`, sub: `${plannedToday.exercises} exercise${plannedToday.exercises === 1 ? '' : 's'} · planned for today`, action: 'start' };
  const toGo = bubbles.find(b => b.toGo);
  if (toGo) {
    const meal = MEAL_WORD[toGo.name];
    return { title: `Log ${meal} · ${toGo.grams} g to go`, sub: usual ? `Usually ${usual.items}, around ${usual.around}` : `${today?.protein ?? 0} g of ${goal!.target} g so far`, action: 'log', meal };
  }
  if (eats && goal?.kind !== 'protein' && slot) {
    const meal = MEAL_WORD[slot];
    return { title: `Log ${meal}`, sub: usual ? `Usually ${usual.items}, around ${usual.around}` : 'In the bar', action: 'log', meal };
  }
  if (lifts && !plannedAhead) return { title: 'Plan tomorrow', sub: 'Nothing planned yet', action: 'plan' };
  if (goal?.kind === 'protein' && today && today.protein >= goal.target) return { title: 'Protein goal met', sub: `${today.protein} g of ${goal.target} g` };
  return trainedToday ? { title: 'Done for today', sub: 'Rest up' } : { title: 'Log what you did', sub: 'A workout, a meal, or both, in the bar' };
}

export type GoalCell = 'met' | 'partly' | 'missed' | 'none' | 'future';

export interface GoalWeek {
  goal: FoodGoal;
  cells: GoalCell[]; // Monday first; partly is halfway there (or just over on a cut)
  hit: number; // days at goal this week
  logged: number; // days with food this week
  today?: number; // today's value, once there is food today
  known: boolean; // the food log carries this goal's number (fiber and GI are estimates it may not have yet)
}

// One row of Food's goals card: each day this week against the goal, and where today stands
export function goalWeek(goal: FoodGoal, totals: Map<string, FoodDayTotal>, now: Date): GoalWeek {
  const today = ymd(now);
  const dates = weekDates(now);
  const days = dates.map(d => totals.get(d));
  const known = days.some(t => t && foodKnown(goal, t));
  const cells = dates.map((date, i): GoalCell => {
    const t = days[i];
    if (date > today) return 'future';
    if (!t || !foodKnown(goal, t)) return 'none';
    if (foodMet(goal, t)) return 'met';
    const v = foodValue(goal, t);
    return (goal.kind === 'cut' ? v <= goal.target * 1.1 : v >= goal.target / 2) ? 'partly' : 'missed';
  });
  const todayTotal = totals.get(today);
  return {
    goal,
    cells,
    hit: cells.filter(c => c === 'met').length,
    logged: days.filter(t => t && foodKnown(goal, t)).length,
    today: todayTotal && foodKnown(goal, todayTotal) ? foodValue(goal, todayTotal) : undefined,
    known,
  };
}
