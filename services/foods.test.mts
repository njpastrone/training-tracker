/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, MORE_FOODS, foodById } from '../data/foods';
import { cases as workoutCases } from '../evals/parse/cases';
import {
  buildFoodCandidates, candidateName, itemFor, localFoodParse, macroLine, matchFood, mentionsFood, mentionsWorkout,
  resolveItems, setQty, setUnit, splitLog, sumMacros, usualPortions,
} from './foods';

const food = (id: string) => {
  const f = foodById.get(id);
  assert.ok(f, `no food ${id}`);
  return f!;
};
const ids = (log: string) => buildFoodCandidates(log).map(f => f.id);

test('candidates: the foods a log names, their variants, within the cap and the prompt rules', () => {
  const c = ids('2 eggs and toast with butter');
  for (const id of ['egg', 'toast', 'butter']) assert.ok(c.includes(id), id);
  assert.ok(c.length <= 50);
  assert.ok(ids('200g chicken').includes('chicken-breast-raw'), 'raw and cooked variants both listed');
  assert.ok(ids('had a bannana and some brocoli').includes('banana'), 'typos');
  for (const f of buildFoodCandidates('chicken rice beans cheese milk bread oil yogurt')) assert.ok(candidateName(f).length <= 80 && !/[<>\n]/.test(candidateName(f)));
  assert.deepEqual(ids('bench 3x5 at 225'), []);
});

test('router: food words send a log to the food parser, workout words to the workout parser', () => {
  for (const log of ['2 eggs and toast', 'chicken and rice', 'had a Big Mac and fries', '200g chicken breast', 'a cup of greek yogurt', 'protein shake after', 'just did legs then ate 2 eggs']) {
    assert.equal(mentionsFood(log), true, log);
  }
  for (const log of ['bench 3x5 225', 'legs: squats, RDLs, lunges', 'ran 3 miles', 'did legs', 'played squash for an hour', 'dips and planks', 'chest and back today: bench, rows, pull-ups', 'leg day, 4 plates on leg press']) {
    assert.equal(mentionsFood(log), false, log);
  }
  for (const log of ['squat 3x5 at 225', 'ran 3 miles', 'did legs', 'chest day']) assert.equal(mentionsWorkout(log), true, log);
  for (const log of ['2 eggs and toast', 'chicken, rice and broccoli', 'a cup of greek yogurt with honey', 'Big Mac and medium fries']) assert.equal(mentionsWorkout(log), false, log);
});

test('router: workout-only logs from the parse eval almost never call the food parser', () => {
  const foodish = workoutCases.filter(c => c.category !== 'with_food' && mentionsFood(c.input)).map(c => c.id);
  // These mention food or eating on purpose; the food parser returns nothing for them
  assert.deepEqual(foodish.filter(id => !['none-food', 'none-question'].includes(id)), []);
  for (const c of workoutCases.filter(c => c.category === 'with_food')) assert.equal(mentionsFood(c.input) && mentionsWorkout(c.input), true, c.id);
});

test('matchFood keeps raw, dry, whole and lean words', () => {
  assert.equal(matchFood('chicken')?.id, 'chicken-breast');
  assert.equal(matchFood('raw chicken breast')?.id, 'chicken-breast-raw');
  assert.equal(matchFood('dry rice')?.id, 'rice-dry');
  assert.equal(matchFood('rice')?.id, 'rice');
  assert.match(matchFood('whole milk')!.name, /whole/i);
  assert.match(matchFood('ground beef 93%')!.name, /93/);
  assert.equal(matchFood('brocoli')?.id, 'broccoli');
  assert.equal(matchFood('xyzzy'), undefined);
});

test('resolveItems: picks get USDA math, estimates pass through, odd units fall back to grams', () => {
  const egg = food('egg');
  const rice = food('rice');
  const [eggs, cup, splash, guess, est, unknown] = resolveItems([
    { said: '2 eggs', food: 0, qty: 2, grams: 100 },
    { said: '1.5 cups of rice', food: 1, qty: 1.5, unit: 'cups', grams: 240 },
    { said: 'a smidge of rice', food: 1, qty: 1, unit: 'smidge', grams: 20 },
    { said: '200 rice', food: 1, qty: 200, grams: 200 }, // a count 4× off the model's own weight is a misread amount
    { said: 'a Big Mac', name: 'Big Mac', qty: 1, grams: 219, dayOffset: -1, estimate: { kcal: 580, protein: 25, carbs: 45, fat: 34 } },
    { said: 'mystery stew', name: 'Mystery stew' },
  ], [egg, rice]);
  assert.equal(eggs.source, 'usda');
  assert.equal(eggs.grams, 2 * egg.units.each!);
  assert.equal(eggs.macros.kcal, Math.round((egg.per100g.kcal * eggs.grams!) / 100));
  assert.equal(cup.grams, Math.round(1.5 * rice.units.cup!));
  assert.deepEqual([splash.qty, splash.unit, splash.grams], [20, 'g', 20]);
  assert.equal(guess.grams, 200);
  assert.deepEqual([est.source, est.macros.kcal, est.dayOffset], ['estimate', 580, -1]);
  assert.equal(unknown.source, 'estimate');
  assert.equal(unknown.macros.kcal, 0);
});

test('a name alone means your usual portion of it', () => {
  const rice = food('rice');
  const usual = usualPortions([
    { id: 'a', date: '2026-10-05', rawInput: '', createdAt: '2026-10-05T12:00:00Z', items: [{ id: '1', name: 'Rice', foodId: 'rice', qty: 2, unit: 'cup', macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'usda' }] },
    { id: 'b', date: '2026-10-01', rawInput: '', createdAt: '2026-10-01T12:00:00Z', items: [{ id: '1', name: 'Rice', foodId: 'rice', qty: 1, unit: 'cup', macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'usda' }] },
  ]);
  assert.deepEqual(usual.get('rice'), { qty: 2, unit: 'cup' });
  assert.equal(resolveItems([{ said: 'rice', food: 0 }], [rice], usual)[0].grams, Math.round(2 * rice.units.cup!));
  assert.equal(resolveItems([{ said: '1 cup rice', food: 0, qty: 1, unit: 'cup' }], [rice], usual)[0].grams, Math.round(rice.units.cup!));
  assert.equal(localFoodParse('rice', usual).items[0].qty, 2);
});

test('localFoodParse reads amount + food per part, without AI', () => {
  const { items } = localFoodParse('2 eggs and a banana, 200g chicken breast with 1 cup of rice');
  assert.deepEqual(items.map(i => [i.foodId, i.qty, i.unit]), [['egg', 2, undefined], ['banana', 1, undefined], ['chicken-breast', 200, 'g'], ['rice', 1, 'cup']]);
  assert.deepEqual(localFoodParse('uh so I had eggs and toast').items.map(i => [i.foodId, i.qty]), [['egg', 2], ['toast', undefined]]);
  assert.equal(localFoodParse('100g dry rice').items[0].foodId, 'rice-dry');
  const unknown = localFoodParse('a bowl of pho').items[0];
  assert.equal(unknown.source, 'estimate');
});

test('splitLog sends each part of a mixed message to its side', () => {
  assert.deepEqual(splitLog('squat 3x5 at 225, then 2 eggs and toast'), { workout: 'squat 3x5 at 225', food: '2 eggs and toast' });
  assert.deepEqual(splitLog('bench 3x8, rows'), { workout: 'bench 3x8\nrows', food: '' });
});

test('setQty and setUnit: table foods recompute, estimates scale, the weight survives a unit switch', () => {
  const two = itemFor(food('egg'), 2);
  const three = setQty(two, 3);
  assert.equal(three.grams, 3 * food('egg').units.each!);
  assert.equal(three.macros.kcal, Math.round((food('egg').per100g.kcal * three.grams!) / 100));
  const grams = setUnit(two, 'g');
  assert.equal(grams.unit, 'g');
  assert.ok(Math.abs(grams.grams! - two.grams!) <= 5);
  const big = { name: 'Big Mac', qty: 1, grams: 219, macros: { kcal: 580, protein: 25, carbs: 45, fat: 34 }, source: 'estimate' as const };
  assert.deepEqual(setQty(big, 2).macros, { kcal: 1160, protein: 50, carbs: 90, fat: 68 });
  assert.equal(setUnit(big, 'g'), big);
});

test('totals: protein first', () => {
  const t = sumMacros([itemFor(food('egg'), 2), itemFor(food('rice'), 1, 'cup')]);
  assert.equal(macroLine({ kcal: 1850.4, protein: 104.4, carbs: 0, fat: 0 }), '104 g protein · 1,850 kcal');
  assert.ok(t.protein > 10 && t.kcal > 300);
});

test('the long tail never shadows the core table', () => {
  const core = new Set(FOODS.map(f => f.id));
  assert.ok(MORE_FOODS.every(f => !core.has(f.id)));
  assert.equal(matchFood('banana')?.id, 'banana');
});
