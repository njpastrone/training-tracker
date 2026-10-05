import { MuscleGroup } from './workout';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  muscleGroups: MuscleGroup[];
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  planId?: string; // Set on day types a training plan created (Upper A, Push...)
}

export interface TemplateExercise {
  exerciseId?: string; // set when the name names one catalog exercise, or copied from a logged workout
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number | string; // Allow "8-12" range format
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  notes?: string;
  restSeconds?: number;
}

export interface TemplateSchedule {
  id: string;
  date: string; // ISO date
  templateId: string;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurringDays?: string[]; // For custom pattern - ['Monday', 'Wednesday', 'Friday']
  completed: boolean;
  skipped?: boolean;
  skipReason?: string;
  completedWorkoutId?: string; // Reference to actual logged workout
  planId?: string; // Training plan that created this session
  note?: string; // Coach note for the day, e.g. "Easy day: stop ~3 reps short of failure"
}

export type CreateTemplateInput = Omit<WorkoutTemplate, 'id' | 'createdAt' | 'usageCount'>;
export type UpdateTemplateInput = Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>;