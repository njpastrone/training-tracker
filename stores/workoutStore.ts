import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, UserSettings, MuscleGroup, ExerciseLibrary } from '../types/workout';
import { WorkoutTemplate, TemplateSchedule } from '../types/template';
import { templateService } from '../services/templates';
import { scheduleService, SessionLink } from '../services/schedule';
import { emptyLibrary, migrateToV1, rememberName, withIdentity } from '../services/exerciseIdentity';
import { format } from 'date-fns';

// Undo payload: the deleted workouts and the plan sessions their delete reopened
export interface DeletedWorkouts {
  workouts: Workout[];
  sessions: Promise<SessionLink[]>;
}

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
  deleteWorkouts: (ids: string[]) => DeletedWorkouts;
  restoreWorkouts: (deleted: DeletedWorkouts) => void;
  // The last delete the user can still undo; <UndoToast> shows it on whichever screen they land on
  undo: (DeletedWorkouts & { at: number }) | null;
  deleteWithUndo: (ids: string[]) => void;
  clearUndo: () => void;
  getWorkoutsByDate: (date: string) => Workout[];
  updateSettings: (settings: Partial<UserSettings>) => void;
  createCustomExercise: (name: string, muscleGroup: MuscleGroup) => string;
  rememberName: (exerciseId: string, words: string) => void;
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
  cancelScheduledWorkout: (date: string) => Promise<void>;
  deleteRecurringSeries: (templateId: string, recurringPattern: 'weekly' | 'biweekly' | 'monthly' | 'custom', customDays?: string[]) => Promise<number>;
  markWorkoutCompleted: (date: string, workoutId?: string) => Promise<void>;
  markWorkoutSkipped: (date: string, reason?: string) => Promise<void>;
  getTodaysScheduledWorkout: () => TemplateSchedule | null;
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
      undo: null,

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
        // A new date moves it: Log's Recent and the Select list read the order as is
        set({ workouts: workouts.sort((a, b) => b.date.localeCompare(a.date)), exerciseLibrary: library });
      },

      deleteWorkout: (id) => {
        get().deleteWorkouts([id]);
      },

      deleteWorkouts: (ids) => {
        const remove = new Set(ids);
        const removed = get().workouts.filter((w) => remove.has(w.id));
        set((state) => ({
          workouts: state.workouts.filter((w) => !remove.has(w.id)),
        }));
        const sessions = scheduleService
          .unlinkDeletedWorkouts(removed.map((w) => w.id))
          .then(links => {
            if (links.length) get().loadSchedule();
            return links;
          })
          .catch(error => {
            console.error('Error unlinking deleted workouts from plan:', error);
            return [];
          });
        return { workouts: removed, sessions };
      },

      deleteWithUndo: (ids) => {
        set({ undo: { ...get().deleteWorkouts(ids), at: Date.now() } });
      },

      clearUndo: () => set({ undo: null }),

      // Undo for deleteWorkouts. Stats, PRs and streaks derive from workouts, so they follow.
      restoreWorkouts: ({ workouts: restored, sessions }) => {
        set((state) => {
          const present = new Set(state.workouts.map((w) => w.id));
          return {
            workouts: [...state.workouts, ...restored.filter((w) => !present.has(w.id))].sort((a, b) =>
              b.date.localeCompare(a.date)
            ),
          };
        });
        sessions
          .then(async (links) => {
            if (!links.length) return;
            await scheduleService.restoreSessionLinks(links);
            get().loadSchedule();
          })
          .catch(error => console.error('Error restoring plan sessions:', error));
      },

      getWorkoutsByDate: (date) => {
        return get().workouts.filter((w) => w.date === date);
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

      rememberName: (exerciseId, words) => {
        set((state) => ({ exerciseLibrary: rememberName(state.exerciseLibrary, exerciseId, words) }));
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
