import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';

// Training is judged over a rolling window ending today, not the calendar week, and graded by
// pace: what the user's usual frequency would have done in the days that have counted so far.
// Today counts once trained, and days before the first ever workout never count, so rest days
// and fresh starts don't fail anyone. Pure and deterministic so it can be unit-tested.

export const DEFAULT_WEEKLY = 3; // for someone with no recent history

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export interface TrainingWindow {
  first: string; // yyyy-MM-dd, oldest day in the window
  last: string; // today
  days: number; // window length
  elapsed: number; // days that count so far (see above)
  trained: Set<string>; // distinct training days in the window
}

export function trainingWindow(dates: string[], days: number, now: Date = new Date()): TrainingWindow {
  const last = ymd(now);
  const first = ymd(subDays(now, days - 1));
  const past = dates.filter(d => d <= last);
  const trained = new Set(past.filter(d => d >= first));
  const firstEver = past.reduce((a, b) => (b < a ? b : a), last);
  const start = firstEver > first ? firstEver : first;
  const elapsed = past.length ? differenceInCalendarDays(now, parseISO(start)) + (trained.has(last) ? 1 : 0) : 0;
  return { first, last, days, elapsed, trained };
}

// Distinct training days per week over the 4 weeks before the last 7 days
export function usualPerWeek(dates: string[], now: Date = new Date()): number {
  const from = ymd(subDays(now, 34));
  const to = ymd(subDays(now, 6));
  const days = new Set(dates.filter(d => d >= from && d < to)).size;
  if (days === 0) return DEFAULT_WEEKLY;
  return Math.min(7, Math.max(1, Math.round(days / 4)));
}

// What a per-week target expects in `elapsed` counted days
export const expectedSoFar = (perWeek: number, elapsed: number) => (perWeek * elapsed) / 7;

// A count over the window as a per-week rate. The first week is taken as it stands rather
// than extrapolated, so one big day doesn't read as a huge week.
export const perWeekRate = (count: number, elapsed: number) =>
  Math.round(((count * 7) / Math.max(elapsed, 7)) * 10) / 10;

// Whether a per-week rate is on pace for a per-week target: within the first week that's the
// share of the week counted so far, after it the whole target. A fraction is never owed.
export const onPace = (rate: number, perWeek: number, elapsed: number) =>
  rate >= Math.floor(expectedSoFar(perWeek, Math.min(elapsed, 7)) + 1e-9);
