/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { format, subDays } from 'date-fns';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

const { useWorkoutStore } = await import('../stores/workoutStore');
const { scheduleService } = await import('./schedule');
const store = () => useWorkoutStore.getState();

const day = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd');
const workout = (id: string, date: string) => ({
  id, date, rawInput: 'bench', muscleGroups: ['chest'], createdAt: `${date}T10:00:00.000Z`,
  exercises: [{ id: `${id}-e`, name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 5, weight: 185, unit: 'lbs' }],
}) as any;

test('bulk delete removes only the picked workouts, stats follow, and Undo restores them in order', () => {
  // A three-day streak, plus test workouts logged yesterday
  for (const w of [workout('a', day(0)), workout('b', day(1)), workout('c', day(2)), workout('t1', day(1)), workout('t2', day(1))]) {
    store().addWorkout(w);
  }
  const before = store().workouts.map((w) => w.id);
  assert.equal(store().getStats().totalWorkouts, 5);

  const removed = store().deleteWorkouts(['t1', 't2', 'missing']);
  assert.deepEqual(removed.map((w) => w.id).sort(), ['t1', 't2']);
  assert.deepEqual(store().workouts.map((w) => w.id).sort(), ['a', 'b', 'c']);
  assert.equal(store().getStats().totalWorkouts, 3);
  assert.equal(store().getStats().streak.current, 3);

  // Deleting a whole day breaks the streak
  const yesterday = store().deleteWorkouts(['b']);
  assert.equal(store().getStats().streak.current, 1);

  store().restoreWorkouts(yesterday);
  store().restoreWorkouts(removed);
  store().restoreWorkouts(removed); // a second Undo tap adds nothing
  assert.equal(store().workouts.length, 5);
  assert.deepEqual(store().workouts.map((w) => w.date), [...store().workouts.map((w) => w.date)].sort().reverse());
  assert.deepEqual(new Set(store().workouts.map((w) => w.id)), new Set(before));
  assert.equal(store().getStats().streak.current, 3);
});

test('deleteWorkout still deletes one', () => {
  store().deleteWorkout('a');
  assert.ok(!store().workouts.some((w) => w.id === 'a'));
});

test('a planned session follows its workout through delete and Undo', async () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const date = day(5);
  await scheduleService.saveSchedule([{ id: 's1', date, templateId: 't', isRecurring: false, completed: false, planId: 'p' }]);
  const session = () => store().schedule.find((s) => s.id === 's1');

  store().addWorkout(workout('planned', date));
  await settle();
  assert.equal(session()?.completed, true);
  assert.equal(session()?.completedWorkoutId, 'planned');

  const removed = store().deleteWorkouts(['planned']);
  await settle();
  assert.equal(session()?.completed, false);
  assert.equal(session()?.completedWorkoutId, undefined);

  store().restoreWorkouts(removed);
  await settle();
  assert.equal(session()?.completed, true);
  assert.equal(session()?.completedWorkoutId, 'planned');
});
