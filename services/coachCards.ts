import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { catalogById } from '../data/catalog';
import { knownIdFor, displayName } from './exerciseIdentity';
import { inventedNumbers } from './insights';
import { estimateMeal } from './coachTools';
import { sumMacros } from './foods';
import { neverSuggested } from './foodPrefs';
import type { Remember, SuggestedMeal, SuggestedWorkout } from '../server/src/coach';
import type { ExerciseLibrary, Fact, FoodPrefs, MuscleGroup, UserSettings, WeightUnit } from '../types/workout';
import type { FoodEntry, FoodItem, Macros } from '../types/food';
import type { TemplateExercise } from '../types/template';

// The cards a coach answer can carry, made safe on the phone (data/lifttext-agentic/report.md §2.7):
// a workout's exercises resolve to the catalog or the user's own library and keep only weights the
// model was given; a meal's numbers come from the USDA table, never from the model; a thing to
// remember is stored only when the user taps yes. Pure functions, tested in coachCards.test.mts.

export const MAX_FACTS = 30;

export interface WorkoutCard {
  name: string;
  when: 'today' | 'tomorrow';
  why: string;
  exercises: (TemplateExercise & { isNew?: boolean })[]; // isNew: not in the catalog or the user's log
  muscleGroups: MuscleGroup[];
}

// The exercises as a template the user can plan or log. An unknown name stays, marked new; a weight
// that appears nowhere in what the model was given is dropped (the sets and reps stay).
export function resolveWorkout(w: SuggestedWorkout, library: ExerciseLibrary, unit: WeightUnit, given: unknown): WorkoutCard {
  const exercises = w.exercises.map(e => {
    const id = knownIdFor(e.name, library);
    const entry = id ? catalogById.get(id) : undefined;
    const custom = id ? library.custom.find(c => c.id === id) : undefined;
    const muscleGroup: MuscleGroup = entry?.primary ?? custom?.muscleGroup ?? 'full_body';
    const weight = e.weight !== undefined && inventedNumbers(String(e.weight), given).length === 0 ? e.weight : undefined;
    return {
      ...(id ? { exerciseId: id, match: 'sure' as const } : { isNew: true }),
      name: id ? (displayName(id, library) ?? e.name) : e.name,
      muscleGroup,
      sets: Math.min(10, Math.max(1, Math.round(e.sets))),
      reps: typeof e.reps === 'number' ? Math.min(100, Math.max(1, Math.round(e.reps))) : e.reps.slice(0, 12),
      ...(weight !== undefined ? { weight, weightUnit: unit } : {}),
      ...(e.note ? { notes: e.note.slice(0, 80) } : {}),
    };
  });
  return { name: w.name.slice(0, 40), when: w.when, why: w.why, exercises, muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))] };
}

export interface MealCard {
  label: string;
  note?: string;
  items: FoodItem[]; // USDA items, ready to log
  unknown: string[]; // foods the table doesn't have
  total: Macros;
  price?: number; // dollars a serving, the model's estimate; shown as "~$9"
  minutes?: number; // time to make it, the model's estimate
}

// Each meal priced from the USDA table on the phone; a meal with nothing the table knows is dropped, and
// so is one that holds a food on the never-suggest list (services/foodPrefs.ts): a filter, not a score
export function priceMeals(meals: SuggestedMeal[], foodEntries: FoodEntry[], prefs?: FoodPrefs): MealCard[] {
  return meals.flatMap(m => {
    if (neverSuggested([m.label, ...m.items].map(name => ({ name })), prefs)) return [];
    const { result, parsed: items } = estimateMeal(m.items, foodEntries);
    if (!items.length || neverSuggested(items, prefs)) return [];
    return [{
      label: m.label.slice(0, 40),
      ...(m.note ? { note: m.note.slice(0, 120) } : {}),
      items,
      unknown: (result.unknown as string[] | undefined) ?? [],
      total: sumMacros(items),
      ...(m.price ? { price: m.price } : {}),
      ...(m.minutes ? { minutes: m.minutes } : {}),
    }];
  });
}

// A meal card as a saved food log for today
export const mealEntry = (meal: MealCard, now: Date = new Date()): FoodEntry => ({
  id: uuidv4(),
  date: format(now, 'yyyy-MM-dd'),
  items: meal.items.map(i => ({ ...i, id: uuidv4() })),
  rawInput: `${meal.label}: ${meal.items.map(i => i.name).join(', ')}`,
  createdAt: now.toISOString(),
});

// The settings with a fact added: the newest version of the same words replaces the old one, and the
// list never passes MAX_FACTS (the oldest goes)
export function rememberFact(settings: UserSettings, r: Remember, now: Date = new Date()): UserSettings {
  const fact: Fact = { id: uuidv4(), kind: r.kind, text: r.text, quote: r.quote, saidOn: format(now, 'yyyy-MM-dd') };
  const same = (f: Fact) => f.text.trim().toLowerCase() === fact.text.trim().toLowerCase();
  const facts = [...(settings.profile?.facts ?? []).filter(f => !same(f)), fact].slice(-MAX_FACTS);
  return { ...settings, profile: { facts } };
}

export const forgetFact = (settings: UserSettings, id: string): UserSettings => ({ ...settings, profile: { facts: (settings.profile?.facts ?? []).filter(f => f.id !== id) } });
