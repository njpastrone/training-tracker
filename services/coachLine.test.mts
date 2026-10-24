/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodLine, gapMuscle, todayLine, trainingLine } from './coachLine';
import type { MuscleWeekRow, PlannedDay } from './week';
import type { FoodEntry } from '../types/food';

const NOW = new Date(2026, 9, 23, 16); // Fri
const TODAY = '2026-10-23';
const row = (group: MuscleWeekRow['group'], met?: boolean): MuscleWeekRow => ({ group, cells: [], times: 0, sets: 0, setsMissing: false, timesGoal: met === undefined ? undefined : 2, met });
const LEGS: PlannedDay = { date: '2026-10-25', name: 'Legs', exercises: 6, groups: ['quads', 'hamstrings'], templateId: 'Legs' };
const meal = (date: string, time: string, protein: number): FoodEntry => ({
  id: `${date}T${time}`,
  date,
  items: [{ id: 'i', name: 'Food', macros: { kcal: 0, protein, carbs: 0, fat: 0 }, source: 'estimate' }],
  rawInput: '',
  createdAt: `${date}T${time}:00`,
});
const GOAL = { kind: 'protein' as const, target: 160 };
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, '0')}`);

test('training: the gap muscle, and the planned day that closes it', () => {
  const rows = [row('chest', true), row('quads', false), row('back', false)];
  const gap = gapMuscle(rows, { quads: 4, back: 2 });
  assert.equal(gap?.group, 'quads');
  assert.deepEqual(trainingLine(rows, [LEGS], { quads: 4, back: 2 }, null, TODAY), { lead: 'Quads are the gap.', rest: "Sunday's Legs closes it." });
  assert.deepEqual(trainingLine(rows, [], { quads: 4, back: 2 }, null, TODAY), { lead: 'Quads are the gap.', rest: 'Nothing planned covers it yet.' });
  assert.deepEqual(trainingLine([row('back', false)], [{ ...LEGS, date: '2026-10-24', groups: ['back'] }], {}, null, TODAY), { lead: 'Back is the gap.', rest: "Tomorrow's Legs closes it." });
});

test('training: every goal met, or the check-in without goals', () => {
  assert.equal(trainingLine([row('chest', true)], [], {}, null, TODAY)?.lead, 'Every goal muscle covered this week.');
  const check = { headline: 'New best: Bench Press 185 lb × 5', days: '3 training days in the last 7', wins: [], next: [] };
  assert.deepEqual(trainingLine([row('chest')], [], {}, check, TODAY), { lead: 'New best: Bench Press 185 lb × 5.', rest: '3 training days in the last 7' });
  assert.equal(trainingLine([row('chest')], [], {}, null, TODAY), undefined);
});

test('food: weekends, a light meal, or how the average stands', () => {
  // Weekdays 160 g, weekends 110 g over the last 4 weeks (Sep 28 – Oct 23)
  const dates = [...['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], ...days(5, 23)];
  const weekend = (d: string) => [0, 6].includes(new Date(d + 'T12:00:00').getDay());
  const entries = dates.map(d => meal(d, '12:00', weekend(d) ? 110 : 160));
  assert.deepEqual(foodLine(entries, GOAL, NOW), { lead: 'Weekends are where you miss.', rest: 'Sat and Sun average 110 g, weekdays 160.' });
  // Light mornings: 15 g at 8, 70 g at 7 pm every day
  const light = days(10, 23).flatMap(d => [meal(d, '08:00', 15), meal(d, '19:00', 70)]);
  assert.deepEqual(foodLine(light, GOAL, NOW), { lead: 'Mornings are light.', rest: '15 g on average, evening 70.' });
  // Even days: the average against the goal
  const even = days(10, 23).map(d => meal(d, '12:00', 150));
  assert.deepEqual(foodLine(even, GOAL, NOW), { lead: '10 g a day short on average.', rest: 'At goal on 0 of 14 days with food.' });
  assert.equal(foodLine(days(10, 23).map(d => meal(d, '12:00', 165)), GOAL, NOW)?.lead, 'On track.');
  assert.equal(foodLine(even.slice(0, 2), GOAL, NOW), undefined);
  assert.equal(foodLine(even, undefined, NOW), undefined);
});

test('today: what is left, and the muscle a planned day fixes', () => {
  assert.deepEqual(todayLine({ left: 24, nextMeal: 'Dinner', gap: { group: 'quads', daysSince: 4, plan: { ...LEGS, date: '2026-10-24' } }, today: TODAY }), {
    lead: 'Dinner covers the 24 g.',
    rest: "Quads 4 days out, tomorrow's Legs fixes that.",
  });
  assert.deepEqual(todayLine({ left: 0, today: TODAY }), { lead: 'Protein goal met.', rest: '' });
  assert.deepEqual(todayLine({ gap: { group: 'back' }, today: TODAY }), { lead: 'Back not trained yet.', rest: '' });
  assert.equal(todayLine({ today: TODAY }), undefined);
});
