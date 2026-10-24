import { addDays, differenceInCalendarDays, getISODay, isSameISOWeek, parseISO } from 'date-fns';
import { trainingWindow, usualPerWeek, onPace, perWeekRate, ymd } from './pace';

// The Daylight sky tracks the last 7 days of training, not the clock: dawn when nothing's in,
// brighter with each workout, full daylight once the usual week is in, dusk when behind pace
// (services/pace.ts). Dark Mode is always night. Pure and deterministic so it can be unit-tested.

export type SkyStops = [string, string, string, string]; // top, middle, low, base

// The classic sky, palette G (twilight skies with a lavender cast): saturated at the top, the base by about 45% of the screen
export const SKY = {
  dawn: ['#FFB4A0', '#F9CFE0', '#E8E0FA', '#F8F6FF'] as SkyStops,
  day: ['#8AA8FF', '#BCC9FF', '#E0E3FF', '#F6F5FF'] as SkyStops,
  dusk: ['#FF9F7E', '#E7A6CF', '#C9BDF2', '#F3F1FF'] as SkyStops,
  night: ['#0D0B2A', '#1A1640', '#2A1F52', '#1E1A44'] as SkyStops,
};

export type SkyPhase = 'dawn' | 'day' | 'dusk';

export interface WeekSky {
  phase: SkyPhase;
  progress: number; // 0..1, share of the target done
  done: number; // distinct days trained in the last 7
  target: number; // the picked weekly count, else the plan's week, else the usual weekly count
  planned: boolean; // target comes from the schedule
  stops: SkyStops; // light-mode gradient
}

// weeklyTarget: the days a week the user picked in setup or Settings; startedAt: when they finished setup
export interface SkyPrefs {
  weeklyTarget?: number;
  startedAt?: string; // yyyy-MM-dd
}

// `sky` is the scheme's gradients (constants/palettes.ts); the classic ones by default
export function weekSky(workouts: { date: string }[], schedule: { date: string }[], now: Date = new Date(), prefs: SkyPrefs = {}, sky: typeof SKY = SKY): WeekSky {
  const dates = workouts.map(w => w.date);
  const win = trainingWindow(dates, 7, now);
  const done = win.trained.size;
  const allPlanned = [...new Set(schedule.map(s => s.date))];
  const plannedDates = allPlanned.filter(d => d >= win.first && d <= win.last);
  // A plan sets the target only when no days a week were picked, and then it's the plan's whole week
  // from its first day in the last 7: plans never start before today, so the days planned so far are
  // often just today, and any one workout would read as goal met
  const planned = plannedDates.length > 0 && prefs.weeklyTarget === undefined;
  const weekStart = plannedDates.reduce((a, b) => (b < a ? b : a), win.last);
  const weekEnd = ymd(addDays(parseISO(weekStart), 6));
  const planWeek = allPlanned.filter(d => d >= weekStart && d <= weekEnd).length;
  // A new user's first 7 days only ask for the days they've been here (with days a week picked, the days
  // left in their setup week, Monday to Sunday, then the full target), and pace never fails them
  const daysHere = prefs.startedAt ? Math.max(1, differenceInCalendarDays(now, parseISO(prefs.startedAt)) + 1) : Infinity;
  const firstWeek = !planned && daysHere <= 7;
  const usual = prefs.weeklyTarget ?? usualPerWeek(dates, now);
  const setupWeekLeft = prefs.startedAt && isSameISOWeek(now, parseISO(prefs.startedAt)) ? 8 - getISODay(parseISO(prefs.startedAt)) : Infinity;
  const firstCap = prefs.weeklyTarget !== undefined ? setupWeekLeft : daysHere;
  const target = planned ? Math.max(planWeek, done) : firstWeek ? Math.min(usual, firstCap) : usual;
  const progress = Math.min(1, done / target);
  const behind = planned
    ? done < plannedDates.filter(d => d < win.last).length // planned days already gone by
    : !firstWeek && !onPace(perWeekRate(done, win.elapsed), target, win.elapsed);

  const phase: SkyPhase = progress >= 1 ? 'day' : behind ? 'dusk' : 'dawn';
  const stops = phase === 'dusk' ? sky.dusk : mixStops(sky.dawn, sky.day, progress);
  return { phase, progress, done, target, planned, stops };
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
