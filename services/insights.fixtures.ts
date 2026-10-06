// Three realistic users, one per logging style, for insights tests (and later prompt checks).
// "Now" for all of them is Thu 2026-10-08, evening, before anything is logged that day.
import { catalogById } from '../data/catalog';
import type { Exercise, MuscleGroup, Workout } from '../types/workout';

export const NOW = new Date(2026, 9, 8, 20);

type Ex = [id: string, sets?: number, reps?: number, weight?: number, extra?: Partial<Exercise>];
function w(date: string, rawInput: string, exs: Ex[]): Workout {
  const exercises: Exercise[] = exs.map(([id, sets, reps, weight, extra], i) => {
    const c = catalogById.get(id);
    if (!c) throw new Error(id);
    return { id: `${date}-${i}`, exerciseId: id, name: c.name, muscleGroup: c.primary, sets, reps, weight, unit: weight ? 'lbs' : undefined, ...extra };
  });
  const muscleGroups = [...new Set(exercises.map((e) => e.muscleGroup))] as MuscleGroup[];
  return { id: date + rawInput.slice(0, 6), date, rawInput, exercises, muscleGroups, createdAt: `${date}T19:00:00Z` };
}
const run = (km: number, minutes: number): Ex => ['running', undefined, undefined, undefined, { distance: km, distanceUnit: 'km', duration: minutes }];
const spin = (minutes?: number): Ex => ['cycling', undefined, undefined, undefined, { duration: minutes }];

// Sam, full detail: upper/lower 4x a week plus a Saturday 5k. Bench climbing, squat stuck at
// 185x5 and feeling heavy, a sick week, and the odd session logged with no numbers.
const sam = [
  w('2026-08-31', 'Upper A. bench 3x8 at 130, cable rows 3x10 @90, ohp 3x8 85, pulldowns 3x10 100, pushdowns 2x12 40', [
    ['bench-press', 3, 8, 130], ['seated-cable-row', 3, 10, 90], ['overhead-press', 3, 8, 85], ['lat-pulldown', 3, 10, 100], ['tricep-pushdown', 2, 12, 40]]),
  w('2026-09-01', 'Lower A. squat 3x5 175, rdl 3x8 155, leg curls 3x12, calves 3x15', [
    ['squat', 3, 5, 175], ['romanian-deadlift', 3, 8, 155], ['lying-leg-curl', 3, 12, 70], ['standing-calf-raise', 3, 15, 90]]),
  w('2026-09-03', 'Upper B. incline db 3x10 50s, barbell row 3x8 135, lateral raises 3x15 15, curls 3x10 30', [
    ['incline-dumbbell-press', 3, 10, 50], ['barbell-row', 3, 8, 135], ['lateral-raise', 3, 15, 15], ['dumbbell-curl', 3, 10, 30]]),
  w('2026-09-04', 'Lower B. deadlift 3x3 255, leg press 3x10 270, walking lunges 2x20', [
    ['deadlift', 3, 3, 255], ['leg-press', 3, 10, 270], ['dumbbell-lunge', 2, 20, 30]]),
  w('2026-09-05', 'easy 5k, 28:10', [run(5, 28.2)]),
  w('2026-09-07', 'Upper A bench 3x8 135, cable rows 3x10 100, ohp 3x8 85, pulldowns 3x10 110, pushdowns 2x12 45', [
    ['bench-press', 3, 8, 135], ['seated-cable-row', 3, 10, 100], ['overhead-press', 3, 8, 85], ['lat-pulldown', 3, 10, 110], ['tricep-pushdown', 2, 12, 45]]),
  w('2026-09-08', 'squat 3x5 185 felt good, rdl 3x8 165, leg curl 3x12', [
    ['squat', 3, 5, 185], ['romanian-deadlift', 3, 8, 165], ['lying-leg-curl', 3, 12, 75]]),
  w('2026-09-10', 'Upper B. incline db 3x10 50s, rows 3x8 135, laterals, curls', [
    ['incline-dumbbell-press', 3, 10, 50], ['barbell-row', 3, 8, 135], ['lateral-raise'], ['dumbbell-curl']]),
  w('2026-09-12', '5k 27:40', [run(5, 27.7)]),
  w('2026-09-14', 'bench 3x8 at 140!, cable rows 3x10 100, ohp 3x8 90, pulldowns, pushdowns', [
    ['bench-press', 3, 8, 140], ['seated-cable-row', 3, 10, 100], ['overhead-press', 3, 8, 90], ['lat-pulldown'], ['tricep-pushdown']]),
  w('2026-09-16', 'squats 185 3x5, felt heavy. rdl 3x8 165', [['squat', 3, 5, 185, { notes: 'felt heavy' }], ['romanian-deadlift', 3, 8, 165]]),
  w('2026-09-17', 'Upper B incline db 3x10 55s, rows 3x8 145, lateral raise 3x15 15', [
    ['incline-dumbbell-press', 3, 10, 55], ['barbell-row', 3, 8, 145], ['lateral-raise', 3, 15, 15]]),
  w('2026-09-18', 'legs, rdls and lunges, short on time', [['romanian-deadlift'], ['dumbbell-lunge']]),
  w('2026-09-20', 'run 5k 27:30', [run(5, 27.5)]),
  // sick week
  w('2026-09-24', 'short one, still a bit sick. bench 3x8 135, pulldowns', [['bench-press', 3, 8, 135], ['lat-pulldown']]),
  w('2026-09-28', 'Upper A bench 3x8 140, cable rows 3x10 105, ohp 3x8 90, pulldowns 3x10 110, pushdowns 2x12 45', [
    ['bench-press', 3, 8, 140], ['seated-cable-row', 3, 10, 105], ['overhead-press', 3, 8, 90], ['lat-pulldown', 3, 10, 110], ['tricep-pushdown', 2, 12, 45]]),
  w('2026-09-29', 'squat 185 3x5 again, deadlift worked up to 275 for 3!', [['squat', 3, 5, 185], ['deadlift', 1, 3, 275]]),
  w('2026-10-01', 'Upper B incline db 3x10 55s, rows 3x8 145, laterals 3x15 20, curls 3x10 30', [
    ['incline-dumbbell-press', 3, 10, 55], ['barbell-row', 3, 8, 145], ['lateral-raise', 3, 15, 20], ['dumbbell-curl', 3, 10, 30]]),
  w('2026-10-03', '5k in 26:55, best in a while', [run(5, 26.9)]),
  w('2026-10-04', 'leg day', [['leg-workout']]),
  w('2026-10-05', 'Upper A. bench 145 3x8 felt easy, cable rows 3x10 110, ohp 3x8 95, pulldowns 3x10 115, pushdowns 2x12 50', [
    ['bench-press', 3, 8, 145, { notes: 'felt easy' }], ['seated-cable-row', 3, 10, 110], ['overhead-press', 3, 8, 95], ['lat-pulldown', 3, 10, 115], ['tricep-pushdown', 2, 12, 50]]),
  w('2026-10-06', 'did legs. squats 185 felt heavy again, leg press, calves', [
    ['squat', 3, 5, 185, { notes: 'felt heavy again' }], ['leg-press'], ['standing-calf-raise']]),
];

// Maya, mixed: casual, about twice a week, broad strokes, back after three weeks away.
const maya = [
  w('2026-08-04', 'spin class 45 min', [spin(45)]),
  w('2026-08-06', 'upper body at the gym, about 40 min', [['upper-body-workout']]),
  w('2026-08-11', 'leg day, squats and lunges', [['goblet-squat'], ['bodyweight-lunge']]),
  w('2026-08-13', 'spin 45', [spin(45)]),
  w('2026-08-18', 'upper body', [['upper-body-workout']]),
  w('2026-08-20', 'spin class', [spin()]),
  w('2026-08-25', 'legs and core', [['leg-workout'], ['core-workout']]),
  w('2026-08-28', 'upper body, did push ups 3x12 and db rows', [['push-up', 3, 12], ['dumbbell-row']]),
  w('2026-09-01', 'spin 45', [spin(45)]),
  w('2026-09-14', 'first time back in a while, short full body', [['goblet-squat'], ['push-up'], ['dumbbell-row']]),
  // three weeks away
  w('2026-10-06', 'back at it! upper body 30 min', [['upper-body-workout']]),
];

// Jordan, names only, always: push / pull / chest-and-back about 3.5x a week. Legs quietly
// dropped off after Sep 18.
const PUSH: Ex[] = [['bench-press'], ['incline-dumbbell-press'], ['lateral-raise'], ['chest-dip']];
const PULL: Ex[] = [['pull-up'], ['barbell-row'], ['dumbbell-curl']];
const jordan = [
  w('2026-08-31', 'push day: bench, incline db, lateral raises, dips', PUSH),
  w('2026-09-02', 'pull ups, rows and curls', PULL),
  w('2026-09-04', 'legs', [['leg-workout']]),
  w('2026-09-05', 'pickup basketball', [['basketball']]),
  w('2026-09-07', 'chest and back day', [['chest-workout'], ['back-workout']]),
  w('2026-09-09', 'bench, rows, dips', [['bench-press'], ['barbell-row'], ['chest-dip']]),
  w('2026-09-11', 'legs, squats and lunges', [['squat'], ['dumbbell-lunge']]),
  w('2026-09-14', 'push day: bench, incline db, lateral raises, dips', PUSH),
  w('2026-09-16', 'pull ups, rows and curls', PULL),
  w('2026-09-18', 'legs', [['leg-workout']]),
  w('2026-09-20', 'pickup basketball', [['basketball']]),
  w('2026-09-21', 'chest and back day', [['chest-workout'], ['back-workout']]),
  w('2026-09-23', 'bench, rows, dips', [['bench-press'], ['barbell-row'], ['chest-dip']]),
  w('2026-09-25', 'shoulders and arms', [['shoulder-workout'], ['arm-workout']]),
  w('2026-09-28', 'push day: bench, incline db, lateral raises, dips', PUSH),
  w('2026-09-30', 'pull ups, rows and curls', PULL),
  w('2026-10-01', 'pickup basketball', [['basketball']]),
  w('2026-10-03', 'chest and back day', [['chest-workout'], ['back-workout']]),
  w('2026-10-05', 'bench, rows, dips', [['bench-press'], ['barbell-row'], ['chest-dip']]),
  w('2026-10-07', 'pull ups and curls', [['pull-up'], ['dumbbell-curl']]),
];

// Newest first, like the store
const newestFirst = (ws: Workout[]) => [...ws].sort((a, b) => b.date.localeCompare(a.date));
export const USERS = { jordan: newestFirst(jordan), maya: newestFirst(maya), sam: newestFirst(sam) };
