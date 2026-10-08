/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, MORE_FOODS, foodById } from './foods';
import { normalizeWords, singularWords } from './catalog';
import type { Food } from '../types/food';

const ALL = [...FOODS, ...MORE_FOODS];
const MASS = new Set(['g', 'kg', 'oz', 'lb']);
const VOLUME = new Set(['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon']);
const hasVolume = (f: Food) => ['cup', 'tbsp', 'tsp', 'fl_oz', 'ml'].some((u) => f.units[u as keyof Food['units']] != null);

test('ids are unique and kebab-case; the long tail is usda-<fdc> and never reuses a core id', () => {
  const ids = ALL.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
  for (const f of MORE_FOODS) assert.equal(f.id, `usda-${f.fdc}`);
  for (const f of FOODS) assert.ok(!f.id.startsWith('usda-'), f.id);
  assert.equal(foodById.size, ALL.length);
});

test('aliases are normalized and unambiguous', () => {
  // The matcher compares singularized words (services/foods.ts), so collisions are checked the same way
  const owners = new Map<string, string>();
  for (const f of FOODS) {
    for (const a of f.aliases) assert.equal(normalizeWords(a), a, `${f.id}: alias "${a}" isn't normalized`);
    for (const w of new Set([f.name, ...f.aliases].map(singularWords))) {
      const other = owners.get(w);
      assert.ok(!other, `"${w}" names both ${other} and ${f.id}`);
      owners.set(w, f.id);
    }
  }
  for (const f of MORE_FOODS) {
    assert.deepEqual(f.aliases, []);
    const other = owners.get(singularWords(f.name));
    assert.ok(!other, `long-tail ${f.id} "${f.name}" repeats ${other}'s name or alias`);
    owners.set(singularWords(f.name), f.id);
  }
});

test('macros are plausible', () => {
  for (const f of ALL) {
    const m = f.per100g;
    for (const v of [m.kcal, m.protein, m.carbs, m.fat, m.fiber]) assert.ok(Number.isFinite(v) && v >= 0, `${f.id}: ${JSON.stringify(m)}`);
    assert.ok(m.protein + m.carbs + m.fat <= 100.5, `${f.id}: more than 100 g of macros per 100 g`);
  }
});

test('core kcal match 4·protein + 4·carbs + 9·fat', () => {
  // USDA's kcal use food-specific Atwater factors (fat can be 8.4, protein 3.5-4.3, fiber ~2 or 0),
  // so allow 15%, or 10 kcal for very-low-calorie foods where 15% is noise, against carbs with or
  // without fiber (lemon, corn and sun-dried tomatoes only fit with fiber left out).
  // Exempt: alcohol (7 kcal/g, in none of P/C/F); vinegar (acetic acid); cocoa powder (USDA's
  // cocoa factors are ~1.8 kcal/g protein and ~1.3 carbs); dried seaweed (FNDDS, same factor story).
  const alcohol = /\b(beer|wine|liquor|vodka|whiskey|rum|gin|tequila|spirits|champagne|hard seltzer|cider|sake|alcoholic)\b/;
  const exempt = /vinegar|cocoa powder|seaweed/i;
  for (const f of FOODS) {
    if (exempt.test(f.name) || [f.name, ...f.aliases].some((w) => alcohol.test(w.toLowerCase()))) continue;
    const m = f.per100g;
    const gross = 4 * m.protein + 4 * m.carbs + 9 * m.fat;
    const net = gross - 4 * m.fiber;
    const tol = Math.max(10, 0.15 * m.kcal);
    assert.ok(Math.abs(gross - m.kcal) <= tol || Math.abs(net - m.kcal) <= tol, `${f.id}: ${m.kcal} kcal vs ${gross.toFixed(0)} from macros`);
  }
});

test('every unit weighs something and every serving converts', () => {
  for (const f of ALL) {
    for (const [u, g] of Object.entries(f.units)) assert.ok(g! > 0, `${f.id}: ${u} = ${g}`);
    const u = f.serving.unit;
    assert.ok(f.serving.qty > 0, f.id);
    assert.ok(MASS.has(u) || f.units[u as keyof Food['units']] != null || (VOLUME.has(u) && hasVolume(f)), `${f.id}: serving unit ${u} has no weight`);
  }
});

test('core foods have a non-mass unit; long-tail foods have one or a gram serving', () => {
  for (const f of FOODS) assert.ok(Object.keys(f.units).length > 0, `${f.id} has no units`);
  for (const f of MORE_FOODS) assert.ok(Object.keys(f.units).length > 0 || MASS.has(f.serving.unit), f.id);
});

test('cooked/raw/dry is set where it changes the numbers', () => {
  // Grains and legumes that are cooked or eaten dry; ready-to-eat things made from them (cereal, bread,
  // crackers, rice cakes, flour) don't change with cooking
  const needsState = /\b(rice|pasta|spaghetti|macaroni|noodles?|quinoa|couscous|barley|bulgur|farro|millet|oats?|oatmeal|beans?|lentils?|chickpeas|split peas)\b/i;
  const readyToEat = /\b(cereal|bread|crackers?|cakes?|crisps?|puffed|flour|bran|bars?|milk|chips)\b/i;
  for (const f of FOODS) {
    const grain = (f.category === 'grains' || f.category === 'legumes') && needsState.test(f.name) && !readyToEat.test(f.name);
    if (f.category === 'meat_fish' || grain) assert.ok(f.state, `${f.id} needs a state`);
  }
});

test('spot checks against known USDA values', () => {
  const near = (actual: number | undefined, expected: number, tol: number, what: string) =>
    assert.ok(actual != null && Math.abs(actual - expected) <= tol, `${what}: ${actual}, expected ~${expected}`);
  const get = (id: string) => { const f = foodById.get(id); assert.ok(f, `missing ${id}`); return f!; };
  near(get('rice').per100g.kcal, 130, 5, 'cooked white rice kcal/100 g');
  near(get('rice').units.cup, 158, 10, 'cup of cooked white rice');
  assert.equal(get('rice').state, 'cooked');
  near(get('egg').units.large, 50, 2, 'large egg');
  near(get('egg').units.each, 50, 2, 'an egg');
  near(get('banana').units.medium, 118, 5, 'medium banana');
  near(get('chicken-breast').per100g.protein, 31, 1.5, 'cooked chicken breast protein/100 g');
  assert.equal(get('chicken-breast').state, 'cooked');
  near(get('oats').per100g.kcal, 380, 25, 'dry rolled oats kcal/100 g');
  assert.equal(get('oats').state, 'dry');
  near(get('olive-oil').units.tbsp, 13.5, 0.5, 'tbsp of olive oil');
  // Plain words land on the cooked/common default
  const byWord = new Map(FOODS.flatMap((f) => [f.name, ...f.aliases].map((w) => [singularWords(w), f.id] as const)));
  const defaults = [['chicken', 'chicken-breast'], ['rice', 'rice'], ['egg', 'egg'], ['eggs', 'egg'], ['fried eggs', 'egg-fried'],
    ['scrambled eggs', 'egg-scrambled'], ['banana', 'banana'], ['oats', 'oats'], ['oatmeal', 'oatmeal'], ['milk', 'milk-2'],
    ['greek yogurt', 'greek-yogurt-nonfat'], ['cheese', 'cheddar'], ['beans', 'black-beans'], ['steak', 'sirloin-steak'],
    ['pasta', 'pasta'], ['spaghetti', 'pasta'], ['potato', 'potato-baked'], ['chips', 'potato-chips'], ['coffee', 'coffee'],
    ['beer', 'beer'], ['tofu', 'tofu-firm'], ['protein powder', 'whey-protein']];
  for (const [word, id] of defaults) assert.equal(byWord.get(singularWords(word)), id, `"${word}"`);
  assert.equal(byWord.get('protein'), undefined, '"protein" alone is too broad to name a food');
  // The plain egg is cooked without added fat; firm tofu is the dense calcium-set kind
  near(get('egg').per100g.kcal, 155, 5, 'hard-boiled egg kcal/100 g');
  near(get('tofu-firm').per100g.kcal, 144, 5, 'firm tofu kcal/100 g');
  near(get('whey-protein').units.scoop, 30, 3, 'scoop of whey');
});
