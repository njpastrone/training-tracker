import { differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { muscleName } from './goals';
import type { MuscleGroup, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// Chat bar suggestions from the user's own log and plan (DESIGN-SYSTEM.md, "Chat suggestions").
// Only what's timely: an empty list means the bar shows no chips row at all.
// Pure and local, no AI: the label is what the chip says, the text is what a tap puts in the box (or sends).

export interface Chip {
  label: string;
  text: string;
}

// Below this many training days the user gets whole examples instead of their own workouts
export const NEW_USER_DAYS = 3;

const chip = (label: string, text = label): Chip => ({ label, text });
// Chips whose label is also what they put in the box or send
export const toChips = (labels: string[]) => labels.map(label => chip(label));
const LOG_EXAMPLES = toChips(['Chest and back: bench, rows', 'Ran 3 miles', 'Legs: squats, lunges']);
export const PLAN_STARTERS = toChips(['Re-entry week', 'Next week', 'PPL split', 'Upper / lower', '3 days a week']);

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const trainingDays = (workouts: Workout[]) => new Set(workouts.map(w => w.date)).size;
const newestFirst = (workouts: Workout[]) => [...workouts].sort((a, b) => b.date.localeCompare(a.date));

// "chest, shoulders, biceps +1"; exercise names when the workout has no muscle groups
function whatWasDone(groups: MuscleGroup[], workout?: Workout) {
  if (!groups.length) return (workout?.exercises ?? []).slice(0, 2).map(e => e.name).join(', ');
  const names = groups.map(g => muscleName(g).toLowerCase());
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
}

// "yesterday", "Monday" within the last week, else "Sep 29"
function dayName(date: string, now: Date) {
  const days = differenceInCalendarDays(now, parseISO(date));
  return days === 1 ? 'yesterday' : days < 7 ? format(parseISO(date), 'EEEE') : format(parseISO(date), 'MMM d');
}

// Log: today's planned workout if it isn't logged yet, then the two most recent different workouts
// from the last 4 weeks (today's is skipped: it's done), to log again and edit.
export function logChips(workouts: Workout[], plan?: WorkoutTemplate | null, now: Date = new Date()): Chip[] {
  const planned = plan ? [chip(`Today's plan · ${plan.name}`, plan.exercises.map(e => e.name).join(', '))] : [];
  if (trainingDays(workouts) < NEW_USER_DAYS) return [...planned, ...LOG_EXAMPLES];
  const today = ymd(now);
  const since = ymd(subDays(now, 28));
  const seen = new Set<string>();
  const chips: Chip[] = [];
  for (const w of newestFirst(workouts)) {
    if (w.date >= today || w.date < since || !w.exercises.length) continue;
    const kind = [...w.muscleGroups].sort().join() || w.exercises.map(e => e.name).join();
    if (seen.has(kind)) continue;
    seen.add(kind);
    chips.push(chip(`Like ${dayName(w.date, now)} · ${whatWasDone(w.muscleGroups, w)}`, w.exercises.map(e => e.name).join(', ')));
    if (chips.length === 2) break;
  }
  return [...planned, ...chips];
}

// History: plan starters from this week and the days-a-week setting; these send right away
export function planChips(workouts: Workout[], daysAWeek: number | undefined, now: Date = new Date()): Chip[] {
  if (trainingDays(workouts) < NEW_USER_DAYS) return PLAN_STARTERS;
  const today = ymd(now);
  const monday = ymd(startOfWeek(now, { weekStartsOn: 1 }));
  const byDay = new Map<string, MuscleGroup[]>();
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    if (w.date < monday || w.date > today) continue;
    byDay.set(w.date, [...new Set([...(byDay.get(w.date) ?? []), ...w.muscleGroups])]);
  }
  const chips: Chip[] = [];
  if (byDay.size) {
    const days = [...byDay].map(([date, groups]) => `${format(parseISO(date), 'EEE')} ${whatWasDone(groups, workouts.find(w => w.date === date))}`);
    chips.push(chip('Repeat this week', `Next week, the same as this week: ${days.join('; ')}`));
  }
  chips.push(chip(daysAWeek ? `Next week, ${daysAWeek} days` : 'Next week'));
  return chips;
}

// Progress: planned days in the last week (before today) with nothing logged, newest first, at most two
export function missedChips(workouts: Workout[], schedule: TemplateSchedule[], templates: WorkoutTemplate[], now: Date = new Date()): Chip[] {
  const today = ymd(now);
  const since = ymd(subDays(now, 6));
  const logged = new Set(workouts.map(w => w.date));
  return schedule
    .filter(s => s.date >= since && s.date < today && !s.completed && !s.skipped && !logged.has(s.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap(s => {
      const template = templates.find(t => t.id === s.templateId);
      if (!template) return [];
      const day = format(parseISO(s.date), 'EEEE');
      return [chip(`Log ${day} · ${template.name}`, `${template.name} on ${day}: ${template.exercises.map(e => e.name).join(', ')}`)];
    })
    .slice(0, 2);
}
