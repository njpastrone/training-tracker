import type { ParsedWorkoutResponse, UnsureField } from '../types/workout';
import { exercises as exerciseList } from '../data/exercises';

type Draft = ParsedWorkoutResponse;
type Field = keyof Draft['exercises'][number];

// Editing a value confirms it, so it is no longer flagged as unsure
export function editDraft(draft: Draft, index: number, field: Field, value: unknown): Draft {
  return {
    ...draft,
    exercises: draft.exercises.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    unsure: (draft.unsure ?? []).filter(u => !(u.exercise === index && u.field === field)),
  };
}

// Removing an exercise drops its flags and renumbers the ones after it
export function removeFromDraft(draft: Draft, index: number): Draft {
  return {
    ...draft,
    exercises: draft.exercises.filter((_, i) => i !== index),
    unsure: (draft.unsure ?? []).filter(u => u.exercise !== index).map(u => (u.exercise > index ? { ...u, exercise: u.exercise - 1 } : u)),
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const UNIT_WORDS = /(kgs?|kilos?|kilograms?|lbs?|pounds?)\b/i;
const DAY_WORDS = /yesterday|last night|\bago\b|(mon|tues|wednes|thurs|fri|satur|sun)day|\b(mon|tue|wed|thu|fri|sat|sun)\b/i;

// Flags what a first parse may have guessed rather than read from the log: a number not in the log,
// a weight with no unit given, a day not named, a name the log doesn't contain, missing weight or reps
// on a lift. Kept alongside any flags the model returned.
export function flagGuesses(draft: Draft, input: string): Draft {
  const numbers = new Set((input.match(/\d+(?:[.,]\d+)?/g) ?? []).flatMap(n => [parseFloat(n.replace(',', '.')), ...n.split(',').map(Number)]));
  const text = norm(input);
  const flags: UnsureField[] = [...(draft.unsure ?? [])];
  const flag = (exercise: number, field: UnsureField['field']) => {
    if (!flags.some(u => u.exercise === exercise && u.field === field)) flags.push({ exercise, field });
  };

  draft.exercises.forEach((e, i) => {
    const ref = exerciseList.find(r => r.name === e.name);
    const names = [e.name, ...(ref?.aliases ?? [])].map(n => norm(n).replace(/s$/, ''));
    if (!names.some(n => text.includes(n)) || (e.dayOffset && !DAY_WORDS.test(input))) flag(i, 'name');
    for (const field of ['sets', 'reps', 'weight', 'duration', 'distance'] as const) {
      const v = e[field];
      if (v !== undefined && !numbers.has(v)) flag(i, field);
    }
    if (e.weight !== undefined && !UNIT_WORDS.test(input)) flag(i, 'weight');
    const lift = e.muscleGroup !== 'cardio' && e.duration === undefined && e.distance === undefined;
    if (lift && (e.sets !== undefined || e.reps !== undefined || e.weight !== undefined)) {
      if (e.reps === undefined) flag(i, 'reps');
      if (e.weight === undefined) flag(i, 'weight');
    }
  });
  return { ...draft, unsure: flags };
}
