import type { Metric } from '../data/catalog';

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
  renames: Record<string, string>; // display-name overrides for catalog ids
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
  showStreakNotifications: boolean;
  weeklyTarget?: number; // days a week from setup or Settings (3, 4 or 5); unset = the usual count
  goal?: TrainingGoal; // asked the first time the user plans; unset = general fitness
  onboardedAt?: string; // yyyy-MM-dd setup was finished or skipped; unset for users from before setup
  goals?: Goals; // checked against the log on Progress; "days a week" is weeklyTarget
}

export type TrainingGoal = 'strength' | 'muscle' | 'fitness' | 'comeback';

// Goals the Progress tab checks against the last 7 days of the log (services/goals.ts)
export interface Goals {
  muscles: MuscleGroup[]; // the muscles the two muscle goals cover
  timesPerWeek?: number; // each muscle trained on this many days; unset = off
  minSets?: Partial<Record<MuscleGroup, number>>; // minimum sets a week (MEV); a muscle without a number gets the default; unset = off
  custom: CustomGoal[];
}

// Goals someone sets for themselves: a weight to lift, or an exercise to do often
export type CustomGoal =
  | { id: string; kind: 'lift'; exerciseId: string; weight: number; unit: WeightUnit }
  | { id: string; kind: 'often'; exerciseId: string; perWeek: number };

// Analytics data types
export interface WorkoutStreak {
  current: number;
  longest: number;
  lastWorkoutDate: string | null;
}

export interface WorkoutStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  averagePerWeek: number;
  streak: WorkoutStreak;
  workoutsByMuscleGroup: Record<MuscleGroup, number>;
  workoutsByDayOfWeek: Record<string, number>;
  mostTrainedMuscleGroup: { group: MuscleGroup; count: number } | null;
  leastTrainedMuscleGroup: { group: MuscleGroup; count: number } | null;
  favoriteDay: { day: string; count: number } | null;
}

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
