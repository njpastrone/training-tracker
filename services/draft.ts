import type { ParsedWorkoutResponse } from '../types/workout';

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
