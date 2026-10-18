import { format, parseISO, subDays } from 'date-fns';
import { analyzeWeeklyVolume } from './coach';
import { digest, target } from './insights';
import { goalLines, goalProgress, goalProgressLines } from './goals';
import { foodByDay, foodWeek } from './progress';
import { usualMeals } from './suggestions';
import { itemFor, usualPortions } from './foods';
import { trainingWindow } from './pace';
import { workoutName } from './format';
import { foodById } from '../data/foods';
import type { ExerciseLibrary, MuscleGroup, UserSettings, Workout } from '../types/workout';
import type { FoodEntry } from '../types/food';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// The context pack: what the coach knows about you, about 1.1K tokens, built on the phone from the
// same digest functions Progress uses. Pure, deterministic, no AI. This is all that leaves the phone
// with a question (besides the question): a 4-week summary, never the whole log, never who you are.
// Every number the coach may say is in here, so services/coachGuards.ts can check its answer.

const LAST_SESSIONS = 3;
const EXERCISES = 12;
const LIFTS = 8;
const RECENT_SETS = 4;
const FOODS = 20;
const PORTIONS = 12;
const NOTE_CHARS = 80;

export const note = (s?: string) => (s ? s.slice(0, NOTE_CHARS) : undefined);
export const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;

// "Squat 185x5 ×3 (felt heavy again)", "Leg Press", "Running 28 min": one logged exercise as a line
export function exerciseLine(e: { name: string; sets?: number; reps?: number; weight?: number; duration?: number; notes?: string }): string {
  const n = e.weight ? ` ${setLine({ weight: e.weight, reps: e.reps, sets: e.sets })}` : e.sets && e.reps ? ` ${e.sets}x${e.reps}` : e.duration ? ` ${e.duration} min` : '';
  return `${e.name}${n}${e.notes ? ` (${note(e.notes)})` : ''}`;
}
// "185x5 ×3"
export const setLine = (s: { weight: number; reps?: number; sets?: number }) => `${s.weight}${s.reps !== undefined ? `x${s.reps}` : ''}${s.sets && s.sets > 1 ? ` ×${s.sets}` : ''}`;

// What you usually eat, with its numbers: the usual meal per slot and your usual amount of each food.
// Shared by the pack and the food_patterns tool (services/coachTools.ts).
export function foodHabits(foodEntries: FoodEntry[], now: Date) {
  const usualMealLines = Object.fromEntries(usualMeals(foodEntries, now).map(u => [u.slot, `${u.entry.items.map(i => `${i.name} ${Math.round(i.macros.protein)} g protein ${Math.round(i.macros.kcal)} kcal`).join(', ')} (${u.days} of the last 14 days)`]));
  const portions = [...usualPortions(foodEntries)].slice(0, PORTIONS).flatMap(([id, p]) => {
    const food = foodById.get(id);
    if (!food) return [];
    const item = itemFor(food, p.qty, p.unit);
    return [`${food.name} ${p.qty} ${p.unit}: ${Math.round(item.macros.protein)} g protein, ${item.macros.kcal} kcal`];
  });
  return { usualMeals: usualMealLines, usualPortions: portions };
}

// Things you told the coach, as it reads them: "food: no dairy (said 2026-10-01)"
export const factLines = (settings: UserSettings) => (settings.profile?.facts ?? []).map(f => `${f.kind}: ${f.text} (said ${f.saidOn})`);

export interface PackInput {
  workouts: Workout[];
  foodEntries: FoodEntry[];
  settings: UserSettings;
  library: ExerciseLibrary;
  schedule?: TemplateSchedule[];
  templates?: WorkoutTemplate[];
}

export type CoachPack = ReturnType<typeof buildCoachPack>;

export function buildCoachPack({ workouts, foodEntries, settings, library, schedule = [], templates = [] }: PackInput, now: Date = new Date()) {
  const unit = settings.weightUnit;
  const d = digest(workouts, library, unit, now);
  const today = d.today;
  const inc = unit === 'kg' ? 2.5 : 5;
  const step = (x: number) => Math.round(x / inc) * inc;
  const set = setLine;

  // Sets per muscle over the last 4 weeks (1 for the main muscle, ½ per helper)
  const volume = analyzeWeeklyVolume(workouts, trainingWindow(workouts.map(w => w.date), 28, now), library);
  const setsPerMuscleLast4Weeks = Object.fromEntries(
    Object.values(volume).filter(v => v.totalSets > 0).map(v => [v.muscleGroup, Math.round(v.totalSets * 2) / 2]),
  ) as Partial<Record<MuscleGroup, number>>;

  const lastSessions = [...workouts]
    .filter(w => w.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LAST_SESSIONS)
    .map(w => clean({
      date: w.date,
      name: workoutName(w.muscleGroups),
      exercises: w.exercises.map(exerciseLine),
      notes: note(w.notes),
    }));

  // The lifts with numbers: last top sets, the app's own next target, and lighter versions for a comeback
  const lifts = d.liftTrends.slice(0, LIFTS).map(t => {
    const next = target(t);
    const latest = t.recent[0];
    return clean({
      lift: t.lift,
      recent: t.recent.slice(0, RECENT_SETS).map(s => `${s.date} ${set(s)}${s.note ? ` (${note(s.note)})` : ''}`),
      best: t.isAllTimeBest ? 'latest is the all-time best' : undefined,
      trend: t.trend,
      heldSessions: t.sessionsAtSameTopSet,
      next: next.next,
      why: next.why,
      lighter: { '10% off': step(latest.weight * 0.9), '20% off': step(latest.weight * 0.8) },
    });
  });

  const goals = settings.goals && goalProgress(settings.goals, workouts, library, foodEntries, now);
  const goalLinesNow = goals
    ? [...goalProgressLines(goals), ...(goals.food ? [`food goal: ${goals.food.hit} of ${goals.food.logged} logged days met`] : [])]
    : [];

  const plannedAhead = schedule
    .filter(s => s.date >= today && !s.completed && !s.skipped)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map(s => ({ date: s.date, name: templates.find(t => t.id === s.templateId)?.name ?? 'Planned workout' }));

  const training = clean({
    daysSinceLastWorkout: d.daysSinceLastWorkout,
    sessionsLast7: d.sessionsLast7,
    usualPerWeek: d.usualPerWeek,
    weeksInARow: d.weeksInARow,
    totalSessions: d.totalSessions,
    comeback: d.comeback ? { from: d.comeback.from, to: d.comeback.to, daysOff: d.comeback.days } : undefined,
    daysSinceMuscle: d.daysSinceGroupTrained,
    stale: d.staleGroups.length ? d.staleGroups : undefined,
    setsPerMuscleLast4Weeks,
    lastSessions,
    exercises: d.exercises.slice(0, EXERCISES).map(e => `${e.name}: last ${e.lastDoneDaysAgo} days ago, ${e.timesLast28Days}x in 4 weeks`),
    lifts: lifts.length ? lifts : undefined,
    goals: goalLinesNow.length ? goalLinesNow : undefined,
    plannedAhead: plannedAhead.length ? plannedAhead : undefined,
    loggingStyle: d.loggingStyle,
  });

  // Food: only for people who log it. Averages over logged days; today's total and what's left to the goal.
  const week = foodWeek(foodEntries, now);
  const since14 = format(subDays(now, 14), 'yyyy-MM-dd');
  const todayFood = foodByDay(foodEntries).get(today);
  const foodGoal = settings.goals?.food;
  const left = foodGoal && todayFood ? Math.max(0, foodGoal.target - (foodGoal.kind === 'protein' ? todayFood.protein : todayFood.kcal)) : undefined;
  // Your usual meals and your usual amount of each food with their numbers, so a meal idea can quote them
  const { usualMeals: meals, usualPortions: portions } = foodHabits(foodEntries, now);
  const foodsLogged = [...new Set(foodEntries.filter(e => e.date >= since14 && e.date <= today).flatMap(e => e.items.map(i => i.name)))].slice(0, FOODS);
  const food = foodEntries.length
    ? clean({
        loggedDaysLast7: week.logged,
        avgPerLoggedDay: week.logged ? { protein: week.protein, kcal: week.kcal, carbs: week.carbs, fat: week.fat } : undefined,
        topProtein: week.top.length ? week.top : undefined,
        goal: foodGoal ? `${foodGoal.kind} ${foodGoal.target}${foodGoal.kind === 'protein' ? ' g a day' : ' kcal a day'}` : undefined,
        today: todayFood ? clean({ protein: todayFood.protein, kcal: todayFood.kcal, meals: todayFood.meals, leftToGoal: left }) : undefined,
        usualMeals: Object.keys(meals).length ? meals : undefined,
        usualPortions: portions.length ? portions : undefined,
        foodsLogged: foodsLogged.length ? foodsLogged : undefined,
      })
    : undefined;

  return clean({
    today: `${format(parseISO(today), 'EEEE')} ${today}`,
    unit,
    profile: clean({
      daysAWeek: settings.weeklyTarget,
      trainingFor: settings.goal,
      goals: settings.goals && goalLines(settings.goals, library).length ? goalLines(settings.goals, library) : undefined,
      facts: factLines(settings).length ? factLines(settings) : undefined,
    }),
    training,
    food,
  });
}
