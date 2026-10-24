/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogById } from '../data/catalog';
import { emptyLibrary } from './exerciseIdentity';
import { foodByDay } from './progress';
import { foodLogKnows } from './goals';
import { foodTrend, foodWeekOf, goalWeek, layoutMeals, mealBubbles, muscleWeek, nextMeal, nextUp, trainingWeek, weekDates, weekRange } from './week';
import type { FoodEntry } from '../types/food';
import type { Workout } from '../types/workout';
import type { TemplateSchedule, WorkoutTemplate } from '../types/template';

// Today is Fri 2026-10-23, 4 pm; this week is Mon Oct 19 – Sun Oct 25
const NOW = new Date(2026, 9, 23, 16);
const library = emptyLibrary();

const w = (date: string, ids: [string, number][]): Workout => {
  const exercises = ids.map(([id, sets], i) => ({ id: `${date}-${i}`, exerciseId: id, name: catalogById.get(id)!.name, muscleGroup: catalogById.get(id)!.primary, sets, reps: 8, weight: 100, unit: 'lbs' as const }));
  return { id: date, date, exercises, rawInput: '', muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))], createdAt: `${date}T19:00:00` };
};
const push = (date: string) => w(date, [['bench-press', 4], ['overhead-press', 3], ['tricep-pushdown', 3]]);
const legs = (date: string) => w(date, [['squat', 3], ['romanian-deadlift', 3]]);
const template = (name: string, ids: string[]): WorkoutTemplate => ({
  id: name,
  name,
  exercises: ids.map(id => ({ exerciseId: id, name: catalogById.get(id)!.name, muscleGroup: catalogById.get(id)!.primary, sets: 3, reps: 8 })),
  muscleGroups: [...new Set(ids.map(id => catalogById.get(id)!.primary))],
  createdAt: '2026-10-01T00:00:00',
  usageCount: 0,
});
const TEMPLATES = [template('Legs', ['squat', 'romanian-deadlift', 'standing-calf-raise']), template('Push', ['bench-press'])];
const plan = (date: string, templateId: string): TemplateSchedule => ({ id: date, date, templateId, isRecurring: false, completed: false });

const meal = (date: string, time: string, protein: number): FoodEntry => ({
  id: `${date}T${time}`,
  date,
  items: [{ id: 'i', name: 'Food', macros: { kcal: protein * 10, protein, carbs: 0, fat: 0 }, source: 'estimate' }],
  rawInput: '',
  createdAt: `${date}T${time}:00`,
});
const GOAL = { kind: 'protein' as const, target: 160 };

test('the week is Monday to Sunday and named by its range', () => {
  assert.deepEqual(weekDates(NOW), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.equal(weekRange(NOW), 'Oct 19 – 25');
  assert.equal(weekRange(new Date(2026, 9, 1)), 'Sep 28 – Oct 4');
});

test('the training week: trained days, the planned day, and what is next', () => {
  const week = trainingWeek([legs('2026-10-19'), push('2026-10-21'), push('2026-10-23')], [plan('2026-10-24', 'Legs'), plan('2026-10-21', 'Push')], TEMPLATES, NOW);
  assert.equal(week.done, 3);
  assert.equal(week.days[0].trained, true);
  assert.equal(week.days[2].planned, undefined); // logged, so not planned any more
  assert.equal(week.days[5].planned, 'Legs');
  assert.equal(week.days[4].today, true);
  assert.equal(week.days[6].future, true);
  assert.equal(week.next?.name, 'Legs');
  assert.equal(week.next?.date, '2026-10-24');
});

test('the muscle grid: dots on trained days, dashed on planned ones, sets and the goal', () => {
  const goals = { muscles: ['chest', 'quads'] as const, timesPerWeek: 2, custom: [] };
  const rows = muscleWeek({ ...goals, muscles: [...goals.muscles] }, [legs('2026-10-19'), push('2026-10-21'), push('2026-10-23')], [plan('2026-10-24', 'Legs')], TEMPLATES, library, NOW);
  const chest = rows.find(r => r.group === 'chest')!;
  assert.deepEqual(chest.cells, ['off', 'off', 'on', 'off', 'on', 'off', 'off']);
  assert.equal(chest.times, 2);
  assert.equal(chest.sets, 8);
  assert.equal(chest.met, true);
  const quads = rows.find(r => r.group === 'quads')!;
  assert.deepEqual(quads.cells, ['on', 'off', 'off', 'off', 'off', 'plan', 'off']);
  assert.equal(quads.met, false);
  assert.equal(quads.timesGoal, 2);
});

test('without goals the grid shows the default muscles with nothing to meet', () => {
  const rows = muscleWeek(undefined, [push('2026-10-21')], [], TEMPLATES, library, NOW);
  assert.equal(rows.length, 9);
  assert.ok(rows.every(r => r.met === undefined && r.timesGoal === undefined));
  assert.equal(rows.find(r => r.group === 'chest')!.sets, 4);
});

test('the food week: a ring a day, the average over logged days, days at goal', () => {
  const entries = [meal('2026-10-19', '08:00', 170), meal('2026-10-20', '08:00', 120), meal('2026-10-23', '08:00', 100), meal('2026-10-23', '12:30', 36)];
  const week = foodWeekOf(entries, GOAL, NOW);
  assert.equal(week.logged, 3);
  assert.equal(week.avg, 142);
  assert.equal(week.hit, 1);
  assert.equal(week.days[0].ratio, 1);
  assert.equal(week.days[0].met, true);
  assert.equal(week.days[1].ratio, 0.75);
  assert.equal(week.days[2].total, undefined);
  assert.equal(week.days[5].future, true);
});

test('the 4-week trend is a direction first', () => {
  const entries = [['2026-09-29', 128], ['2026-10-06', 141], ['2026-10-13', 149], ['2026-10-20', 152]].map(([d, p]) => meal(d as string, '08:00', p as number));
  const t = foodTrend(entries, GOAL, NOW);
  assert.deepEqual(t.weeks, [128, 141, 149, 152]);
  assert.equal(t.from, 128);
  assert.equal(t.to, 152);
  assert.equal(t.line, 'a day · up 3 weeks running');
  assert.equal(foodTrend(entries.slice(2), GOAL, NOW).line, 'a day · up from last week');
  assert.equal(foodTrend([entries[2], meal('2026-10-20', '08:00', 100)], GOAL, NOW).line, 'a day · down from last week');
  assert.equal(foodTrend([], GOAL, NOW).from, undefined);
});

test('today by meal: a bubble per meal, close meals merged, the rest as a dashed bubble', () => {
  const todays = [meal('2026-10-23', '08:10', 34), meal('2026-10-23', '12:40', 58), meal('2026-10-23', '15:30', 40), meal('2026-10-23', '15:50', 4)];
  const bubbles = mealBubbles(todays, GOAL, NOW);
  assert.deepEqual(bubbles.map(b => [b.name, b.grams, b.toGo ?? false]), [['Morning', 34, false], ['Midday', 58, false], ['Afternoon', 44, false], ['Evening', 24, true]]);
  assert.equal(bubbles[0].time, '8:10 am');
  assert.equal(bubbles[3].hour, 19);
  // Goal met: no dashed bubble. No goal: none either
  assert.equal(mealBubbles([meal('2026-10-23', '08:10', 170)], GOAL, NOW).length, 1);
  assert.equal(mealBubbles(todays, undefined, NOW).length, 3);
  // Nothing yet at 4 pm: the next meal is the afternoon one
  assert.equal(mealBubbles([], GOAL, NOW)[0].name, 'Afternoon');
  // Six at most
  const many = Array.from({ length: 9 }, (_, i) => meal('2026-10-23', `${String(7 + i * 1.5 | 0).padStart(2, '0')}:${i % 2 ? '30' : '00'}`, 10));
  assert.ok(mealBubbles(many, undefined, NOW).length <= 6);
});

test('meal bubbles keep their distance and stay inside the axis', () => {
  const xs = layoutMeals([8, 12.5], 321, 72);
  assert.ok(Math.abs(xs[0] - 58.1) < 0.2 && Math.abs(xs[1] - 134.9) < 0.2);
  const tight = layoutMeals([12, 12.2, 12.4, 22], 321, 72);
  assert.ok(tight[1] - tight[0] >= 72 && tight[2] - tight[1] >= 72);
  assert.equal(tight[3], 297);
  const late = layoutMeals([21.5, 21.8], 321, 72);
  assert.equal(late[1], 297);
  assert.equal(late[0], 225);
});

test('next up: start the plan, then the next meal, then plan tomorrow', () => {
  const today = foodByDay([meal('2026-10-23', '12:40', 136)]).get('2026-10-23');
  const planned = { date: '2026-10-23', name: 'Legs', exercises: 6, groups: ['quads' as const], templateId: 'Legs' };
  assert.equal(nextUp({ plannedToday: planned, trainedToday: false, lifts: true, eats: true, bubbles: [], plannedAhead: true }).title, 'Start Legs');
  const bubbles = mealBubbles([meal('2026-10-23', '12:40', 136)], GOAL, NOW);
  const dinner = nextUp({ trainedToday: true, lifts: true, eats: true, goal: GOAL, today, bubbles, usual: { items: 'salmon and rice', around: '7 pm' }, plannedAhead: true });
  assert.equal(dinner.title, 'Log a snack · 24 g to go');
  assert.equal(dinner.sub, 'Usually salmon and rice, around 7 pm');
  assert.equal(dinner.action, 'log');
  assert.equal(nextUp({ trainedToday: true, lifts: true, eats: true, goal: GOAL, today, bubbles: [], plannedAhead: false }).title, 'Plan tomorrow');
  assert.equal(nextUp({ trainedToday: true, lifts: true, eats: true, goal: GOAL, today: { ...today!, protein: 170 }, bubbles: [], plannedAhead: true }).title, 'Protein goal met');
  assert.equal(nextUp({ trainedToday: false, lifts: true, eats: true, bubbles: [], plannedAhead: true }).title, 'Log what you did');
});

test('next up: food-only users log the next meal, never plan tomorrow', () => {
  const lunch = [meal('2026-10-23', '12:40', 40)];
  const bubbles = mealBubbles(lunch, undefined, NOW);
  const slot = nextMeal(bubbles, NOW)?.[0];
  const up = nextUp({ trainedToday: false, lifts: false, eats: true, slot, today: foodByDay(lunch).get('2026-10-23'), bubbles, usual: { items: 'salmon and rice', around: '7 pm' }, plannedAhead: false });
  assert.deepEqual(up, { title: 'Log a snack', sub: 'Usually salmon and rice, around 7 pm', action: 'log', meal: 'a snack' });
  const late = nextUp({ trainedToday: false, lifts: false, eats: true, slot: nextMeal([...bubbles, { ...bubbles[0], hour: 20 }], NOW)?.[0], bubbles, plannedAhead: false });
  assert.notEqual(late.action, 'plan');
  assert.equal(nextUp({ trainedToday: false, lifts: false, eats: true, slot: 'Evening', goal: { kind: 'cut' as const, target: 2000 }, bubbles: [], plannedAhead: false }).title, 'Log dinner');
});

test('next up: train-only users plan tomorrow, never log a meal', () => {
  const up = nextUp({ trainedToday: true, lifts: true, eats: false, slot: 'Afternoon', bubbles: [], plannedAhead: false });
  assert.equal(up.title, 'Plan tomorrow');
  assert.equal(up.action, 'plan');
  assert.equal(nextUp({ trainedToday: true, lifts: true, eats: false, slot: 'Afternoon', bubbles: [], plannedAhead: true }).action, undefined);
});

test('next up: those who do both start the plan, then log the next meal, then plan tomorrow', () => {
  const planned = { date: '2026-10-23', name: 'Legs', exercises: 6, groups: ['quads' as const], templateId: 'Legs' };
  const both = { lifts: true, eats: true, bubbles: [], plannedAhead: false };
  assert.equal(nextUp({ ...both, plannedToday: planned, trainedToday: false, slot: 'Evening' }).action, 'start');
  assert.equal(nextUp({ ...both, plannedToday: planned, trainedToday: true, slot: 'Evening' }).title, 'Log dinner');
  assert.equal(nextUp({ ...both, plannedToday: planned, trainedToday: true }).title, 'Plan tomorrow');
});

test('a goal row: each day met, partly or missed, today as a value, and whether the log knows the number', () => {
  const fiberMeal = (date: string, fiber: number): FoodEntry => ({ ...meal(date, '12:00', 100), items: [{ id: 'i', name: 'Food', macros: { kcal: 400, protein: 100, carbs: 50, fat: 10, fiber }, source: 'usda' }] });
  const totals = foodByDay([meal('2026-10-19', '08:00', 170), meal('2026-10-20', '08:00', 90), meal('2026-10-21', '08:00', 40), meal('2026-10-23', '12:00', 136)]);
  const protein = goalWeek(GOAL, totals, NOW);
  assert.deepEqual(protein.cells, ['met', 'partly', 'missed', 'none', 'partly', 'future', 'future']);
  assert.equal(protein.hit, 1);
  assert.equal(protein.logged, 4);
  assert.equal(protein.today, 136);
  assert.equal(foodLogKnows(GOAL, totals), true);
  assert.equal(foodLogKnows(GOAL, new Map()), true);
  assert.equal(foodLogKnows({ kind: 'cut', target: 2000 }, new Map()), true);
  // A cut: at or under is met, just over is partly
  const cut = goalWeek({ kind: 'cut', target: 1000 }, totals, NOW);
  assert.deepEqual(cut.cells.slice(0, 3), ['missed', 'met', 'met']);
  // Fiber: unknown until the food carries fiber numbers
  const fiber = goalWeek({ kind: 'fiber', target: 30 }, totals, NOW);
  assert.equal(foodLogKnows({ kind: 'fiber', target: 30 }, totals), false);
  assert.deepEqual(fiber.cells.slice(0, 2), ['none', 'none']);
  const withFiber = goalWeek({ kind: 'fiber', target: 30 }, foodByDay([fiberMeal('2026-10-22', 18), fiberMeal('2026-10-23', 32)]), NOW);
  // Known from any day in the log, so a fiber row stays on a Monday before this week has fiber
  assert.equal(foodLogKnows({ kind: 'fiber', target: 30 }, foodByDay([fiberMeal('2026-10-12', 18), meal('2026-10-19', '08:00', 40)])), true);
  assert.deepEqual(withFiber.cells.slice(3, 5), ['partly', 'met']);
  assert.equal(withFiber.today, 32);
});

test('low-GI meals count only once the food log carries GI numbers', () => {
  const gi = (date: string, time: string, g: number): FoodEntry => ({ ...meal(date, time, 20), items: [{ id: 'a', name: 'A', macros: { kcal: 300, protein: 20, carbs: 40, fat: 5 }, gi: g, source: 'estimate' }, { id: 'b', name: 'B', macros: { kcal: 100, protein: 5, carbs: 10, fat: 1 }, gi: 70, source: 'estimate' }] });
  const day = foodByDay([gi('2026-10-23', '08:00', 40), gi('2026-10-23', '13:00', 65), meal('2026-10-23', '19:00', 30)]).get('2026-10-23')!;
  assert.equal(day.lowGiMeals, 1); // 40×40+70×10 over 50 carbs = 46; 65×40+70×10 = 66; the plain meal has no GI
  assert.equal(day.meals, 3);
  assert.equal(foodByDay([meal('2026-10-23', '08:00', 30)]).get('2026-10-23')!.lowGiMeals, undefined);
  assert.equal(goalWeek({ kind: 'lowgi', target: 2 }, foodByDay([gi('2026-10-23', '08:00', 40), gi('2026-10-23', '13:00', 50)]), NOW).today, 2);
});
