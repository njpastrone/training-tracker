import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, WorkoutStats, WorkoutStreak, UserSettings, MuscleGroup } from '../types/workout';
import { WorkoutTemplate, TemplateSchedule } from '../types/template';
import { templateService } from '../services/templates';
import { scheduleService } from '../services/schedule';
import { format, startOfWeek, startOfMonth, startOfYear, differenceInDays, parseISO, isAfter, subDays, getDay } from 'date-fns';

interface WorkoutState {
  workouts: Workout[];
  settings: UserSettings;
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
function calculateStats(workouts: Workout[]): WorkoutStats {
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

const defaultSettings: UserSettings = {
  weightUnit: 'lbs',
  theme: 'system',
  showStreakNotifications: true,
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      settings: defaultSettings,
      templates: [],
      schedule: [],
      isLoading: false,
      error: null,

      getStats: () => {
        return calculateStats(get().workouts);
      },

      addWorkout: (workout) => {
        set((state) => ({
          workouts: [workout, ...state.workouts].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
          error: null,
        }));
      },

      updateWorkout: (id, updates) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
        }));
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

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      clearAllData: async () => {
        set({
          workouts: [],
          settings: defaultSettings,
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
      name: '@training-tracker/storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        workouts: state.workouts,
        settings: state.settings,
        // Templates and Schedule are stored separately via services
      }),
    }
  )
);
