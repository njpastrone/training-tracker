import { addMinutes, format, parseISO, subDays, subMinutes } from 'date-fns';
import Health, { type HealthWeight, type HealthWorkout } from '../modules/health';
import { setWorkoutListener, useWorkoutStore, type WorkoutChange } from '../stores/workoutStore';
import { inUnit } from './progress';
import type { AppleHealthSettings, WeightUnit, Workout } from '../types/workout';

// Apple Health. What LiftText reads (workouts other apps saved, body weight) is shown on Progress and kept only
// in memory: never in the store, backups or anything sent to our server or the AI, which the AI consent sheet
// promises (services/health.test.mts checks that what it reads never reaches the store or storage). Saving goes the other way and only once you turn
// it on: each workout you log, change or delete here is then saved, replaced or deleted in Health.

export const healthAvailable = () => !!Health?.isAvailable();

// HKWorkoutActivityType raw values (HealthKit's HKWorkout.h)
const STRENGTH = 50;
const MIXED_CARDIO = 73;
const ACTIVITY: Record<number, string> = {
  50: 'Strength training', 20: 'Functional strength', 73: 'Mixed cardio', 37: 'Running', 52: 'Walking', 13: 'Cycling',
  46: 'Swimming', 24: 'Hiking', 57: 'Yoga', 66: 'Pilates', 63: 'HIIT', 35: 'Rowing', 16: 'Elliptical',
  44: 'Stair climbing', 59: 'Core training', 11: 'Cross training', 77: 'Dance', 78: 'Dance', 8: 'Boxing',
  65: 'Kickboxing', 28: 'Martial arts', 9: 'Climbing', 48: 'Tennis', 79: 'Pickleball', 6: 'Basketball',
  41: 'Soccer', 21: 'Golf', 62: 'Flexibility', 80: 'Cooldown', 64: 'Jump rope',
};
export const activityName = (activity: number) => ACTIVITY[activity] ?? 'Workout';

// Health needs a start and an end, and a log has neither: the minutes you logged (cardio), else an hour, ending
// when you logged it, or starting at noon for a past day. Nothing for a day still to come.
export const DEFAULT_MINUTES = 60;
export function healthTimes(workout: Workout, now: Date): { start: number; end: number; activity: number } | null {
  if (workout.date > format(now, 'yyyy-MM-dd')) return null;
  const minutes = workout.exercises.reduce((sum, e) => sum + (e.duration ?? 0), 0) || DEFAULT_MINUTES;
  const logged = parseISO(workout.createdAt);
  const sameDay = format(logged, 'yyyy-MM-dd') === workout.date;
  const start = sameDay ? subMinutes(logged, minutes) : parseISO(`${workout.date}T12:00:00`);
  const end = sameDay ? logged : addMinutes(start, minutes);
  const activity = workout.exercises.length && workout.exercises.every(e => e.muscleGroup === 'cardio') ? MIXED_CARDIO : STRENGTH;
  return { start: start.getTime(), end: end.getTime(), activity };
}

// One at a time, so a log and its Undo reach Health in order
let syncing = Promise.resolve();

async function sync({ saved = [], removed = [] }: WorkoutChange, settings: AppleHealthSettings | undefined) {
  const since = settings?.saveSince;
  if (!Health || !since || !Health.canSaveWorkouts()) return;
  // Any old copy of a changed workout goes; only workouts logged since saving was turned on are saved again
  const save = saved.filter(w => w.createdAt >= since);
  const ids = [...removed, ...saved.map(w => w.id)];
  if (ids.length) await Health.deleteWorkouts(ids);
  for (const w of save) {
    const times = healthTimes(w, new Date());
    if (times) await Health.saveWorkout(w.id, times.start, times.end, times.activity);
  }
}

// Called once at startup (app/_layout.tsx)
export function startHealthSync() {
  setWorkoutListener(change => {
    const settings = useWorkoutStore.getState().settings.appleHealth;
    syncing = syncing.then(() => sync(change, settings)).catch(error => console.error('Apple Health sync failed:', error));
  });
}

// Shows Apple's sheet. True when saving workouts is allowed (iOS never says whether reading was).
export const requestHealthAccess = (write: boolean) => (Health ? Health.requestAccess(write) : Promise.resolve(false));

export interface HealthWeek {
  workouts: HealthWorkout[]; // other apps' and devices', last 7 days, newest first
  weight?: { now: number; change?: number; since?: string }; // in the user's unit; change over up to 30 days
}

// What Progress shows, read fresh each time and held only by the screen
export async function readHealthWeek(unit: WeightUnit, now: Date = new Date()): Promise<HealthWeek> {
  if (!Health) return { workouts: [] };
  const [workouts, weights] = await Promise.all([Health.workouts(subDays(now, 7).getTime()), Health.bodyWeights(subDays(now, 30).getTime())]);
  return { workouts, weight: weightTrend(weights, unit) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
export function weightTrend(weights: HealthWeight[], unit: WeightUnit): HealthWeek['weight'] {
  if (!weights.length) return undefined;
  const latest = weights[0];
  const oldest = weights[weights.length - 1];
  const value = (w: HealthWeight) => inUnit(w.kg, 'kg', unit);
  if (oldest === latest) return { now: round1(value(latest)) };
  return { now: round1(value(latest)), change: round1(value(latest) - value(oldest)), since: format(oldest.date, 'yyyy-MM-dd') };
}
