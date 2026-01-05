import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, WorkoutStats, WorkoutStreak, UserSettings, MuscleGroup } from '../types/workout';
import { format, startOfWeek, startOfMonth, differenceInDays, parseISO, isAfter, subDays } from 'date-fns';

interface WorkoutState {
  workouts: Workout[];
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;

  // Computed
  stats: WorkoutStats;

  // Actions
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, updates: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  getWorkoutsByDate: (date: string) => Workout[];
  getWorkoutDates: () => Set<string>;
  updateSettings: (settings: Partial<UserSettings>) => void;
  clearAllData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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

  const thisWeek = workouts.filter((w) =>
    isAfter(parseISO(w.date), weekStart) || format(parseISO(w.date), 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
  ).length;

  const thisMonth = workouts.filter((w) =>
    isAfter(parseISO(w.date), monthStart) || format(parseISO(w.date), 'yyyy-MM-dd') === format(monthStart, 'yyyy-MM-dd')
  ).length;

  const workoutsByMuscleGroup = workouts.reduce((acc, workout) => {
    workout.muscleGroups.forEach((group) => {
      acc[group] = (acc[group] || 0) + 1;
    });
    return acc;
  }, {} as Record<MuscleGroup, number>);

  return {
    totalWorkouts: workouts.length,
    thisWeek,
    thisMonth,
    streak: calculateStreak(workouts),
    workoutsByMuscleGroup,
  };
}

const defaultSettings: UserSettings = {
  weightUnit: 'lbs',
  theme: 'light',
  showStreakNotifications: true,
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      settings: defaultSettings,
      isLoading: false,
      error: null,

      get stats() {
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
    }),
    {
      name: '@training-tracker/storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        workouts: state.workouts,
        settings: state.settings,
      }),
    }
  )
);
