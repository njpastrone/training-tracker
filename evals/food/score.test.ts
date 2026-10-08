import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreFoodCase, within } from './score.ts';
import type { FoodCase } from './cases.ts';

const meal: FoodCase = {
  id: 't', category: 'simple', input: '2 eggs and a banana',
  ref: { kcal: 260, protein: 13.9, carbs: 28, fat: 10.5 },
  items: [
    { name: 'Egg', kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, source: 'x' },
    { name: 'Banana', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, source: 'x' },
  ],
};
const items = (...m: [number, number, number, number][]) => ({ items: m.map(([kcal, protein, carbs, fat]) => ({ name: 'x', source: 'usda', macros: { kcal, protein, carbs, fat } })) });

test('within takes 20% or the floor, whichever is looser', () => {
  assert.ok(within('kcal', 312, 260));
  assert.ok(!within('kcal', 313, 260));
  assert.ok(within('fat', 3.4, 0.5)); // 3 g floor
  assert.ok(!within('protein', 30, 20));
});

test('meal totals are scored, not items', () => {
  const s = scoreFoodCase(meal, items([150, 12, 1, 10], [110, 1.5, 28, 0.3]));
  assert.equal(s.all, true);
  assert.deepEqual(s.got, { kcal: 260, protein: 13.5, carbs: 29, fat: 10.3 });
  const low = scoreFoodCase(meal, items([150, 12, 1, 10]));
  assert.equal(low.hits.kcal, false);
  assert.equal(low.hits.protein, true);
  assert.equal(low.itemsDiff, -1);
});

test('a failed parse misses everything; not-food passes only when empty', () => {
  assert.equal(scoreFoodCase(meal, null).all, false);
  const none: FoodCase = { ...meal, category: 'not_food', ref: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, items: [] };
  assert.equal(scoreFoodCase(none, { items: [] }).all, true);
  const s = scoreFoodCase(none, items([100, 1, 1, 1]));
  assert.equal(s.all, false);
  assert.match(s.misses[0], /not food/);
});
