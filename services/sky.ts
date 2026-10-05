import { addDays, differenceInCalendarDays, format, startOfWeek, subWeeks } from 'date-fns';

// The Daylight sky tracks the training week, not the clock: dawn on Monday, brighter with
// each workout logged, full daylight once the week is complete, dusk once it can't be.
// Dark Mode is always night. Pure and deterministic so it can be unit-tested.

export type SkyStops = [string, string, string]; // top, middle, bottom

export const SKY = {
  dawn: ['#FFD3B8', '#FADCE6', '#E4E8FF'] as SkyStops,
  day: ['#C9DFFF', '#E4EEFF', '#F6F8FF'] as SkyStops,
  dusk: ['#FFC39C', '#EFB0C8', '#BDB8F0'] as SkyStops,
  night: ['#0A0F26', '#141938', '#1F1B44'] as SkyStops,
};

export type SkyPhase = 'dawn' | 'day' | 'dusk';

export interface WeekSky {
  phase: SkyPhase;
  progress: number; // 0..1, share of this week's target done
  done: number; // distinct days trained this week
  target: number; // planned days this week, or the usual weekly count
  planned: boolean; // target comes from the schedule
  stops: SkyStops; // light-mode gradient
}

const DEFAULT_WEEKLY = 3; // for someone with no recent history

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

// Distinct training days in the 4 full weeks before this one, per week
export function usualWeeklyCount(workoutDates: string[], weekStart: Date): number {
  const from = ymd(subWeeks(weekStart, 4));
  const to = ymd(weekStart);
  const days = new Set(workoutDates.filter(d => d >= from && d < to)).size;
  if (days === 0) return DEFAULT_WEEKLY;
  return Math.min(7, Math.max(1, Math.round(days / 4)));
}

export function weekSky(workouts: { date: string }[], schedule: { date: string }[], now: Date = new Date()): WeekSky {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const first = ymd(weekStart);
  const last = ymd(addDays(weekStart, 6));
  const today = ymd(now);
  const inWeek = (d: string) => d >= first && d <= last;

  const done = new Set(workouts.map(w => w.date).filter(d => inWeek(d) && d <= today)).size;
  const plannedDays = new Set(schedule.map(s => s.date).filter(inWeek)).size;
  const target = plannedDays || usualWeeklyCount(workouts.map(w => w.date), weekStart);
  const progress = Math.min(1, done / target);
  const daysLeft = 7 - differenceInCalendarDays(now, weekStart); // today through Sunday

  const phase: SkyPhase = progress >= 1 ? 'day' : target - done > daysLeft ? 'dusk' : 'dawn';
  const stops = phase === 'dusk' ? SKY.dusk : mixStops(SKY.dawn, SKY.day, progress);
  return { phase, progress, done, target, planned: plannedDays > 0, stops };
}

function mixStops(a: SkyStops, b: SkyStops, t: number): SkyStops {
  return a.map((c, i) => mixHex(c, b[i], t)) as SkyStops;
}

export function mixHex(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2]
    .map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}
