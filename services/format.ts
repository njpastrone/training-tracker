import type { Exercise, MuscleGroup, Workout } from '../types/workout';
import type { FoodDayTotal } from './progress';

type ExerciseValues = Omit<Exercise, 'id'>;

const unitLabel = (unit?: string) => (unit === 'kg' ? 'kg' : 'lb');

// "25 min", "30 s"
export function formatDuration(minutes: number): string {
  return minutes < 1 ? `${Math.round(minutes * 60)} s` : `${+minutes.toFixed(1)} min`;
}

// The numbers of one exercise, e.g. "3 × 8 · 135 lb" or "25 min · 5 km"
export function exerciseNumbers(e: ExerciseValues): string {
  const parts: string[] = [];
  if (e.sets && e.reps) parts.push(`${e.sets} × ${e.reps}`);
  else if (e.reps) parts.push(`${e.reps} reps`);
  else if (e.sets) parts.push(`${e.sets} sets`);
  if (e.weight) parts.push(`${e.weight} ${unitLabel(e.unit)}`);
  if (e.duration) parts.push(formatDuration(e.duration));
  if (e.distance) parts.push(`${e.distance}${e.distanceUnit ? ` ${e.distanceUnit}` : ''}`);
  return parts.join(' · ');
}

// Total sets and weight moved (sets × reps × weight), in the first unit seen
export function workoutTotals(exercises: ExerciseValues[]): { sets: number; volume: number; unit: string } {
  let sets = 0;
  let volume = 0;
  for (const e of exercises) {
    sets += e.sets ?? 0;
    if (e.weight && e.reps) volume += (e.sets ?? 1) * e.reps * e.weight;
  }
  return { sets, volume, unit: unitLabel(exercises.find(e => e.weight)?.unit) };
}

// "5 exercises · 14 sets · 11,100 lb"
export function workoutSummary(exercises: ExerciseValues[]): string {
  const { sets, volume, unit } = workoutTotals(exercises);
  const parts = [`${exercises.length} exercise${exercises.length === 1 ? '' : 's'}`];
  if (sets) parts.push(`${sets} sets`);
  if (volume) parts.push(`${volume.toLocaleString('en-US')} ${unit}`);
  return parts.join(' · ');
}

// A draft written back as a plain log, so a typed fix can be re-parsed with the draft as context
export function draftToText(exercises: ExerciseValues[], notes?: string): string {
  const lines = exercises.map(e => {
    const n = exerciseNumbers(e).replace(/ × /g, 'x').replace(/ · /g, ', ');
    return `${e.name}${n ? ` ${n}` : ''}${e.notes ? ` (${e.notes})` : ''}`;
  });
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}

// "today", "yesterday", "6 days ago"
export const daysAgo = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);

// When an exercise was last done and how often lately: "last done 3 days ago · 4× in 4 wks"
export const lastDoneLine = (e: { lastDoneDaysAgo: number; timesLast28Days: number }) =>
  `last done ${daysAgo(e.lastDoneDaysAgo)}${e.timesLast28Days ? ` · ${e.timesLast28Days}× in 4 wks` : ''}`;

// History's subtitle: logged days (workout or food) in the last 7 days and planned training days in the next 7
export function weekLine(logged: number, planned: number): string {
  if (!logged && !planned) return 'Nothing logged in the last 7';
  return [logged && `Last 7: ${logged} logged`, planned && `Next 7: ${planned} planned`].filter(Boolean).join(' · ');
}

// A day's food in one line, for History's day cards: "90 g protein · 941 kcal · 4 foods"
export const foodDayLine = (t: FoodDayTotal) =>
  `${t.protein} g protein · ${t.kcal.toLocaleString('en-US')} kcal · ${t.foods} food${t.foods === 1 ? '' : 's'}`;

// Where a History day card's taps go: the card opens its workout, the food line opens the day
export const cardTargets = (w: Pick<Workout, 'id' | 'date'>) => ({ body: `/workout/${w.id}`, food: `/day/${w.date}` });

// Progress's subtitle: the sky's training days in the last 7 against its target
export function paceLine(done: number, target: number): string {
  if (!done) return 'No training days in the last 7';
  if (done >= target) return `${done} training day${done === 1 ? '' : 's'} in the last 7 · goal met`;
  return `${done} of ${target} training days in the last 7`;
}

// A workout's short name from its muscles, for the day rows and Log: "Push", "Pull", "Legs", "Upper body",
// "Full body", else the muscles ("Chest and biceps"). Core never decides the name.
const SPLITS: [string, MuscleGroup[]][] = [
  ['Push', ['chest', 'shoulders', 'triceps']],
  ['Pull', ['back', 'biceps', 'forearms']],
  ['Legs', ['quads', 'hamstrings', 'glutes', 'calves']],
  ['Upper body', ['chest', 'shoulders', 'triceps', 'back', 'biceps', 'forearms']],
];
export function workoutName(groups: MuscleGroup[]): string {
  const main = groups.filter(g => g !== 'core');
  if (!main.length) return groups.length ? 'Core' : 'Workout';
  if (main.includes('full_body')) return 'Full body';
  if (main.length > 1) {
    const split = SPLITS.find(([, of]) => main.every(g => of.includes(g)));
    if (split) return split[0];
    if (main.some(g => SPLITS[2][1].includes(g)) && main.some(g => SPLITS[3][1].includes(g))) return 'Full body';
  }
  const names = main.map(g => g.charAt(0).toUpperCase() + g.slice(1));
  const said = names.length > 2 ? [names[0], names[1].toLowerCase()] : names.map((n, i) => (i ? n.toLowerCase() : n));
  return said.join(' and ');
}
