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

test('bulk delete removes only the picked workouts, and Undo restores them in order', () => {
  // Three days of training, plus test workouts logged yesterday
  for (const w of [workout('a', day(0)), workout('b', day(1)), workout('c', day(2)), workout('t1', day(1)), workout('t2', day(1))]) {
    store().addWorkout(w);
  }
  const before = store().workouts.map((w) => w.id);

  const removed = store().deleteWorkouts(['t1', 't2', 'missing']);
  assert.deepEqual(removed.workouts.map((w) => w.id).sort(), ['t1', 't2']);
  assert.deepEqual(store().workouts.map((w) => w.id).sort(), ['a', 'b', 'c']);

  const yesterday = store().deleteWorkouts(['b']);

  store().restoreWorkouts(yesterday);
  store().restoreWorkouts(removed);
  store().restoreWorkouts(removed); // a second Undo tap adds nothing
  assert.equal(store().workouts.length, 5);
  assert.deepEqual(store().workouts.map((w) => w.date), [...store().workouts.map((w) => w.date)].sort().reverse());
  assert.deepEqual(new Set(store().workouts.map((w) => w.id)), new Set(before));
});

test('moving a workout to another date re-sorts the log, newest first', () => {
  store().addWorkout(workout('old', day(21)));
  assert.notEqual(store().workouts[0].id, 'old');

  store().updateWorkout('old', { date: day(-1) });
  assert.equal(store().workouts[0].id, 'old');
  assert.deepEqual(store().workouts.map((w) => w.date), [...store().workouts.map((w) => w.date)].sort().reverse());
  store().deleteWorkouts(['old']);
});

test('deleteWithUndo keeps the delete so any screen can offer Undo', () => {
  store().addWorkout(workout('swiped', day(3)));
  store().deleteWithUndo(['swiped']);
  assert.ok(!store().workouts.some((w) => w.id === 'swiped'));
  assert.deepEqual(store().undo?.workouts.map((w) => w.id), ['swiped']);

  store().restoreWorkouts(store().undo!);
  store().clearUndo();
  assert.ok(store().workouts.some((w) => w.id === 'swiped'));
  assert.equal(store().undo, null);
  store().deleteWorkouts(['swiped']);
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

test('Undo restores a manually scheduled session exactly', async () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const date = day(6);
  await scheduleService.saveSchedule([{ id: 's2', date, templateId: 't', isRecurring: false, completed: false }]);
  const session = () => store().schedule.find((s) => s.id === 's2');

  store().addWorkout(workout('manual', date));
  await store().markWorkoutCompleted(date, 'manual');
  assert.equal(session()?.completedWorkoutId, 'manual');

  const removed = store().deleteWorkouts(['manual']);
  await settle();
  assert.equal(session()?.completed, false);
  assert.equal(session()?.completedWorkoutId, undefined);

  store().restoreWorkouts(removed);
  await settle();
  assert.equal(session()?.completed, true);
  assert.equal(session()?.completedWorkoutId, 'manual');
});
