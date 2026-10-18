/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

const { readMove, resolveMove, entryLabel, movedText, noMoveText } = await import('./moveLog');
const { useWorkoutStore } = await import('../stores/workoutStore');
const { scheduleService } = await import('./schedule');
const { foodByDay } = await import('./progress');
const { runTool } = await import('./coachTools');
const { mealsOf } = await import('./foods');

// Sunday, Oct 18 2026, 9 am local; times below are local too
const NOW = new Date(2026, 9, 18, 9, 0);
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).toISOString();
const item = (name: string, protein: number, kcal: number, said?: string) =>
  ({ id: `${name}-i`, name, said, source: 'estimate', macros: { kcal, protein, carbs: 0, fat: 0 } }) as any;
const meal = (id: string, date: string, createdAt: string, ...items: any[]) => ({ id, date, createdAt, items, rawInput: '' });
const workout = (id: string, date: string, createdAt: string, name = 'Bench Press') =>
  ({ id, date, createdAt, rawInput: '', muscleGroups: ['chest'], exercises: [{ id: `${id}-e`, name, muscleGroup: 'chest', sets: 3, reps: 5, weight: 185, unit: 'lbs' }] }) as any;

test('reads where a move goes, what it is and where it is now', () => {
  assert.deepEqual(readMove('I accidentally logged my food past midnight, move it to yesterday', NOW), { to: '2026-10-17', kind: 'food', night: true, words: [] });
  assert.deepEqual(readMove("Move today's lunch to Friday", NOW), { to: '2026-10-16', from: '2026-10-18', kind: 'food', slot: 'lunch', words: [] });
  assert.deepEqual(readMove('move my workout from yesterday to 2 days ago', NOW), { to: '2026-10-16', from: '2026-10-17', kind: 'workout', words: [] });
  assert.deepEqual(readMove('put the eggs on Oct 15', NOW), { to: '2026-10-15', words: ['egg'] });
  assert.equal(readMove('change it to 10/17', NOW)?.to, '2026-10-17');
  assert.equal(readMove('move it to Dec 30', NOW)?.to, '2025-12-30'); // a day ahead in the year is last year's
  assert.equal(readMove('move it to tomorrow', NOW), null); // not a day it reads; the parser gets it
});

test("logs and questions aren't moves", () => {
  assert.equal(readMove('switched to dumbbell press on monday, 3x10 at 60', NOW), null);
  assert.equal(readMove('how should I move on squats?', NOW), null);
  assert.equal(readMove('Should I move legs to Friday?', NOW), null);
  assert.equal(readMove('ate eggs yesterday', NOW), null);
  assert.equal(readMove('move feb 30 to yesterday', NOW)?.from, undefined); // a date that doesn't exist is ignored
});

test('the example from the request moves the one meal logged past midnight, keeping its time', () => {
  const food = [meal('late', '2026-10-18', at(18, 0, 40), item('Egg', 12, 140, '2 eggs'), item('Toast', 4, 80, 'toast')), meal('breakfast', '2026-10-18', at(18, 8, 10), item('Oats', 5, 150))];
  const found = resolveMove(readMove('I accidentally logged my food past midnight, move it to yesterday', NOW)!, [], food, NOW);
  assert.deepEqual(found, { to: '2026-10-17', entry: { kind: 'food', id: 'late' } });
  assert.equal(entryLabel({ kind: 'food', id: 'late' }, [], food), 'Late night (2 eggs, toast)');
  assert.equal(movedText('Late night (2 eggs, toast)', '2026-10-18', '2026-10-17'), 'Moved Late night (2 eggs, toast) from Oct 18 to Oct 17');
});

test('more than one fit: the user picks, newest first', () => {
  const food = [meal('a', '2026-10-18', at(18, 0, 10), item('Chips', 2, 300)), meal('b', '2026-10-18', at(18, 1, 5), item('Beer', 1, 150))];
  assert.deepEqual(resolveMove(readMove('move my food past midnight to yesterday', NOW)!, [], food, NOW), {
    to: '2026-10-17',
    pick: [{ kind: 'food', id: 'b' }, { kind: 'food', id: 'a' }],
  });
  // A food it names narrows it to one
  assert.deepEqual(resolveMove(readMove('move the chips to yesterday', NOW)!, [], food, NOW), { to: '2026-10-17', entry: { kind: 'food', id: 'a' } });
});

test('"it" alone is the last thing logged; nothing found or already there says so', () => {
  const food = [meal('f', '2026-10-18', at(18, 7), item('Oats', 5, 150))];
  const workouts = [workout('w', '2026-10-18', at(18, 8))];
  assert.deepEqual(resolveMove(readMove('move it to yesterday', NOW)!, workouts, food, NOW), { to: '2026-10-17', entry: { kind: 'workout', id: 'w' } });
  assert.deepEqual(resolveMove(readMove('move it to today', NOW)!, workouts, food, NOW), { to: '2026-10-18', none: 'already' });
  assert.deepEqual(resolveMove(readMove('move my dinner to yesterday', NOW)!, workouts, food, NOW), { to: '2026-10-17', none: 'nothing' });
  assert.equal('entry' in resolveMove(readMove('move the protein shake to yesterday', NOW)!, workouts, food, NOW), false); // a name not logged isn't "it"
  assert.equal(noMoveText({ to: '2026-10-17', none: 'already' }), "That's already on Oct 17.");
  // A log older than a week needs its day said
  const old = [workout('old', '2026-10-01', at(1, 18))];
  assert.equal('none' in resolveMove(readMove('move my workout to yesterday', NOW)!, old, [], NOW), true);
  assert.deepEqual(resolveMove(readMove('move my workout from oct 1 to yesterday', NOW)!, old, [], NOW), { to: '2026-10-17', entry: { kind: 'workout', id: 'old' } });
});

test('a moved meal counts on its new day everywhere food is totalled, and Undo moves it back', () => {
  const store = useWorkoutStore.getState;
  store().addFoodEntry(meal('m1', '2026-10-18', at(18, 0, 40), item('Egg', 12, 140), item('Toast', 4, 80)));
  store().addFoodEntry(meal('m2', '2026-10-17', at(17, 19), item('Steak', 50, 600)));
  store().addFoodEntry(meal('m3', '2026-10-10', at(10, 12), item('Rice', 4, 200)));

  const moved = store().moveEntry({ kind: 'food', id: 'm1' }, '2026-10-17');
  assert.deepEqual(moved, { kind: 'food', id: 'm1', from: '2026-10-18', to: '2026-10-17' });
  assert.equal(store().moved?.id, 'm1');
  assert.equal(store().foodEntries.find((e) => e.id === 'm1')!.createdAt, at(18, 0, 40)); // its time stays
  assert.deepEqual(store().foodEntries.map((e) => e.date), [...store().foodEntries.map((e) => e.date)].sort().reverse());

  const days = foodByDay(store().foodEntries);
  assert.equal(days.get('2026-10-18'), undefined);
  assert.deepEqual([days.get('2026-10-17')!.protein, days.get('2026-10-17')!.kcal, days.get('2026-10-17')!.meals], [66, 820, 2]);
  // The night's meal shows last on its new day
  assert.deepEqual(mealsOf(store().foodEntries.filter((e) => e.date === '2026-10-17')).map((m) => m.name), ['Evening', 'Late night']);
  // The coach's food_log reads it on its new day too
  const data = { workouts: [], foodEntries: store().foodEntries, settings: { weightUnit: 'lbs' as const }, library: store().exerciseLibrary };
  const log = runTool('food_log', { from: '2026-10-17', to: '2026-10-18' }, data, NOW) as any;
  assert.deepEqual(log.days.map((d: any) => [d.date, d.meals.length, d.protein]), [['2026-10-17', 2, 66]]);

  assert.equal(store().moveEntry({ kind: 'food', id: 'm1' }, '2026-10-17'), null); // already there
  assert.equal(store().moveEntry({ kind: 'food', id: 'gone' }, '2026-10-17'), null);
  store().moveEntry(moved!, moved!.from); // Undo
  assert.equal(store().foodEntries.find((e) => e.id === 'm1')!.date, '2026-10-18');
});

test('a moved workout takes its planned session with it, and Undo brings it back', async () => {
  const store = useWorkoutStore.getState;
  const settle = () => new Promise((r) => setTimeout(r, 10));
  await scheduleService.saveSchedule([
    { id: 'thu', date: '2026-10-15', templateId: 't', isRecurring: false, completed: false, planId: 'p' },
    { id: 'fri', date: '2026-10-16', templateId: 't', isRecurring: false, completed: false, planId: 'p' },
  ]);
  store().addWorkout(workout('w1', '2026-10-15', at(15, 18)));
  await settle();
  const session = (id: string) => store().schedule.find((s) => s.id === id);
  assert.equal(session('thu')?.completedWorkoutId, 'w1');

  const moved = store().moveEntry({ kind: 'workout', id: 'w1' }, '2026-10-16');
  await settle();
  assert.deepEqual(store().getWorkoutsByDate('2026-10-16').map((w) => w.id), ['w1']);
  assert.deepEqual([session('thu')?.completed, session('fri')?.completedWorkoutId], [false, 'w1']);

  store().moveEntry(moved!, moved!.from);
  await settle();
  assert.deepEqual([session('thu')?.completedWorkoutId, session('fri')?.completed], ['w1', false]);
});
