import { format } from 'date-fns';
import { digest } from './insights';
import { muscleName } from './goals';
import type { ExerciseLibrary, MuscleGroup, WeightUnit, Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// The card at the bottom of the Chat tab, so it's never a blank chat. Written on the phone from the
// log (no AI, free), never stored. The first rule that applies wins.

export type Opener =
  | { kind: 'planned'; templateId: string; name: string; note?: string }
  | { kind: 'comeback'; days: number }
  | { kind: 'welcome' }
  | null;

export interface OpenerInput {
  workouts: Workout[];
  schedule: TemplateSchedule[];
  templates: WorkoutTemplate[];
  library: ExerciseLibrary;
  unit: WeightUnit;
  threadEmpty: boolean;
  skippedOpener?: string;
}

const COMEBACK_DAYS = 5;
const STALE_DAYS = 7;

export function pickOpener({ workouts, schedule, templates, library, unit, threadEmpty, skippedOpener }: OpenerInput, now: Date): Opener {
  const today = format(now, 'yyyy-MM-dd');
  const d = digest(workouts, library, unit, now);

  // 1. Planned today, not logged or skipped yet
  const planned = schedule.find(s => s.date === today && !s.completed && !s.skipped);
  const template = planned && templates.find(t => t.id === planned.templateId);
  if (template && skippedOpener !== today && !workouts.some(w => w.date === today)) {
    const stale = (template.muscleGroups as MuscleGroup[]).find(g => (d.daysSinceGroupTrained[g] ?? Infinity) >= STALE_DAYS);
    return { kind: 'planned', templateId: template.id, name: template.name, note: stale && `${muscleName(stale)} hasn't been trained in the last 7 days.` };
  }
  // 2. A few days off, for someone with a usual week
  if (d.daysSinceLastWorkout !== null && d.daysSinceLastWorkout >= COMEBACK_DAYS && d.usualPerWeek !== null) {
    return { kind: 'comeback', days: d.daysSinceLastWorkout };
  }
  // 3. Nothing said yet
  return threadEmpty ? { kind: 'welcome' } : null;
}

export function openerText(o: NonNullable<Opener>): string {
  if (o.kind === 'planned') return `${o.name} is planned for today.`;
  if (o.kind === 'comeback') return `${o.days} days since your last workout. Start with whatever has rested longest.`;
  return 'Tell me what you did or ate, or ask about your training.';
}

// The opener's own chips, in place of the usual ones
export const openerChips = (o: Opener): string[] => (o?.kind === 'comeback' ? ['What should I start with?'] : []);
