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

// Flags genuine ambiguity in a first parse, never missing detail (sets, reps and weight are optional):
// an exercise the log doesn't name, a weight or rep count that isn't in the log (plate math, "same as
// rows"), a weight with no unit given, a day not named. Kept alongside any flags the model returned.
export function flagGuesses(draft: Draft, input: string): Draft {
  const numbers = new Set((input.match(/\d+(?:[.,]\d+)?/g) ?? []).flatMap(n => [parseFloat(n.replace(',', '.')), ...n.split(',').map(Number)]));
  const text = norm(input);
  const flags: UnsureField[] = [...(draft.unsure ?? [])];
  const flag = (exercise: number, field: UnsureField['field']) => {
    if (!flags.some(u => u.exercise === exercise && u.field === field)) flags.push({ exercise, field });
  };

  draft.exercises.forEach((e, i) => {
    // The exercise counts as named when the log has its name, an alias, or one of their words ("rows" →
    // Barbell Row). Cardio is left alone: "ran" or "jog" for Running isn't ambiguous.
    const ref = exerciseList.find(r => r.name === e.name);
    const phrases = [e.name, ...(ref?.aliases ?? [])];
    const words = phrases.flatMap(n => n.split(/[\s-]+/));
    const named = [...phrases, ...words].map(n => norm(n).replace(/s$/, '')).some(n => n.length >= 3 && text.includes(n));
    if ((!named && e.muscleGroup !== 'cardio') || (e.dayOffset && !DAY_WORDS.test(input))) flag(i, 'name');
    // Sets of 1 and time or distance conversions ("6:30", "5k") follow the parsing rules, so they aren't guesses
    for (const field of ['reps', 'weight'] as const) {
      const v = e[field];
      if (v !== undefined && !numbers.has(v)) flag(i, field);
    }
    if (e.weight !== undefined && !UNIT_WORDS.test(input)) flag(i, 'weight');
  });
  return { ...draft, unsure: flags };
}
