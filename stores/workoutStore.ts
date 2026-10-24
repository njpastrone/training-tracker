import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, UserSettings, MuscleGroup, ExerciseLibrary } from '../types/workout';
import { FoodEntry, FoodItem } from '../types/food';
import { WorkoutTemplate, TemplateSchedule } from '../types/template';
import { templateService } from '../services/templates';
import { scheduleService, SessionLink } from '../services/schedule';
import {
  emptyLibrary, forgetPick, mergeExercise, migrateToV1, rememberName, rememberPick, removeAlias, renameExercise,
  splitExercise, unmergeExercise, unsplitExercise, withIdentity, type Split,
} from '../services/exerciseIdentity';
import { withFoodGoal } from '../services/goals';
import { useChatStore } from './chatStore';
import type { EntryRef } from '../services/moveLog';
import { format } from 'date-fns';

// Undo payload: the deleted workouts and the plan sessions their delete reopened
export interface DeletedWorkouts {
  workouts: Workout[];
  sessions: Promise<SessionLink[]>;
}

// A log moved to another day: Undo moves it back to `from`
export interface MovedEntry extends EntryRef {
  from: string;
  to: string;
}

interface WorkoutState {
  workouts: Workout[];
  foodEntries: FoodEntry[]; // what was eaten, newest day first; saved and backed up with workouts
  settings: UserSettings;
  exerciseLibrary: ExerciseLibrary;
  templates: WorkoutTemplate[];
  schedule: TemplateSchedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addWorkout: (workout: Workout) => void;
  importWorkouts: (workouts: Workout[], library: ExerciseLibrary) => void; // from services/importHistory.ts, identity already filled
  updateWorkout: (id: string, updates: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  deleteWorkouts: (ids: string[]) => DeletedWorkouts;
  restoreWorkouts: (deleted: DeletedWorkouts) => void;
  // The last delete the user can still undo; <UndoToast> shows it on whichever screen they land on
  undo: (DeletedWorkouts & { at: number }) | null;
  deleteWithUndo: (ids: string[]) => void;
  clearUndo: () => void;
  getWorkoutsByDate: (date: string) => Workout[];
  moveEntry: (entry: EntryRef, to: string) => MovedEntry | null; // null when it's gone or already there
  // The last move, for <UndoToast> on whichever screen the user lands on
  moved: (MovedEntry & { at: number }) | null;
  clearMoved: () => void;
  addFoodEntry: (entry: FoodEntry) => void;
  removeFoodItem: (entryId: string, itemId: string) => void; // the entry goes when its last item does
  updateFoodItem: (entryId: string, itemId: string, item: FoodItem) => void; // a new amount, unit or food; keeps its id
  updateSettings: (settings: Partial<UserSettings>) => void;
  createCustomExercise: (name: string, muscleGroup: MuscleGroup) => string;
  rememberName: (exerciseId: string, words: string) => void;
  rememberPick: (words: string, exerciseId: string) => ExerciseLibrary; // returns the library before, for forgetPick
  forgetPick: (words: string, before: ExerciseLibrary) => void;
  // The Exercises screen (services/exerciseIdentity.ts): every derived number follows the ids
  renameExercise: (exerciseId: string, name: string) => void;
  removeAlias: (words: string) => void;
  mergeExercise: (from: string, into: string) => void;
  unmergeExercise: (from: string) => void;
  splitExercise: (from: string, words: string, into: string) => Split;
  unsplitExercise: (split: Split) => void;
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

// Plan relinks run one at a time, so a move and its Undo don't race on the stored schedule
let relinking = Promise.resolve();

// Hears about each workout logged, changed, deleted or brought back by Undo here (services/health.ts saves
// them to Apple Health); imports, backup restores and Clear all data don't call it
export type WorkoutChange = { saved?: Workout[]; removed?: string[] };
let workoutListener: ((change: WorkoutChange) => void) | null = null;
export function setWorkoutListener(fn: ((change: WorkoutChange) => void) | null) {
  workoutListener = fn;
}

const defaultSettings: UserSettings = {
  weightUnit: 'lbs',
};

// The one way to read food preferences (services/foodPrefs.ts): in a component, or anywhere else
export const useFoodPrefs = () => useWorkoutStore(s => s.settings.foodPrefs);
export const readFoodPrefs = () => useWorkoutStore.getState().settings.foodPrefs;

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      foodEntries: [],
      settings: defaultSettings,
      exerciseLibrary: emptyLibrary(),
      templates: [],
      schedule: [],
      isLoading: false,
      error: null,
      undo: null,
      moved: null,

      addWorkout: (newWorkout) => {
        const { workout, library } = withIdentity(newWorkout, get().exerciseLibrary);
        set((state) => ({
          workouts: [workout, ...state.workouts].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
          exerciseLibrary: library,
          error: null,
        }));
        workoutListener?.({ saved: [workout] });
        // Logging on a planned day completes that plan session
        scheduleService
          .linkLoggedWorkout(workout.date, workout.id)
          .then(linked => { if (linked) get().loadSchedule(); })
          .catch(error => console.error('Error linking workout to plan:', error));
      },

      // Past workouts from another app. Ids already here are kept as they are, so a second import adds nothing.
      importWorkouts: (imported, library) => {
        set((state) => {
          const have = new Set(state.workouts.map((w) => w.id));
          return {
            workouts: [...state.workouts, ...imported.filter((w) => !have.has(w.id))].sort((a, b) => b.date.localeCompare(a.date)),
            exerciseLibrary: library,
          };
        });
      },

      updateWorkout: (id, updates) => {
        const before = get().workouts.find((w) => w.id === id);
        let library = get().exerciseLibrary;
        const workouts = get().workouts.map((w) => {
          if (w.id !== id) return w;
          const r = withIdentity({ ...w, ...updates, updatedAt: new Date().toISOString() }, library);
          library = r.library;
          return r.workout;
        });
        // A new date moves it: Log's Recent and the Select list read the order as is
        set({ workouts: workouts.sort((a, b) => b.date.localeCompare(a.date)), exerciseLibrary: library });
        const updated = workouts.find((w) => w.id === id);
        if (updated) workoutListener?.({ saved: [updated] });
        // The plan follows: the old day's session it completed reopens, the new day's planned session completes
        if (before && updates.date && updates.date !== before.date) {
          const date = updates.date;
          relinking = relinking
            .then(async () => {
              const unlinked = await scheduleService.unlinkDeletedWorkouts([id]);
              if ((await scheduleService.linkLoggedWorkout(date, id)) || unlinked.length) await get().loadSchedule();
            })
            .catch(error => console.error('Error moving workout on the plan:', error));
        }
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
        if (removed.length) workoutListener?.({ removed: removed.map((w) => w.id) });
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
        const present = new Set(get().workouts.map((w) => w.id));
        const back = restored.filter((w) => !present.has(w.id));
        set((state) => ({
          workouts: [...state.workouts, ...back].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
        }));
        if (back.length) workoutListener?.({ saved: back });
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

      // Only the day changes: the time it was logged, its numbers and its id stay, so everything
      // computed from dates (days, History, Progress, streaks, food totals, PRs) follows
      moveEntry: ({ kind, id }, to) => {
        const from = (kind === 'workout' ? get().workouts : get().foodEntries).find((e) => e.id === id)?.date;
        if (!from || from === to) return null;
        if (kind === 'workout') get().updateWorkout(id, { date: to });
        else set((state) => ({ foodEntries: state.foodEntries.map((e) => (e.id === id ? { ...e, date: to } : e)).sort((a, b) => b.date.localeCompare(a.date)) }));
        const moved = { kind, id, from, to };
        set({ moved: { ...moved, at: Date.now() } });
        return moved;
      },

      clearMoved: () => set({ moved: null }),

      addFoodEntry: (entry) => {
        set((state) => ({ foodEntries: [entry, ...state.foodEntries].sort((a, b) => b.date.localeCompare(a.date)) }));
      },

      removeFoodItem: (entryId, itemId) => {
        set((state) => ({
          foodEntries: state.foodEntries
            .map((e) => (e.id === entryId ? { ...e, items: e.items.filter((i) => i.id !== itemId) } : e))
            .filter((e) => e.items.length > 0),
        }));
      },

      updateFoodItem: (entryId, itemId, item) => {
        set((state) => ({
          foodEntries: state.foodEntries.map((e) =>
            e.id === entryId ? { ...e, items: e.items.map((i) => (i.id === itemId ? { ...item, id: itemId } : i)) } : e
          ),
        }));
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

      rememberPick: (words, exerciseId) => {
        const before = get().exerciseLibrary;
        set({ exerciseLibrary: rememberPick(before, words, exerciseId) });
        return before;
      },

      forgetPick: (words, before) => {
        set((state) => ({ exerciseLibrary: forgetPick(state.exerciseLibrary, words, before) }));
      },

      renameExercise: (exerciseId, name) => {
        set((state) => ({ exerciseLibrary: renameExercise(state.exerciseLibrary, exerciseId, name) }));
      },

      removeAlias: (words) => {
        set((state) => ({ exerciseLibrary: removeAlias(state.exerciseLibrary, words) }));
      },

      mergeExercise: (from, into) => {
        set((state) => ({ exerciseLibrary: mergeExercise(state.exerciseLibrary, from, into) }));
      },

      unmergeExercise: (from) => {
        set((state) => ({ exerciseLibrary: unmergeExercise(state.exerciseLibrary, from) }));
      },

      splitExercise: (from, words, into) => {
        const r = splitExercise(get().workouts, get().exerciseLibrary, from, words, into);
        set({ workouts: r.workouts, exerciseLibrary: r.library });
        return r.split;
      },

      unsplitExercise: (split) => {
        const r = unsplitExercise(get().workouts, get().exerciseLibrary, split);
        set({ workouts: r.workouts, exerciseLibrary: r.library });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      clearAllData: async () => {
        set({
          workouts: [],
          foodEntries: [],
          settings: defaultSettings,
          exerciseLibrary: emptyLibrary(),
          error: null,
        });
        useChatStore.getState().clear();
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
      // 2: goals.protein becomes the one food goal, goals.food
      version: 2,
      migrate: async (persisted, version) => {
        if (version === 0) await backupV0();
        try {
          const state = version < 1 ? migrateToV1(persisted as Partial<WorkoutState>) : (persisted as Partial<WorkoutState>);
          return withFoodGoal(state) as WorkoutState;
        } catch (error) {
          // Never fail hydration: that would leave the store empty and the next save would overwrite the data
          console.error('Error migrating workouts:', error);
          return persisted as WorkoutState;
        }
      },
      partialize: (state) => ({
        workouts: state.workouts,
        foodEntries: state.foodEntries,
        settings: state.settings,
        exerciseLibrary: state.exerciseLibrary,
        // Templates and Schedule are stored separately via services
      }),
    }
  )
);
