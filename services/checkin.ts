import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { resolveId } from './exerciseIdentity';
import { workoutName } from './format';
import { foodGoalName, muscleName, type goalProgress } from './goals';
import { target, type Digest, type LiftTrend } from './insights';
import type { ExerciseLibrary, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// The weekly check-in at the top of Progress, written on the phone from the user's own log (no AI).
// Every number in it comes from their data: training days against their usual, PRs only where
// there are numbers, one thing to watch only when there's a real signal, and what's planned next.
// No grades. The week is the rolling last 7 days, the same as the rest of the tab.

export interface CheckIn {
  headline: string; // "Back after 22 days off", "New best: Bench Press 140 lb × 8", "Upper body and Legs"
  days: string; // "3 training days in the last 7 · your usual 4"
  watch?: string; // the one thing to watch, only when there is one
  wins: string[];
  next: string[]; // planned days in the next 7: "Tomorrow · Lower B · Squat next 190x5"
}

export interface CheckInInput {
  workouts: Workout[];
  digest: Digest;
  goals?: ReturnType<typeof goalProgress>;
  schedule: TemplateSchedule[];
  templates: WorkoutTemplate[];
  library: ExerciseLibrary;
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
// "Push", "Push and Legs", "Push, Pull and Legs"
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0]);
// "Bench Press 140 lb × 8", from the lift's latest top set as logged
const topSet = (t: LiftTrend) => {
  const { weight, unit, reps } = t.recent[0];
  return `${t.lift} ${weight} ${unit === 'kg' ? 'kg' : 'lb'}${reps ? ` × ${reps}` : ''}`;
};

export function checkIn({ workouts, digest: d, goals, schedule, templates, library }: CheckInInput, now: Date = new Date()): CheckIn | null {
  if (!d.sessionsLast7) return null; // nothing in the last 7: Progress's empty and come-back cards speak instead
  const today = ymd(now);
  const first = ymd(subDays(now, 6));
  const trends = new Map(d.liftTrends.map(t => [t.id, t]));
  const prs = d.prsLast14Days.map(id => trends.get(id)!).sort((a, b) => b.recent[0].date.localeCompare(a.recent[0].date));

  // Headline: a comeback, else a PR, both in the last 7; else what was trained, oldest first
  const byDay = new Map<string, Workout['muscleGroups']>();
  for (const w of workouts) if (w.date >= first && w.date <= today) byDay.set(w.date, [...(byDay.get(w.date) ?? []), ...w.muscleGroups]);
  const trained = [...new Set([...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([, groups]) => workoutName(groups)))];
  const comeback = d.comeback && d.comeback.to >= first ? d.comeback : null;
  const lead = comeback ? undefined : prs.find(t => t.recent[0].date >= first);
  const headline = comeback ? `Back after ${comeback.days} days off` : lead ? `New best: ${topSet(lead)}` : list(trained);

  const days = `${plural(d.sessionsLast7, 'training day')} in the last 7${d.usualPerWeek === null ? '' : ` · your usual ${d.usualPerWeek}`}`;

  // One thing to watch: the muscle left longest (10+ days, one you train), else a lift stuck 3+
  // sessions with its next number, else a food goal missed on most days with food logged
  const stale = [...d.staleGroups].sort((a, b) => d.daysSinceGroupTrained[b]! - d.daysSinceGroupTrained[a]!)[0];
  const stuck = [...d.liftTrends].filter(t => t.sessionsAtSameTopSet >= 3).sort((a, b) => b.sessionsAtSameTopSet - a.sessionsAtSameTopSet)[0];
  const food = goals?.food;
  const watch = stale
    ? `${muscleName(stale)}: ${d.daysSinceGroupTrained[stale]} days since you trained it`
    : stuck
      ? `${stuck.lift} at ${target(stuck).last} for ${stuck.sessionsAtSameTopSet} sessions · next ${target(stuck).next}`
      : food && food.logged >= 3 && food.hit * 2 < food.logged
        ? `${foodGoalName(food.goal)} goal met on ${food.hit} of ${food.logged} days with food logged`
        : undefined;

  const timesGoals = goals?.muscles.filter(m => m.timesGoal !== undefined) ?? [];
  const wins = [
    ...prs.filter(t => t !== lead).slice(0, 3).map(t => `${topSet(t)}, your best`), // the 3 latest; the headline's isn't repeated
    ...(d.weeksInARow >= 2 ? [`Trained every week for ${d.weeksInARow} weeks`] : []),
    ...(timesGoals.length && timesGoals.every(m => m.times >= m.timesGoal!) ? [`Every goal muscle trained ${timesGoals[0].timesGoal}× or more`] : []),
    ...(food?.met && food.logged >= 3 ? [`${foodGoalName(food.goal)} goal met on all ${food.logged} days with food logged`] : []),
  ];

  // Planned days from today on that aren't done, each with the next number for its first lift
  const last = ymd(addDays(now, 6));
  const done = new Set(workouts.map(w => w.date));
  const next = schedule
    .filter(s => s.date >= today && s.date <= last && !s.completed && !s.skipped && !done.has(s.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap(s => {
      const t = templates.find(t => t.id === s.templateId);
      if (!t) return [];
      const ahead = differenceInCalendarDays(parseISO(s.date), parseISO(today));
      const day = ahead === 0 ? 'Today' : ahead === 1 ? 'Tomorrow' : format(parseISO(s.date), 'EEEE');
      const lift = t.exercises.map(e => e.exerciseId && trends.get(resolveId(e.exerciseId, library))).find(Boolean);
      return [[day, t.name, lift && `${lift.lift} next ${target(lift).next}`].filter(Boolean).join(' · ')];
    });

  return { headline, days, watch, wins, next };
}
