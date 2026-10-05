import type { ParsedWorkoutResponse, UnsureField } from '../types/workout';
import { exercises as exerciseList } from '../data/exercises';

type Draft = ParsedWorkoutResponse;
type Field = keyof Draft['exercises'][number];

// Editing a value confirms it, so it is no longer flagged as unsure. A new name is a new exercise,
// so its identity is resolved again on save.
export function editDraft(draft: Draft, index: number, field: Field, value: unknown): Draft {
  const reset = field === 'name' ? { exerciseId: undefined, match: undefined } : {};
  return {
    ...draft,
    exercises: draft.exercises.map((e, i) => (i === index ? { ...e, ...reset, [field]: value } : e)),
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

// After a typed fix, each exercise the model returned under the name it was sent (its own name before
// snapping to the list) or as the same exercise keeps its display name and identity, so only renamed
// ones are resolved again on save. Draft exercises are matched in order, so merged sets, added and
// removed exercises don't shift the others. Earlier flags stay on values the fix left unchanged.
export function keepIdentity(before: Draft, after: Draft, returnedNames: string[]): Draft {
  const same = (a?: string, b?: string) => a !== undefined && b !== undefined && a.trim().toLowerCase() === b.trim().toLowerCase();
  const source: (number | undefined)[] = [];
  let next = 0;
  after.exercises.forEach((e, i) => {
    for (let j = next; j < before.exercises.length; j++) {
      const old = before.exercises[j];
      if (same(returnedNames[i], old.name) || (!!old.exerciseId && e.exerciseId === old.exerciseId)) {
        source[i] = j;
        next = j + 1;
        return;
      }
    }
  });
  const exercises = after.exercises.map((e, i) => {
    const old = source[i] === undefined ? undefined : before.exercises[source[i]!];
    return old ? { ...e, name: old.name, exerciseId: old.exerciseId, match: old.match, said: old.said } : e;
  });
  const unsure = [...(after.unsure ?? [])];
  for (const u of before.unsure ?? []) {
    const exercise = source.indexOf(u.exercise);
    const unchanged = exercise >= 0 && exercises[exercise][u.field] === before.exercises[u.exercise][u.field];
    if (unchanged && !unsure.some(f => f.exercise === exercise && f.field === u.field)) unsure.push({ exercise, field: u.field });
  }
  return { ...after, exercises, unsure };
}

// What the fix box says when a fix came back with no change and no answer
export const NOTHING_CHANGED = "I didn't change anything. Tell me what to fix.";

// Same workout, ignoring row ids and identity bookkeeping: did a typed fix change anything?
export function sameDraft(a: Pick<Draft, 'exercises' | 'muscleGroups' | 'notes'>, b: Pick<Draft, 'exercises' | 'muscleGroups' | 'notes'>): boolean {
  const fields = ['name', 'exerciseId', 'muscleGroup', 'sets', 'reps', 'weight', 'unit', 'duration', 'distance', 'distanceUnit', 'dayOffset', 'notes'] as const;
  const groups = (d: Pick<Draft, 'muscleGroups'>) => [...new Set(d.muscleGroups)].sort().join();
  return (a.notes ?? '') === (b.notes ?? '') && groups(a) === groups(b) && a.exercises.length === b.exercises.length &&
    a.exercises.every((e, i) => fields.every(f => e[f] === b.exercises[i][f]));
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const MULTIPLES: Record<string, number> = { double: 2, triple: 3 };
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).map(w => w.replace(/s$/, '')).filter(Boolean);
const UNIT_WORDS = /(kgs?|kilos?|kilograms?|lbs?|pounds?)\b/i;
const DAY_WORDS = /yesterday|last night|\bago\b|(mon|tues|wednes|thurs|fri|satur|sun)day|\b(mon|tue|wed|thu|fri|sat|sun)\b/i;

// Flags genuine ambiguity in a first parse, never missing detail (sets, reps and weight are optional):
// an exercise the log doesn't name, a weight or rep count that isn't in the log (digits or number words) (plate math, "same as
// rows"), a weight with no unit given, a day not named. Kept alongside any flags the model returned.
export function flagGuesses(draft: Draft, input: string): Draft {
  const numbers = new Set((input.match(/\d+(?:[.,]\d+)?/g) ?? []).flatMap(n => [parseFloat(n.replace(',', '.')), ...n.split(',').map(Number)]));
  const logWords = words(input);
  logWords.forEach(w => (w in MULTIPLES || NUMBER_WORDS.includes(w)) && numbers.add(MULTIPLES[w] ?? NUMBER_WORDS.indexOf(w)));
  const flags: UnsureField[] = [...(draft.unsure ?? [])];
  const flag = (exercise: number, field: UnsureField['field']) => {
    if (!flags.some(u => u.exercise === exercise && u.field === field)) flags.push({ exercise, field });
  };

  draft.exercises.forEach((e, i) => {
    // The exercise counts as named when the log has its full name or an alias as whole words, plural s
    // allowed ("barbell rows"); a lone generic word like "rows" or "press" doesn't. Cardio is left alone:
    // "ran" or "jog" for Running isn't ambiguous, nor are the "<Part> Workout" entries for body-part logs.
    const ref = exerciseList.find(r => r.name === e.name);
    const named = / workout$/i.test(e.name) || [e.name, ...(ref?.aliases ?? [])].map(words).some(p => logWords.some((_, k) => p.every((w, j) => logWords[k + j] === w)));
    // With exercise identity, its own verdict decides which exercise is meant; the word check is the fallback
    const unsureExercise = e.match ? e.match === 'unsure' : !named && e.muscleGroup !== 'cardio';
    if (unsureExercise || (e.dayOffset && !DAY_WORDS.test(input))) flag(i, 'name');
    // Sets of 1 and time or distance conversions ("6:30", "5k") follow the parsing rules, so they aren't guesses
    for (const field of ['reps', 'weight'] as const) {
      const v = e[field];
      if (v !== undefined && !numbers.has(v)) flag(i, field);
    }
    if (e.weight !== undefined && !UNIT_WORDS.test(input)) flag(i, 'weight');
  });
  return { ...draft, unsure: flags };
}
