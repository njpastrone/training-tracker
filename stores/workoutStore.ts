import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, WorkoutStats, WorkoutStreak, UserSettings, MuscleGroup, ExerciseLibrary } from '../types/workout';
import { WorkoutTemplate, TemplateSchedule } from '../types/template';
import { templateService } from '../services/templates';
import { scheduleService } from '../services/schedule';
import { emptyLibrary, migrateToV1, withIdentity } from '../services/exerciseIdentity';
import { format, startOfWeek, startOfMonth, startOfYear, differenceInDays, parseISO, isAfter, subDays, getDay } from 'date-fns';

interface WorkoutState {
  workouts: Workout[];
  settings: UserSettings;
  exerciseLibrary: ExerciseLibrary;
  templates: WorkoutTemplate[];
  schedule: TemplateSchedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, updates: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  getWorkoutsByDate: (date: string) => Workout[];
  getWorkoutDates: () => Set<string>;
  getStats: () => WorkoutStats;
  updateSettings: (settings: Partial<UserSettings>) => void;
  createCustomExercise: (name: string, muscleGroup: MuscleGroup) => string;
  clearAllData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Template actions
  loadTemplates: () => Promise<void>;
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (id: string, updates: Partial<WorkoutTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => WorkoutTemplate | undefined;
  markTemplateUsed: (id: string) => Promise<void>;
  
  // Schedule actions
  loadSchedule: () => Promise<void>;
  scheduleWorkout: (date: string, templateId: string, isRecurring?: boolean, pattern?: 'weekly' | 'biweekly' | 'monthly') => Promise<void>;
  cancelScheduledWorkout: (date: string) => Promise<void>;
  deleteRecurringSeries: (templateId: string, recurringPattern: 'weekly' | 'biweekly' | 'monthly' | 'custom', customDays?: string[]) => Promise<number>;
  markWorkoutCompleted: (date: string, workoutId?: string) => Promise<void>;
  markWorkoutSkipped: (date: string, reason?: string) => Promise<void>;
  getTodaysScheduledWorkout: () => TemplateSchedule | null;
  getWeekSchedule: (weekStart: Date) => Promise<TemplateSchedule[]>;
}

// Helper to calculate streak
function calculateStreak(workouts: Workout[]): WorkoutStreak {
  if (workouts.length === 0) {
    return { current: 0, longest: 0, lastWorkoutDate: null };
  }

  // Sort by date descending
  const sortedWorkouts = [...workouts].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const lastWorkoutDate = sortedWorkouts[0].date;

  // Get unique workout dates
  const workoutDates = [...new Set(sortedWorkouts.map((w) => w.date))].sort(
    (a, b) => b.localeCompare(a)
  );

  // Calculate current streak
  let currentStreak = 0;
  const startDate = lastWorkoutDate === today || lastWorkoutDate === yesterday ? lastWorkoutDate : null;

  if (startDate) {
    let checkDate = startDate;
    for (const date of workoutDates) {
      if (date === checkDate) {
        currentStreak++;
        checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
      } else if (date < checkDate) {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 0; i < workoutDates.length - 1; i++) {
    const current = parseISO(workoutDates[i]);
    const next = parseISO(workoutDates[i + 1]);
    const diff = differenceInDays(current, next);

    if (diff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastWorkoutDate,
  };
}

// Helper to calculate stats
export function calculateStats(workouts: Workout[]): WorkoutStats {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);

  const thisWeek = workouts.filter((w) =>
    isAfter(parseISO(w.date), weekStart) || format(parseISO(w.date), 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
  ).length;

  const thisMonth = workouts.filter((w) =>
    isAfter(parseISO(w.date), monthStart) || format(parseISO(w.date), 'yyyy-MM-dd') === format(monthStart, 'yyyy-MM-dd')
  ).length;

  const thisYear = workouts.filter((w) =>
    isAfter(parseISO(w.date), yearStart) || format(parseISO(w.date), 'yyyy-MM-dd') === format(yearStart, 'yyyy-MM-dd')
  ).length;

  // Calculate average workouts per week (over last 4 weeks)
  const fourWeeksAgo = subDays(today, 28);
  const recentWorkouts = workouts.filter((w) => isAfter(parseISO(w.date), fourWeeksAgo));
  const averagePerWeek = Math.round((recentWorkouts.length / 4) * 10) / 10;

  // Muscle group analysis
  const workoutsByMuscleGroup = workouts.reduce((acc, workout) => {
    workout.muscleGroups.forEach((group) => {
      acc[group] = (acc[group] || 0) + 1;
    });
    return acc;
  }, {} as Record<MuscleGroup, number>);

  // Find most and least trained muscle groups (only if there are workouts)
  const muscleGroupEntries = Object.entries(workoutsByMuscleGroup) as [MuscleGroup, number][];
  const mostTrainedMuscleGroup = muscleGroupEntries.length > 0 
    ? muscleGroupEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max)
    : null;
  const leastTrainedMuscleGroup = muscleGroupEntries.length > 0
    ? muscleGroupEntries.reduce((min, curr) => curr[1] < min[1] ? curr : min)
    : null;

  // Day of week analysis
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const workoutsByDayOfWeek = workouts.reduce((acc, workout) => {
    const dayOfWeek = getDay(parseISO(workout.date));
    const dayName = dayNames[dayOfWeek];
    acc[dayName] = (acc[dayName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find favorite day
  const dayEntries = Object.entries(workoutsByDayOfWeek);
  const favoriteDay = dayEntries.length > 0
    ? dayEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max)
    : null;

  return {
    totalWorkouts: workouts.length,
    thisWeek,
    thisMonth,
    thisYear,
    averagePerWeek,
    streak: calculateStreak(workouts),
    workoutsByMuscleGroup,
    workoutsByDayOfWeek,
    mostTrainedMuscleGroup: mostTrainedMuscleGroup ? { group: mostTrainedMuscleGroup[0], count: mostTrainedMuscleGroup[1] } : null,
    leastTrainedMuscleGroup: leastTrainedMuscleGroup ? { group: leastTrainedMuscleGroup[0], count: leastTrainedMuscleGroup[1] } : null,
    favoriteDay: favoriteDay ? { day: favoriteDay[0], count: favoriteDay[1] } : null,
  };
}

const STORAGE_KEY = '@training-tracker/storage';
const V0_BACKUP_KEY = '@training-tracker/storage.v0-backup';

// Copies the stored blob before the version 0 → 1 migration touches it. The migration only adds
// fields, so a failed backup is logged and the migration still runs.
// ponytail: the backup is never pruned; drop it once the exercise review sheet has shipped
async function backupV0() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && !(await AsyncStorage.getItem(V0_BACKUP_KEY))) await AsyncStorage.setItem(V0_BACKUP_KEY, raw);
  } catch (error) {
    console.error('Error backing up workouts before migrating:', error);
  }
}

const defaultSettings: UserSettings = {
  weightUnit: 'lbs',
  showStreakNotifications: true,
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      settings: defaultSettings,
      exerciseLibrary: emptyLibrary(),
      templates: [],
      schedule: [],
      isLoading: false,
      error: null,

      getStats: () => {
        return calculateStats(get().workouts);
      },

      addWorkout: (newWorkout) => {
        const { workout, library } = withIdentity(newWorkout, get().exerciseLibrary);
        set((state) => ({
          workouts: [workout, ...state.workouts].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
          exerciseLibrary: library,
          error: null,
        }));
        // Logging on a planned day completes that plan session
        scheduleService
          .linkLoggedWorkout(workout.date, workout.id)
          .then(linked => { if (linked) get().loadSchedule(); })
          .catch(error => console.error('Error linking workout to plan:', error));
      },

      updateWorkout: (id, updates) => {
        let library = get().exerciseLibrary;
        const workouts = get().workouts.map((w) => {
          if (w.id !== id) return w;
          const r = withIdentity({ ...w, ...updates, updatedAt: new Date().toISOString() }, library);
          library = r.library;
          return r.workout;
        });
        set({ workouts, exerciseLibrary: library });
      },

      deleteWorkout: (id) => {
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        }));
      },

      getWorkoutsByDate: (date) => {
        return get().workouts.filter((w) => w.date === date);
      },

      getWorkoutDates: () => {
        return new Set(get().workouts.map((w) => w.date));
      },

      createCustomExercise: (name, muscleGroup) => {
        const id = `custom-${uuidv4()}`;
        set((state) => ({
          exerciseLibrary: {
            ...state.exerciseLibrary,
            custom: [...state.exerciseLibrary.custom, {
              id, name: name.trim(), muscleGroup,
              metric: muscleGroup === 'cardio' ? 'distance-time' : 'weight-reps',
              createdAt: new Date().toISOString(),
            }],
          },
        }));
        return id;
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      clearAllData: async () => {
        set({
          workouts: [],
          settings: defaultSettings,
          exerciseLibrary: emptyLibrary(),
          error: null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      // Template management
      loadTemplates: async () => {
        try {
          const templates = await templateService.getTemplates();
          set({ templates });
        } catch (error) {
          console.error('Error loading templates:', error);
          set({ error: 'Failed to load templates' });
        }
      },

      addTemplate: (template) => {
        set((state) => ({
          templates: [...state.templates, template],
        }));
      },

      updateTemplate: async (id, updates) => {
        try {
          await templateService.updateTemplate(id, updates);
          const templates = await templateService.getTemplates();
          set({ templates });
        } catch (error) {
          console.error('Error updating template:', error);
          set({ error: 'Failed to update template' });
        }
      },

      deleteTemplate: async (id) => {
        try {
          await templateService.deleteTemplate(id);
          set((state) => ({
            templates: state.templates.filter(t => t.id !== id),
          }));
        } catch (error) {
          console.error('Error deleting template:', error);
          set({ error: 'Failed to delete template' });
        }
      },

      getTemplate: (id) => {
        return get().templates.find(t => t.id === id);
      },

      markTemplateUsed: async (id) => {
        try {
          await templateService.markTemplateUsed(id);
          const templates = await templateService.getTemplates();
          set({ templates });
        } catch (error) {
          console.error('Error marking template as used:', error);
        }
      },

      // Schedule management
      loadSchedule: async () => {
        try {
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
        } catch (error) {
          console.error('Error loading schedule:', error);
          set({ error: 'Failed to load schedule' });
        }
      },

      scheduleWorkout: async (date, templateId, isRecurring = false, pattern) => {
        try {
          const scheduledWorkout = await scheduleService.scheduleWorkout(date, templateId, isRecurring, pattern);
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
        } catch (error) {
          console.error('Error scheduling workout:', error);
          set({ error: 'Failed to schedule workout' });
          throw error; // Re-throw error so calling function can catch it
        }
      },

      cancelScheduledWorkout: async (date) => {
        try {
          await scheduleService.cancelScheduledWorkout(date);
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
        } catch (error) {
          console.error('Error canceling scheduled workout:', error);
          set({ error: 'Failed to cancel workout' });
          throw error;
        }
      },

      deleteRecurringSeries: async (templateId, recurringPattern, customDays) => {
        try {
          const deletedCount = await scheduleService.deleteRecurringSeries(templateId, recurringPattern, customDays);
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
          return deletedCount;
        } catch (error) {
          console.error('Error deleting recurring series:', error);
          set({ error: 'Failed to delete recurring series' });
          throw error;
        }
      },

      markWorkoutCompleted: async (date, workoutId) => {
        try {
          await scheduleService.markWorkoutCompleted(date, workoutId);
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
        } catch (error) {
          console.error('Error marking workout completed:', error);
        }
      },

      markWorkoutSkipped: async (date, reason) => {
        try {
          await scheduleService.markWorkoutSkipped(date, reason);
          const schedule = await scheduleService.getSchedule();
          set({ schedule });
        } catch (error) {
          console.error('Error marking workout skipped:', error);
        }
      },

      getTodaysScheduledWorkout: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().schedule.find(s => s.date === today && !s.completed && !s.skipped) || null;
      },

      getWeekSchedule: async (weekStart) => {
        try {
          return await scheduleService.getWeekSchedule(weekStart);
        } catch (error) {
          console.error('Error getting week schedule:', error);
          return [];
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // 1: exercise identity (exerciseId and match on every logged exercise, plus the library)
      version: 1,
      migrate: async (persisted, version) => {
        if (version === 0) await backupV0();
        try {
          return migrateToV1(persisted as Partial<WorkoutState>) as WorkoutState;
        } catch (error) {
          // Never fail hydration: that would leave the store empty and the next save would overwrite the data
          console.error('Error migrating workouts:', error);
          return persisted as WorkoutState;
        }
      },
      partialize: (state) => ({
        workouts: state.workouts,
        settings: state.settings,
        exerciseLibrary: state.exerciseLibrary,
        // Templates and Schedule are stored separately via services
      }),
    }
  )
);
