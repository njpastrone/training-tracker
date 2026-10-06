import type { Exercise } from '../types/workout';

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
