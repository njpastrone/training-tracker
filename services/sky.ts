import { trainingWindow, usualPerWeek, onPace, perWeekRate } from './pace';

// The Daylight sky tracks the last 7 days of training, not the clock: dawn when nothing's in,
// brighter with each workout, full daylight once the usual week is in, dusk when behind pace
// (services/pace.ts). Dark Mode is always night. Pure and deterministic so it can be unit-tested.

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
  progress: number; // 0..1, share of the target done
  done: number; // distinct days trained in the last 7
  target: number; // planned days in the last 7, or the usual weekly count
  planned: boolean; // target comes from the schedule
  stops: SkyStops; // light-mode gradient
}

export function weekSky(workouts: { date: string }[], schedule: { date: string }[], now: Date = new Date()): WeekSky {
  const dates = workouts.map(w => w.date);
  const win = trainingWindow(dates, 7, now);
  const done = win.trained.size;
  const plannedDates = [...new Set(schedule.map(s => s.date))].filter(d => d >= win.first && d <= win.last);
  const planned = plannedDates.length > 0;
  const target = planned ? plannedDates.length : usualPerWeek(dates, now);
  const progress = Math.min(1, done / target);
  const behind = planned
    ? done < plannedDates.filter(d => d < win.last).length // planned days already gone by
    : !onPace(perWeekRate(done, win.elapsed), target, win.elapsed);

  const phase: SkyPhase = progress >= 1 ? 'day' : behind ? 'dusk' : 'dawn';
  const stops = phase === 'dusk' ? SKY.dusk : mixStops(SKY.dawn, SKY.day, progress);
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
