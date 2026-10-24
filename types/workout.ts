import type { Metric } from '../data/catalog';
import type { PaletteId } from '../constants/palettes';

// Muscle group categories
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'cardio'
  | 'full_body';

// Weight unit preference
export type WeightUnit = 'lbs' | 'kg';

// Individual exercise within a workout
export interface Exercise {
  id: string;
  exerciseId?: string; // identity: a catalog id (data/catalog.ts) or 'custom-<uuid>'. The store fills it on save
  name: string; // display name at log time; never rewritten
  said?: string; // the user's own words for this exercise, verbatim
  match?: 'sure' | 'unsure'; // 'unsure' until the user confirms it; PRs skip unsure entries
  muscleGroup: MuscleGroup;
  sets?: number;
  reps?: number;
  weight?: number;
  unit?: WeightUnit;
  duration?: number; // minutes (for cardio)
  distance?: number; // in distanceUnit (for cardio)
  distanceUnit?: 'mi' | 'km' | 'm';
  notes?: string;
}

// A complete workout session
export interface Workout {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  exercises: Exercise[];
  rawInput: string; // Original user input text
  muscleGroups: MuscleGroup[]; // Derived from exercises
  notes?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  templateId?: string; // Reference to template if workout was created from one
}

// An exercise the catalog doesn't have, created from the user's own name for it
export interface CustomExercise {
  id: string; // 'custom-<uuid>'
  name: string;
  muscleGroup: MuscleGroup;
  metric: Metric;
  createdAt: string;
}

// The user's side of exercise identity, persisted with workouts. Their library of exercises is
// derived from the ids in their workouts plus `custom`.
export interface ExerciseLibrary {
  custom: CustomExercise[];
  renames: Record<string, string>; // display-name overrides; the id never changes
  aliases: Record<string, string>; // normalized words ("bb bench") → exerciseId; written only by explicit answers
  merged: Record<string, string>; // merged-away id → the id it now resolves to
}

// Exercise from the reference database
export interface ExerciseReference {
  name: string;
  aliases: string[]; // Alternative names (e.g., "bench" for "bench press")
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  isCompound: boolean; // Works multiple muscle groups
  equipment?: string[];
}

// User settings/preferences
export interface UserSettings {
  weightUnit: WeightUnit;
  weeklyTarget?: number; // days a week from setup or Settings (3, 4 or 5); unset = the usual count
  goal?: TrainingGoal; // asked the first time the user plans; unset = general fitness
  onboardedAt?: string; // yyyy-MM-dd setup was finished or skipped; unset for users from before setup
  goals?: Goals; // checked against the log on Progress; "days a week" is weeklyTarget
  aiConsent?: 'granted' | 'declined' | 'under18'; // asked before the first AI call (services/aiConsent.ts); unset = not asked yet; only 'granted' (18+) turns AI on
  aiConsentVersion?: number; // which version of that question was answered; older (or unset) = asked again
  goalsPromptDismissed?: boolean; // "Not now" on Progress's set-a-goal prompt: it doesn't come back
  profile?: { facts: Fact[] }; // things you told the coach to remember (services/ask.ts); shown and deletable in Settings
  appleHealth?: AppleHealthSettings; // Settings › Apple Health; what Health holds is never stored here (services/health.ts)
  foodPrefs?: FoodPrefs; // how you like to eat (app/food-prefs.tsx); sent to the coach only with a question, like facts, never stored by the Worker
  foodPrefsPromptDismissed?: boolean; // "Not now" on the food surface's set-up prompt: it doesn't come back
  palette?: PaletteId; // Settings › App colours (constants/palettes.ts); unset = the default scheme
}

// How you like to eat (services/foodPrefs.ts): what every meal idea is checked against one by one, a
// budget, foods never to suggest, and how long you cook. All of it stays on the phone.
export type FoodPreference = 'protein' | 'lowSpike' | 'simple' | 'noSeedOils' | 'cheap' | 'lowCalorie' | 'highFiber';
export interface FoodPrefs {
  matters: FoodPreference[];
  budget?: 8 | 12 | 16; // dollars a meal; unset = any
  never: string[]; // a chip's word ("shellfish", standing for every shellfish) or your own words; a filter, never a score
  cooking?: 0 | 10 | 20 | 40; // minutes you'll spend; 0 = no cooking, assembled food only; unset = not asked
}

export interface AppleHealthSettings {
  connected?: boolean; // Progress shows workouts from other apps and body weight from Apple Health
  saveSince?: string; // ISO time "Save workouts to Apple Health" was turned on; unset = off. Older workouts aren't saved
}

// One thing you told the coach ("no dairy", "home gym, dumbbells to 50 lb", "left knee"), kept in your
// words with the day you said it. The coach offers to remember; it is stored only when you tap yes.
export interface Fact {
  id: string;
  kind: 'constraint' | 'preference' | 'equipment' | 'food' | 'injury';
  text: string; // the fact in a few words
  quote: string; // what you actually said
  saidOn: string; // yyyy-MM-dd
}

export type TrainingGoal = 'strength' | 'muscle' | 'fitness' | 'comeback';

// Goals the Progress tab checks against the last 7 days of the log (services/goals.ts)
export interface Goals {
  muscles: MuscleGroup[]; // the muscles the two muscle goals cover
  timesPerWeek?: number; // each muscle trained on this many days; unset = off
  minSets?: Partial<Record<MuscleGroup, number>>; // minimum sets a week (MEV); a muscle without a number gets the default; unset = off
  custom: CustomGoal[];
  food?: FoodGoal; // the main food goal (protein, else calories), checked on days with food logged; unset = off
  foodGoals?: FoodGoal[]; // the other food goals on Food's goals card, one per kind (services/goals.ts foodGoalRows); unset = none
}

// A food goal: at least this much protein (g), calories (kcal) at or under it on a cut, at least it on a bulk,
// at least this much fiber (g), or at least this many low-GI meals a day (needs fiber and GI numbers in the food log)
export interface FoodGoal {
  kind: 'protein' | 'cut' | 'bulk' | 'fiber' | 'lowgi';
  target: number;
}

// Goals someone sets for themselves: a weight to lift, or an exercise to do often
export type CustomGoal =
  | { id: string; kind: 'lift'; exerciseId: string; weight: number; unit: WeightUnit }
  | { id: string; kind: 'often'; exerciseId: string; perWeek: number };

// Response from Claude API parsing
export interface ParsedWorkoutResponse {
  // dayOffset: days before the logging date; alt: a second choice for an unsure exercise
  exercises: (Omit<Exercise, 'id'> & { dayOffset?: number; alt?: string })[];
  muscleGroups: MuscleGroup[];
  notes?: string;
  confidence: number; // 0-1 confidence score
  unsure?: UnsureField[]; // values a correction couldn't be sure of, highlighted for review before saving
}

export interface UnsureField {
  exercise: number; // index into exercises
  field: 'name' | 'sets' | 'reps' | 'weight' | 'duration' | 'distance';
}
