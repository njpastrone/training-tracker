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
  name: string;
  muscleGroup: MuscleGroup;
  sets?: number;
  reps?: number;
  weight?: number;
  unit?: WeightUnit;
  duration?: number; // minutes (for cardio)
  distance?: number; // miles/km (for cardio)
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
  theme: 'light' | 'dark' | 'system';
  showStreakNotifications: boolean;
}

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
  streak: WorkoutStreak;
  workoutsByMuscleGroup: Record<MuscleGroup, number>;
}

// Response from Claude API parsing
export interface ParsedWorkoutResponse {
  exercises: Omit<Exercise, 'id'>[];
  muscleGroups: MuscleGroup[];
  notes?: string;
  confidence: number; // 0-1 confidence score
}
