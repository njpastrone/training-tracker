/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, MORE_FOODS, foodById } from '../data/foods';
import { cases as workoutCases } from '../evals/parse/cases';
import {
  buildFoodCandidates, candidateNames, itemFor, localFoodParse, macroLine, matchFood, mentionsFood, mentionsWorkout,
  resolveItems, setQty, setUnit, splitLog, sumMacros, usualPortions, alternatives, swapFood, unitChoices, nextUnit, mealsOf,
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
  const log = 'chicken rice beans cheese milk bread oil yogurt';
  for (const name of candidateNames(log, buildFoodCandidates(log))) assert.ok(name.length <= 80 && !/[<>\n]/.test(name), name);
  assert.deepEqual(ids('bench 3x5 at 225'), []);
});

test('the long tail only comes in for words the core table lacks; plain defaults are labelled', () => {
  assert.ok(ids('pork tenderloin 6 oz').every(id => !id.startsWith('usda-')));
  assert.ok(ids('elk steak').some(id => id.startsWith('usda-')));
  const log = '250g greek yogurt and some milk';
  const names = candidateNames(log, buildFoodCandidates(log));
  assert.ok(names.includes('Greek yogurt, nonfat, plain (usual for "greek yogurt")'), names.join(' | '));
  assert.ok(names.includes('Milk, 2% (usual for "milk")'), names.join(' | '));
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

test('counts are never remembered: "banana" is one banana after "3 bananas"', () => {
  const banana = food('banana');
  const usual = usualPortions([
    { id: 'a', date: '2026-10-05', rawInput: '', createdAt: '2026-10-05T12:00:00Z', items: [{ id: '1', name: 'Banana', foodId: 'banana', qty: 3, macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'usda' }] },
  ]);
  assert.equal(usual.has('banana'), false);
  assert.equal(localFoodParse('banana', usual).items[0].grams, itemFor(banana).grams);
  assert.equal(resolveItems([{ said: 'banana', food: 0 }], [banana], usual)[0].grams, itemFor(banana).grams);
});

test('localFoodParse reads amount + food per part, without AI', () => {
  const { items } = localFoodParse('2 eggs and a banana, 200g chicken breast with 1 cup of rice');
  assert.deepEqual(items.map(i => [i.foodId, i.qty, i.unit]), [['egg', 2, undefined], ['banana', 1, undefined], ['chicken-breast', 200, 'g'], ['rice', 1, 'cup']]);
  assert.deepEqual(localFoodParse('uh so I had eggs and toast').items.map(i => [i.foodId, i.qty]), [['egg', 2], ['toast', undefined]]);
  assert.equal(localFoodParse('100g dry rice').items[0].foodId, 'rice-dry');
  const unknown = localFoodParse('a bowl of pho').items[0];
  assert.equal(unknown.source, 'estimate');
});

test('a food word inside an exercise name is not food', () => {
  for (const log of ['glute ham raises 3x10', 'foam roll 10 min', 'american swings 3x15', 'pickle ball for an hour']) {
    assert.equal(mentionsFood(log), false, log);
  }
  assert.deepEqual(splitLog('glute ham raises 3x10, then squats 3x5'), { workout: 'glute ham raises 3x10\nsquats 3x5', food: '' });
  assert.deepEqual(splitLog('foam roll, american swings 3x15, pickle ball'), { workout: 'foam roll\namerican swings 3x15\npickle ball', food: '' });
  assert.equal(mentionsFood('foam roll, then a ham sandwich'), true);
});

test('splitLog sends each part of a mixed message to its side', () => {
  assert.deepEqual(splitLog('squat 3x5 at 225, then 2 eggs and toast'), { workout: 'squat 3x5 at 225', food: '2 eggs and toast' });
  assert.deepEqual(splitLog('bench 3x8, rows'), { workout: 'bench 3x8\nrows', food: '' });
});

test('strips of bacon are weighed as USDA slices, not the model\'s grams', () => {
  const bacon = itemFor(food('bacon'), 3, 'strip', '3 strips of bacon', 60);
  assert.equal(bacon.grams, 3 * food('bacon').units.slice!);
  assert.equal(setQty(bacon, 4).grams, 4 * food('bacon').units.slice!);
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

test('alternatives and swapFood: one tap from cooked to dry, keeping the amount', () => {
  const cup = itemFor(food('rice'), 1, 'cup', '1 cup rice');
  const alts = alternatives(cup).map(f => f.id);
  assert.ok(alts.includes('rice-dry'), alts.join());
  assert.ok(!alts.includes('rice'));
  const dry = swapFood(cup, food('rice-dry'));
  assert.deepEqual([dry.foodId, dry.qty, dry.unit], ['rice-dry', 1, 'cup']);
  assert.ok(dry.macros.kcal > 2 * cup.macros.kcal);
  // A unit the new food has no weight for becomes grams
  const breast = itemFor(food('chicken-breast'), 1, 'breast');
  const tofu = swapFood(breast, food('tofu-firm'));
  assert.ok(tofu.unit === 'breast' ? !!tofu.grams : tofu.unit === 'g' && tofu.qty === breast.grams);
});

test('unitChoices: a short list in a fixed order; nextUnit steps through all of it', () => {
  assert.deepEqual(unitChoices(food('egg')), ['each', 'g', 'oz']);
  assert.deepEqual(unitChoices(food('rice')), ['cup', 'g', 'oz']);
  assert.deepEqual(unitChoices(food('chicken-breast')), ['breast', 'each', 'g', 'oz']);
  assert.deepEqual(unitChoices(food('milk-2')), ['cup', 'fl_oz', 'ml']);
  const seen = [food('chicken-breast').serving.unit];
  for (let i = 0; i < 4; i++) seen.push(nextUnit(food('chicken-breast'), seen[seen.length - 1]));
  assert.deepEqual(seen, ['breast', 'each', 'g', 'oz', 'breast']);
});

test('a misread amount shows in grams, so amount, weight and numbers agree', () => {
  const [misread] = resolveItems([{ said: '200 chicken', food: 0, qty: 200, grams: 200 }], [food('chicken-breast')]);
  assert.deepEqual([misread.qty, misread.unit, misread.grams], [200, 'g', 200]);
  const [wedge] = resolveItems([{ said: 'a wedge of rice', food: 0, qty: 1, unit: 'wedge', grams: 40 }], [food('rice')]);
  assert.deepEqual([wedge.qty, wedge.unit, wedge.grams], [40, 'g', 40]);
  // A real count wins over a wrong model weight; a bowl goes by the model's weight
  const [almonds] = resolveItems([{ said: '20 almonds', food: 0, qty: 20, grams: 114 }], [food('almonds')]);
  assert.equal(almonds.grams, Math.round(20 * food('almonds').units.each!));
  const [bowl] = resolveItems([{ said: 'a bowl of oatmeal', food: 0, qty: 1, unit: 'bowl', grams: 240 }], [food('oatmeal')]);
  assert.deepEqual([bowl.qty, bowl.unit, bowl.grams], [1, 'bowl', 240]);
});

test('typing an estimate amount digit by digit keeps its numbers', () => {
  const est = { name: 'Burrito', qty: 30, unit: 'g' as const, macros: { kcal: 130, protein: 6, carbs: 15, fat: 0.4 }, source: 'estimate' as const };
  const typed = setQty(setQty(setQty(est, 2), 25), 250);
  assert.ok(Math.abs(typed.macros.kcal - 1083.3) < 0.1 && Math.abs(typed.macros.fat - 3.33) < 0.01);
});

test('an inexact amount takes the model\'s weight; an exact one is converted', () => {
  // "Some": the model's weight, shown in grams; a plain name: the standard serving
  const [some] = resolveItems([{ said: 'some blueberries', food: 0, grams: 50 }], [food('blueberries')]);
  assert.deepEqual([some.qty, some.unit, some.grams], [50, 'g', 50]);
  const [plain] = resolveItems([{ said: 'toast', food: 0, grams: 50 }], [food('toast')]);
  assert.deepEqual([plain.qty, plain.unit, plain.grams], [undefined, undefined, Math.round(food('toast').units.slice!)]);
  const [small] = resolveItems([{ said: 'small apple', food: 0, qty: 1, grams: 150 }], [food('apple')]);
  assert.deepEqual([small.unit, small.grams], ['small', food('apple').units.small]);
  const [piece] = resolveItems([{ said: 'a piece of salmon', food: 0, grams: 170 }], [food('salmon')]);
  assert.deepEqual([piece.qty, piece.unit, piece.grams], [170, 'g', 170]);
  // A size USDA doesn't weigh for this food keeps its words but the model's weight, and edits scale it
  const f = food('rice');
  const [big] = resolveItems([{ said: 'a medium rice', food: 0, qty: 1, unit: 'medium', grams: 200 }], [f]);
  assert.deepEqual([big.qty, big.unit, big.grams], [1, 'medium', 200]);
  assert.equal(setQty(big, 2).grams, 400);
  // Exact amounts never take the model's weight
  const [cup] = resolveItems([{ said: '1 cup rice', food: 0, qty: 1, unit: 'cup', grams: 300 }], [f]);
  assert.equal(cup.grams, Math.round(f.units.cup!));
});

test('emoji and other languages find the right table foods', () => {
  assert.ok(ids('🍳🍳 + 🥑 toast').includes('egg'));
  assert.ok(ids('desayuné dos huevos y arroz con pollo').includes('chicken-breast'));
  assert.equal(mentionsFood('🍌 and ☕️ black'), true);
  assert.equal(mentionsFood('comí arroz con frijoles'), true);
  assert.equal(matchFood('huevos')?.id, 'egg');
});

test('a day\'s food reads as meals: one per logged message, oldest first, named by the time it was logged', () => {
  const entry = (id: string, at: string, protein: number) => ({
    id, date: '2026-10-09', rawInput: '', createdAt: at,
    items: [{ id: 'i', name: 'Food', source: 'estimate' as const, macros: { kcal: protein * 10, protein, carbs: 1, fat: 1 } }],
  });
  const meals = mealsOf([entry('c', '2026-10-09T19:30:00', 40), entry('a', '2026-10-09T08:10:00', 26), entry('b', '2026-10-09T13:05:00', 62)]);
  assert.deepEqual(meals.map(m => [m.entry.id, m.name, m.time, m.macros.protein]), [
    ['a', 'Morning', '8:10 am', 26], ['b', 'Midday', '1:05 pm', 62], ['c', 'Evening', '7:30 pm', 40],
  ]);
  assert.equal(mealsOf([entry('d', '2026-10-09T16:00:00', 1)])[0].name, 'Afternoon');
});
