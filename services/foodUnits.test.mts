/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Food, FoodCategory, FoodUnit } from '../types/food';
import { amountLabel, convertQty, macrosFor, parseAmount, parseQuantity, toGrams, unitFromWord, unitsFor } from './foodUnits';

// Small USDA-like foods (grams per unit from FoodData Central portions)
const food = (
  id: string, category: FoodCategory, units: Food['units'], serving: Food['serving'],
  per100g: Food['per100g'] = { kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: 0 }, extra: Partial<Food> = {},
): Food => ({ id, name: id.replace(/-/g, ' '), aliases: [], category, per100g, units, serving, fdc: 1, source: id, ...extra });

const egg = food('egg', 'eggs_dairy', { small: 38, medium: 44, large: 50, xl: 56, cup: 243 }, { qty: 1, unit: 'large' },
  { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 });
const banana = food('banana', 'fruit', { small: 101, medium: 118, large: 136, cup: 150 }, { qty: 1, unit: 'medium' });
const rice = food('rice-white-cooked', 'grains', { cup: 158 }, { qty: 1, unit: 'cup' },
  { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 }, { state: 'cooked' });
const oats = food('oats', 'grains', { cup: 81 }, { qty: 0.5, unit: 'cup' }, undefined, { state: 'dry' });
const milk = food('milk-whole', 'eggs_dairy', { cup: 244 }, { qty: 1, unit: 'cup' });
const oil = food('olive-oil', 'fats_oils', { tbsp: 13.5, tsp: 4.5, cup: 216 }, { qty: 1, unit: 'tbsp' });
const almonds = food('almonds', 'nuts_seeds', { cup: 143, piece: 1.2 }, { qty: 1, unit: 'oz' });
const bread = food('bread-white', 'grains', { slice: 29 }, { qty: 1, unit: 'slice' });
const chicken = food('chicken-breast-cooked', 'meat_fish', { breast: 172, cup: 140 }, { qty: 3, unit: 'oz' });
const pb = food('peanut-butter', 'nuts_seeds', { tbsp: 16, cup: 258 }, { qty: 2, unit: 'tbsp' });
const avocado = food('avocado', 'fruit', { each: 201, cup: 150 }, { qty: 0.5, unit: 'each' });
const whey = food('whey-protein', 'other', {}, { qty: 1, unit: 'scoop' }, undefined, { name: 'Whey protein powder' });
const oj = food('orange-juice', 'drinks', { cup: 248 }, { qty: 1, unit: 'cup' });
const cheddar = food('cheddar', 'eggs_dairy', { slice: 28, cup: 113 }, { qty: 1, unit: 'oz' });
const beef = food('ground-beef-cooked', 'meat_fish', { patty: 85 }, { qty: 4, unit: 'oz' });
const strawberries = food('strawberries', 'fruit', { cup: 152, medium: 12, large: 18 }, { qty: 1, unit: 'cup' });
const blueberries = food('blueberries', 'fruit', { cup: 148 }, { qty: 1, unit: 'cup' });
const coffee = food('coffee', 'drinks', {}, { qty: 1, unit: 'cup' });
const cola = food('cola', 'drinks', { can: 368 }, { qty: 1, unit: 'can' });
const beer = food('beer', 'drinks', { fl_oz: 29.7 }, { qty: 12, unit: 'fl_oz' });
const wine = food('wine-red', 'drinks', { fl_oz: 29.4 }, { qty: 5, unit: 'fl_oz' });
const espresso = food('espresso', 'drinks', { fl_oz: 30 }, { qty: 1, unit: 'shot' });
const vodka = food('vodka', 'drinks', { fl_oz: 27.8 }, { qty: 1.5, unit: 'fl_oz' });
const chocolate = food('milk-chocolate', 'sweets_snacks', { bar: 44 }, { qty: 1, unit: 'bar' });
const butter = food('butter', 'fats_oils', { pat: 5, tbsp: 14.2, stick: 113, cup: 227 }, { qty: 1, unit: 'tbsp' });
const garlic = food('garlic', 'vegetables', { cup: 136 }, { qty: 1, unit: 'clove' });
const bacon = food('bacon', 'meat_fish', { slice: 8 }, { qty: 2, unit: 'slice' });
const iceCream = food('ice-cream-vanilla', 'sweets_snacks', { cup: 132 }, { qty: 0.5, unit: 'cup' });
const beans = food('black-beans-canned', 'legumes', { cup: 172 }, { qty: 0.5, unit: 'cup' });
const buttermilk = food('buttermilk', 'eggs_dairy', {}, { qty: 1, unit: 'cup' });
const milkPowder = food('milk-powder', 'eggs_dairy', { cup: 128 }, { qty: 0.25, unit: 'cup' });

const grams = (f: Food | undefined, qty?: number, unit?: FoodUnit) => toGrams(f, qty, unit)?.grams;
const how = (f: Food | undefined, qty?: number, unit?: FoodUnit) => toGrams(f, qty, unit)?.how;
const near = (actual: number | undefined, expected: number, msg?: string) =>
  assert.ok(actual !== undefined && Math.abs(actual - expected) < 0.06, `${msg ?? ''} got ${actual}, want ${expected}`);

test('unitFromWord knows every spelling, plural and abbreviation', () => {
  const table: Record<FoodUnit, string[]> = {
    g: ['g', 'G', 'g.', 'gr', 'gram', 'grams', 'gramme', 'grammes'],
    kg: ['kg', 'KG', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
    oz: ['oz', 'oz.', 'ozs', 'ounce', 'ounces', 'Ounces'],
    lb: ['lb', 'lbs', 'lb.', 'pound', 'pounds'],
    ml: ['ml', 'mL', 'ML', 'mls', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'cc'],
    l: ['l', 'L', 'liter', 'liters', 'litre', 'litres', 'ltr'],
    tsp: ['tsp', 'tsps', 'tsp.', 'Tsp', 't', 'teaspoon', 'teaspoons'],
    tbsp: ['tbsp', 'Tbsp', 'TBSP', 'tbsps', 'tbs', 'tbl', 'tblsp', 'tablespoon', 'tablespoons', 'T', 'T.'],
    cup: ['cup', 'cups', 'Cups', 'c', 'c.', 'C', 'mug', 'mugs'],
    fl_oz: ['fl oz', 'fl. oz.', 'fl.oz', 'floz', 'fl_oz', 'fluid ounce', 'fluid ounces', 'fluid oz'],
    pint: ['pint', 'pints', 'pt'],
    quart: ['quart', 'quarts', 'qt'],
    gallon: ['gallon', 'gallons', 'gal'],
    each: ['each', 'ea', 'whole'],
    small: ['small', 'sm', 'Small'],
    medium: ['medium', 'med'],
    large: ['large', 'lg', 'Large'],
    xl: ['xl', 'XL', 'extra large', 'extra-large', 'x-large', 'jumbo'],
    slice: ['slice', 'slices'],
    piece: ['piece', 'pieces', 'pc', 'pcs'],
    scoop: ['scoop', 'scoops'],
    handful: ['handful', 'handfuls'],
    serving: ['serving', 'servings', 'portion', 'portions'],
    bowl: ['bowl', 'bowls'],
    plate: ['plate', 'plates'],
    can: ['can', 'cans'],
    bottle: ['bottle', 'bottles'],
    glass: ['glass', 'glasses'],
    packet: ['packet', 'packets', 'pack', 'packs', 'sachet'],
    bar: ['bar', 'bars'],
    stick: ['stick', 'sticks'],
    clove: ['clove', 'cloves'],
    strip: ['strip', 'strips', 'rasher', 'rashers'],
    link: ['link', 'links'],
    patty: ['patty', 'patties'],
    fillet: ['fillet', 'fillets', 'filet', 'filets'],
    breast: ['breast', 'breasts'],
    thigh: ['thigh', 'thighs'],
    drumstick: ['drumstick', 'drumsticks'],
    wing: ['wing', 'wings'],
    leaf: ['leaf', 'leaves'],
    stalk: ['stalk', 'stalks'],
    spear: ['spear', 'spears'],
    wedge: ['wedge', 'wedges'],
    container: ['container', 'containers', 'tub', 'tubs'],
    shot: ['shot', 'shots'],
    pat: ['pat', 'pats'],
    square: ['square', 'squares'],
    sheet: ['sheet', 'sheets'],
  };
  for (const [unit, words] of Object.entries(table)) for (const w of words) assert.equal(unitFromWord(w), unit, w);
});

test('unitFromWord leaves food words alone', () => {
  for (const w of ['t-bone', 'tea', 'bone', 'chicken', 'up', 'grand', 'big', 'leg', 'legs', '', 'constructor', 'toString', 'x', 'and', 'of', 'a', 'la', 'cupcake', 'glassy', 'Tb'])
    assert.equal(unitFromWord(w), undefined, w);
});

test('parseQuantity reads digits, decimals and fractions', () => {
  const cases: [string, number, string][] = [
    ['2 eggs', 2, 'eggs'], ['1.5', 1.5, ''], ['1,5 kg', 1.5, 'kg'], ['.5 cup', 0.5, 'cup'], ['1,000 ml', 1000, 'ml'],
    ['1/2 cup', 0.5, 'cup'], ['3/4', 0.75, ''], ['1 1/2 cups', 1.5, 'cups'], ['2 1/4 cups', 2.25, 'cups'],
    ['½', 0.5, ''], ['1½ cups', 1.5, 'cups'], ['¼ cup', 0.25, 'cup'], ['¾', 0.75, ''], ['⅓', 1 / 3, ''], ['⅔ cup', 2 / 3, 'cup'],
    ['⅛ tsp', 0.125, 'tsp'], ['2 ½', 2.5, ''], ['1⁄2 cup', 0.5, 'cup'], ['1-1/2 cups', 1.5, 'cups'], ['1 and 1/2 cups', 1.5, 'cups'],
  ];
  for (const [t, qty, rest] of cases) assert.deepEqual(parseQuantity(t), { qty, rest }, t);
});

test('parseQuantity reads ranges, words and multipliers', () => {
  const cases: [string, number, string][] = [
    ['2-3', 2.5, ''], ['2 - 3 eggs', 2.5, 'eggs'], ['2–3 eggs', 2.5, 'eggs'], ['2 to 3 eggs', 2.5, 'eggs'], ['2 or 3', 2.5, ''],
    ['1/2-1 cup', 0.75, 'cup'], ['one or two', 1.5, ''],
    ['a', 1, ''], ['an apple', 1, 'apple'], ['A banana', 1, 'banana'], ['one', 1, ''], ['two', 2, ''], ['three', 3, ''],
    ['seven', 7, ''], ['twelve', 12, ''], ['twenty', 20, ''], ['Three eggs', 3, 'eggs'],
    ['half', 0.5, ''], ['a half', 0.5, ''], ['half a banana', 0.5, 'banana'], ['half an avocado', 0.5, 'avocado'],
    ['half of a banana', 0.5, 'banana'], ['half the pizza', 0.5, 'pizza'], ['one half', 0.5, ''],
    ['quarter', 0.25, ''], ['a quarter cup', 0.25, 'cup'], ['a third of a cup', 1 / 3, 'cup'], ['third', 1 / 3, ''],
    ['two thirds cup', 2 / 3, 'cup'], ['three quarters of a cup', 0.75, 'cup'],
    ['one and a half', 1.5, ''], ['two and a half cups', 2.5, 'cups'], ['2 and a quarter', 2.25, ''],
    ['a couple', 2, ''], ['a couple of eggs', 2, 'eggs'], ['couple eggs', 2, 'eggs'], ['a pair of socks', 2, 'socks'],
    ['a few', 3, ''], ['few', 3, ''], ['several eggs', 3, 'eggs'],
    ['a dozen', 12, ''], ['dozen eggs', 12, 'eggs'], ['half a dozen', 6, ''], ['a half dozen eggs', 6, 'eggs'], ['2 dozen eggs', 24, 'eggs'],
    ['2 x 50g', 100, 'g'], ['2x50g bars', 100, 'g bars'], ['2 × 50 g', 100, 'g'], ['2x', 2, ''], ['2x eggs', 2, 'eggs'],
    ['a 12 oz steak', 12, 'oz steak'], ['two 50g bars', 100, 'g bars'], ['about 2 eggs', 2, 'eggs'],
  ];
  for (const [t, qty, rest] of cases) {
    const got = parseQuantity(t);
    assert.ok(got && Math.abs(got.qty - qty) < 1e-9 && got.rest === rest, `${t} → ${JSON.stringify(got)}`);
  }
});

test('parseQuantity is null without a leading amount, and for numbers that are names', () => {
  for (const t of ['rice', '', 'apple', 'another banana', 'halfway', 'oneida', '2% milk', '2 % milk', '80/20 beef', '96/4 beef',
    '7up', 'a1 sauce', 't-bone', 'half and half', 'half & half', 'half-and-half', '3 musketeers', '100 grand', '7 up', 'a la carte'])
    assert.equal(parseQuantity(t), null, t);
});

type A = { qty?: number; unit?: FoodUnit; rest: string };
const amounts: [string, A][] = [
  // the asked-for phrasings
  ['200g chicken', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['200 g of chicken', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['chicken 200g', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['chicken breast (200 g)', { qty: 200, unit: 'g', rest: 'chicken breast' }],
  ['6oz steak', { qty: 6, unit: 'oz', rest: 'steak' }],
  ['1/2 lb ground beef', { qty: 0.5, unit: 'lb', rest: 'ground beef' }],
  ['1/2lb ground beef', { qty: 0.5, unit: 'lb', rest: 'ground beef' }],
  ['one and a half cups of rice', { qty: 1.5, unit: 'cup', rest: 'rice' }],
  ['1 1/2 cups cooked rice', { qty: 1.5, unit: 'cup', rest: 'cooked rice' }],
  ['½ cup oats', { qty: 0.5, unit: 'cup', rest: 'oats' }],
  ['½cup oats', { qty: 0.5, unit: 'cup', rest: 'oats' }],
  ['1½ cups milk', { qty: 1.5, unit: 'cup', rest: 'milk' }],
  ['2 eggs', { qty: 2, rest: 'eggs' }],
  ['a banana', { qty: 1, rest: 'banana' }],
  ['an egg', { qty: 1, rest: 'egg' }],
  ['half an avocado', { qty: 0.5, rest: 'avocado' }],
  ['a large apple', { qty: 1, unit: 'large', rest: 'apple' }],
  ['3 slices of bread', { qty: 3, unit: 'slice', rest: 'bread' }],
  ['2 slices bread', { qty: 2, unit: 'slice', rest: 'bread' }],
  ['a handful of almonds', { qty: 1, unit: 'handful', rest: 'almonds' }],
  ['a scoop of whey', { qty: 1, unit: 'scoop', rest: 'whey' }],
  ['2 tbsp peanut butter', { qty: 2, unit: 'tbsp', rest: 'peanut butter' }],
  ['a glass of milk', { qty: 1, unit: 'glass', rest: 'milk' }],
  ['16 fl oz milk', { qty: 16, unit: 'fl_oz', rest: 'milk' }],
  ['16floz milk', { qty: 16, unit: 'fl_oz', rest: 'milk' }],
  ['12 fluid ounces of juice', { qty: 12, unit: 'fl_oz', rest: 'juice' }],
  ['8 oz of milk', { qty: 8, unit: 'oz', rest: 'milk' }],
  ['a couple eggs', { qty: 2, rest: 'eggs' }],
  ['a couple of eggs', { qty: 2, rest: 'eggs' }],
  ['a few strawberries', { qty: 3, rest: 'strawberries' }],
  ['a dozen almonds', { qty: 12, rest: 'almonds' }],
  ['2-3 eggs', { qty: 2.5, rest: 'eggs' }],
  ['2 x 50g bars', { qty: 100, unit: 'g', rest: 'bars' }],
  ['2 × 50 g bars', { qty: 100, unit: 'g', rest: 'bars' }],
  ['two 50g bars', { qty: 100, unit: 'g', rest: 'bars' }],
  ['a pint of blueberries', { qty: 1, unit: 'pint', rest: 'blueberries' }],
  ['rice', { rest: 'rice' }],
  ['', { rest: '' }],
  // sizes, words, ranges
  ['2 large eggs', { qty: 2, unit: 'large', rest: 'eggs' }],
  ['2 xl eggs', { qty: 2, unit: 'xl', rest: 'eggs' }],
  ['2 extra large eggs', { qty: 2, unit: 'xl', rest: 'eggs' }],
  ['2 extra-large eggs', { qty: 2, unit: 'xl', rest: 'eggs' }],
  ['3 sm potatoes', { qty: 3, unit: 'small', rest: 'potatoes' }],
  ['half a dozen eggs', { qty: 6, rest: 'eggs' }],
  ['2 dozen eggs', { qty: 24, rest: 'eggs' }],
  ['3 or 4 strawberries', { qty: 3.5, rest: 'strawberries' }],
  ['1-2 tbsp olive oil', { qty: 1.5, unit: 'tbsp', rest: 'olive oil' }],
  ['200-250g chicken', { qty: 225, unit: 'g', rest: 'chicken' }],
  ['a cup and a half of rice', { qty: 1.5, unit: 'cup', rest: 'rice' }],
  ['half a cup of rice', { qty: 0.5, unit: 'cup', rest: 'rice' }],
  ['a quarter cup of oats', { qty: 0.25, unit: 'cup', rest: 'oats' }],
  ['half a large avocado', { qty: 0.5, unit: 'large', rest: 'avocado' }],
  ['a whole avocado', { qty: 1, unit: 'each', rest: 'avocado' }],
  ['2 whole eggs', { qty: 2, unit: 'each', rest: 'eggs' }],
  ['Three Eggs', { qty: 3, rest: 'Eggs' }],
  ['twelve almonds', { qty: 12, rest: 'almonds' }],
  ['1,5 kg potatoes', { qty: 1.5, unit: 'kg', rest: 'potatoes' }],
  ['1.5l water', { qty: 1.5, unit: 'l', rest: 'water' }],
  ['250ml milk', { qty: 250, unit: 'ml', rest: 'milk' }],
  ['2 T sugar', { qty: 2, unit: 'tbsp', rest: 'sugar' }],
  ['2T sugar', { qty: 2, unit: 'tbsp', rest: 'sugar' }],
  ['2 t sugar', { qty: 2, unit: 'tsp', rest: 'sugar' }],
  ['1c milk', { qty: 1, unit: 'cup', rest: 'milk' }],
  ['2 lbs chicken', { qty: 2, unit: 'lb', rest: 'chicken' }],
  ['a 12 oz steak', { qty: 12, unit: 'oz', rest: 'steak' }],
  ['2 x eggs', { qty: 2, rest: 'eggs' }],
  ['2x protein bars', { qty: 2, rest: 'protein bars' }],
  // portion words
  ['3 rashers of bacon', { qty: 3, unit: 'strip', rest: 'bacon' }],
  ['2 cans of coke', { qty: 2, unit: 'can', rest: 'coke' }],
  ['a mug of tea', { qty: 1, unit: 'cup', rest: 'tea' }],
  ['a bowl of oatmeal', { qty: 1, unit: 'bowl', rest: 'oatmeal' }],
  ['a plate of pasta', { qty: 1, unit: 'plate', rest: 'pasta' }],
  ['a bottle of water', { qty: 1, unit: 'bottle', rest: 'water' }],
  ['a pack of gum', { qty: 1, unit: 'packet', rest: 'gum' }],
  ['a stick of butter', { qty: 1, unit: 'stick', rest: 'butter' }],
  ['2 cloves of garlic', { qty: 2, unit: 'clove', rest: 'garlic' }],
  ['2 links of sausage', { qty: 2, unit: 'link', rest: 'sausage' }],
  ['a filet of salmon', { qty: 1, unit: 'fillet', rest: 'salmon' }],
  ['3 leaves of lettuce', { qty: 3, unit: 'leaf', rest: 'lettuce' }],
  ['a tub of yogurt', { qty: 1, unit: 'container', rest: 'yogurt' }],
  ['a shot of espresso', { qty: 1, unit: 'shot', rest: 'espresso' }],
  ['a pat of butter', { qty: 1, unit: 'pat', rest: 'butter' }],
  ['2 squares of chocolate', { qty: 2, unit: 'square', rest: 'chocolate' }],
  ['3 pcs sushi', { qty: 3, unit: 'piece', rest: 'sushi' }],
  ['a portion of fries', { qty: 1, unit: 'serving', rest: 'fries' }],
  ['2 glasses of wine', { qty: 2, unit: 'glass', rest: 'wine' }],
  // a portion word that ends the phrase names the food
  ['2 wings', { qty: 2, rest: 'wings' }],
  ['2 patties', { qty: 2, rest: 'patties' }],
  ['2 chicken thighs', { qty: 2, rest: 'chicken thighs' }],
  // no number: a size or "<unit> of" is an amount
  ['large fries', { unit: 'large', rest: 'fries' }],
  ['medium banana', { unit: 'medium', rest: 'banana' }],
  ['cup of coffee', { unit: 'cup', rest: 'coffee' }],
  ['glass of wine', { unit: 'glass', rest: 'wine' }],
  // fillers
  ['some rice', { rest: 'rice' }],
  ['about 200g chicken', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['~200g chicken', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['like maybe 2 eggs', { qty: 2, rest: 'eggs' }],
  ['roughly 1 cup rice', { qty: 1, unit: 'cup', rest: 'rice' }],
  ['just a banana', { qty: 1, rest: 'banana' }],
  // amounts after the food
  ['chicken about 200 g', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['rice 1 cup', { qty: 1, unit: 'cup', rest: 'rice' }],
  ['milk, 250ml', { qty: 250, unit: 'ml', rest: 'milk' }],
  ['chicken - 200g', { qty: 200, unit: 'g', rest: 'chicken' }],
  ['bread 2 slices', { qty: 2, unit: 'slice', rest: 'bread' }],
  ['eggs x2', { qty: 2, rest: 'eggs' }],
  ['eggs 2x', { qty: 2, rest: 'eggs' }],
  ['eggs 2', { rest: 'eggs 2' }], // a bare trailing number stays: too often part of a name
  // numbers and amount words that are names
  ['a cup of half and half', { qty: 1, unit: 'cup', rest: 'half and half' }],
  ['2 tbsp half & half', { qty: 2, unit: 'tbsp', rest: 'half & half' }],
  ['half and half', { rest: 'half and half' }],
  ['t-bone steak', { rest: 't-bone steak' }],
  ['a t-bone steak', { qty: 1, rest: 't-bone steak' }],
  ['a la carte fries', { rest: 'a la carte fries' }],
  ['chicken a la king', { rest: 'chicken a la king' }],
  ['7up', { rest: '7up' }],
  ['7 up', { rest: '7 up' }],
  ['a 7up', { qty: 1, rest: '7up' }],
  ['12 oz 7up', { qty: 12, unit: 'oz', rest: '7up' }],
  ['3 musketeers', { rest: '3 musketeers' }],
  ['2 3 musketeers bars', { qty: 2, rest: '3 musketeers bars' }],
  ['100 grand bar', { rest: '100 grand bar' }],
  ['a 100 grand bar', { qty: 1, rest: '100 grand bar' }],
  ['a1 sauce', { rest: 'a1 sauce' }],
  ['2 tbsp a1 sauce', { qty: 2, unit: 'tbsp', rest: 'a1 sauce' }],
  ['5 hour energy', { rest: '5 hour energy' }],
  ['a quarter pounder', { rest: 'a quarter pounder' }],
  ['whole milk', { rest: 'whole milk' }],
  ['1 cup whole milk', { qty: 1, unit: 'cup', rest: 'whole milk' }],
  ['a whole milk latte', { qty: 1, rest: 'whole milk latte' }],
  ['2 slices whole wheat bread', { qty: 2, unit: 'slice', rest: 'whole wheat bread' }],
  ['medium rare steak', { rest: 'medium rare steak' }],
  ['2% milk', { rest: '2% milk' }],
  ['a glass of 2% milk', { qty: 1, unit: 'glass', rest: '2% milk' }],
  ['80/20 ground beef', { rest: '80/20 ground beef' }],
  ['1 lb 80/20 ground beef', { qty: 1, unit: 'lb', rest: '80/20 ground beef' }],
];

test('parseAmount splits amount, unit and food words', () => {
  for (const [t, want] of amounts) assert.deepEqual(parseAmount(t), want, t);
});

test('toGrams: mass is exact, with or without a food', () => {
  near(grams(chicken, 200, 'g'), 200);
  near(grams(beef, 0.5, 'lb'), 226.8);
  near(grams(chicken, 6, 'oz'), 170.1);
  near(grams(rice, 1, 'kg'), 1000);
  near(grams(undefined, 200, 'g'), 200);
  near(grams(undefined, 6, 'oz'), 170.1);
  near(grams(undefined, 1, 'lb'), 453.6);
  near(grams(undefined, 1.5, 'kg'), 1500);
  near(grams(undefined, undefined, 'g'), 1);
  near(grams(chocolate, 1, 'oz'), 28.3); // milk chocolate is not a drink
  near(grams(milkPowder, 1, 'oz'), 28.3); // nor is milk powder
  assert.equal(how(chicken, 200, 'g'), 'mass');
  assert.equal(how(undefined, 6, 'oz'), 'mass');
});

test('toGrams: oz of a drink is fluid ounces', () => {
  near(grams(milk, 8, 'oz'), 244);
  assert.equal(how(milk, 8, 'oz'), 'volume');
  near(grams(oj, 8, 'oz'), 248);
  near(grams(coffee, 12, 'oz'), 354.9);
  near(grams(buttermilk, 8, 'oz'), 236.6); // a milk with no volume data weighs like water
  near(grams(milk, 16, 'fl_oz'), 488);
});

test('toGrams: volume uses the food\'s own cup, tbsp or tsp weight', () => {
  near(grams(rice, 1, 'cup'), 158);
  near(grams(rice, 1.5, 'cup'), 237);
  near(grams(oats, 0.5, 'cup'), 40.5);
  near(grams(oats, 2, 'tbsp'), 10.1);
  near(grams(oil, 1, 'tbsp'), 13.5);
  near(grams(oil, 1, 'tsp'), 4.5);
  near(grams(oil, 1, 'fl_oz'), 27);
  near(grams(pb, 2, 'tbsp'), 32);
  near(grams(pb, 1, 'tsp'), 5.4); // from its cup
  near(grams(blueberries, 1, 'pint'), 296);
  near(grams(milk, 250, 'ml'), 257.8);
  near(grams(milk, 1, 'l'), 1031.3);
  near(grams(milk, 1, 'quart'), 976);
  near(grams(milk, 1, 'gallon'), 3904);
  near(grams(beer, 12, 'fl_oz'), 356.4);
  near(grams(coffee, 1, 'cup'), 236.6); // a drink with no volume data weighs like water
  assert.equal(how(rice, 1, 'cup'), 'volume');
  assert.equal(how(oats, 2, 'tbsp'), 'volume');
  // no food: water-like
  near(grams(undefined, 250, 'ml'), 250);
  near(grams(undefined, 1, 'cup'), 236.6);
  near(grams(undefined, 2, 'tbsp'), 29.6);
  near(grams(undefined, 16, 'fl_oz'), 473.2);
  assert.equal(how(undefined, 250, 'ml'), 'volume');
  // no volume data and not a liquid
  assert.equal(toGrams(whey, 1, 'cup'), null);
  assert.equal(toGrams(whey, 1, 'tbsp'), null);
  assert.equal(toGrams(bread, 1, 'cup'), null);
});

test('toGrams: sizes from the food, else scaled from another size or item', () => {
  near(grams(egg, 2, 'large'), 100);
  near(grams(egg, 1, 'medium'), 44);
  near(grams(egg, 1, 'xl'), 56);
  near(grams(banana, 1, 'large'), 136);
  assert.equal(how(banana, 1, 'large'), 'size');
  near(grams(banana, 1, 'xl'), 171.1); // 118 × 1.45
  near(grams(strawberries, 1, 'small'), 9.6); // 12 × 0.8
  near(grams(avocado, 1, 'large'), 261.3); // each 201 × 1.3
  near(grams(avocado, 1, 'small'), 160.8);
  assert.equal(how(avocado, 1, 'large'), 'size');
  near(grams(chicken, 1, 'large'), 223.6); // a breast × 1.3
  assert.equal(how(chicken, 1, 'large'), 'generic');
  near(grams(coffee, 1, 'large'), 307.6); // a cup serving × 1.3
  assert.equal(toGrams(undefined, 1, 'large'), null);
});

test('toGrams: a count is one whole item', () => {
  near(grams(egg, 2, undefined), 100); // the serving's "large", not medium
  assert.equal(how(egg, 2, undefined), 'size');
  near(grams(egg, 1, 'each'), 50);
  near(grams(banana, 1, undefined), 118);
  near(grams(avocado, 0.5, undefined), 100.5);
  near(grams(avocado, 1, 'each'), 201);
  near(grams(strawberries, 3, undefined), 36); // medium, though the serving is a cup
  near(grams(almonds, 12, undefined), 14.4);
  near(grams(chicken, 2, undefined), 344);
  assert.equal(how(chicken, 2, undefined), 'portion');
  near(grams(bread, 2, undefined), 58);
  near(grams(bacon, 3, undefined), 24);
  near(grams(cheddar, 2, undefined), 56);
  near(grams(beef, 1, undefined), 85);
  near(grams(cola, 2, undefined), 736);
  near(grams(chocolate, 1, undefined), 44);
  near(grams(rice, 2, undefined), 316); // nothing countable: servings
  assert.equal(how(rice, 2, undefined), 'serving');
  near(grams(beer, 2, undefined), 712.8);
  near(grams(whey, 2, undefined), 60);
  assert.equal(toGrams(undefined, 2, undefined), null);
});

test('toGrams: no amount is the default serving', () => {
  near(grams(rice), 158);
  near(grams(oats), 40.5);
  near(grams(egg), 50);
  near(grams(banana), 118);
  near(grams(avocado), 100.5);
  near(grams(almonds), 28.3);
  near(grams(pb), 32);
  near(grams(chicken), 85);
  near(grams(bacon), 16);
  near(grams(beer), 356.4);
  near(grams(whey), 30); // its "1 scoop" serving with no scoop weight: the generic scoop
  near(grams(garlic), 3);
  near(grams(coffee), 236.6);
  for (const f of [rice, egg, whey]) assert.equal(how(f), 'serving');
  near(grams(rice, 2, 'serving'), 316);
  assert.equal(how(rice, 2, 'serving'), 'serving');
  near(grams(rice, undefined, 'cup'), 158); // no qty: one of the unit
  near(grams(bread, undefined, 'slice'), 29);
  assert.equal(toGrams(undefined, undefined, undefined), null);
});

test('toGrams: portions from the food, else generic numbers', () => {
  near(grams(bread, 3, 'slice'), 87);
  assert.equal(how(bread, 3, 'slice'), 'portion');
  near(grams(chicken, 1, 'slice'), 28);
  assert.equal(how(chicken, 1, 'slice'), 'generic');
  near(grams(bacon, 3, 'strip'), 24); // USDA bacon comes in slices
  near(grams(butter, 1, 'pat'), 5);
  near(grams(butter, 1, 'stick'), 113);
  near(grams(pb, 1, 'pat'), 5);
  near(grams(garlic, 2, 'clove'), 6);
  near(grams(cola, 1, 'can'), 368);
  // handful
  near(grams(almonds, 1, 'handful'), 28);
  near(grams(chocolate, 1, 'handful'), 28);
  near(grams(blueberries, 1, 'handful'), 40);
  near(grams(rice, 1, 'handful'), 30);
  assert.equal(how(almonds, 1, 'handful'), 'generic');
  // scoop
  near(grams(whey, 2, 'scoop'), 60);
  near(grams(iceCream, 2, 'scoop'), 132);
  near(grams(rice, 1, 'scoop'), 79);
  // bowl and plate
  near(grams(oats, 1, 'bowl'), 121.5);
  near(grams(whey, 1, 'bowl'), 300);
  near(grams(rice, 1, 'plate'), 316);
  near(grams(whey, 1, 'plate'), 400);
  // drinks
  near(grams(milk, 1, 'glass'), 244);
  near(grams(oj, 1, 'glass'), 248);
  near(grams(wine, 1, 'glass'), 147);
  near(grams(beer, 1, 'glass'), 356.4);
  near(grams(beer, 1, 'bottle'), 356.4);
  near(grams(beer, 1, 'can'), 356.4);
  near(grams(wine, 1, 'bottle'), 745.6);
  near(grams(cola, 1, 'bottle'), 500);
  near(grams(cola, 1, 'glass'), 236.6);
  near(grams(espresso, 2, 'shot'), 60);
  near(grams(vodka, 1, 'shot'), 41.7);
  // a food can, and whole-item portions that fall back to a count
  near(grams(beans, 1, 'can'), 258);
  near(grams(chicken, 1, 'piece'), 172);
  near(grams(oats, 1, 'packet'), 40.5);
  assert.equal(how(oats, 1, 'packet'), 'serving');
  near(grams(egg, 1, 'piece'), 50);
  // can't tell
  assert.equal(toGrams(whey, 1, 'can'), null);
  assert.equal(toGrams(whey, 1, 'glass'), null);
  assert.equal(toGrams(banana, 1, 'leaf'), null);
  assert.equal(toGrams(chocolate, 2, 'square'), null);
  assert.equal(toGrams(rice, 1, 'sheet'), null);
  assert.equal(toGrams(undefined, 1, 'handful'), null);
  assert.equal(toGrams(undefined, 1, 'slice'), null);
});

test('parseAmount and toGrams together weigh what people type', () => {
  const cases: [string, Food | undefined, number][] = [
    ['200g chicken', chicken, 200], ['chicken breast (200 g)', chicken, 200], ['6oz steak', beef, 170.1],
    ['1/2 lb ground beef', beef, 226.8], ['one and a half cups of rice', rice, 237], ['1 1/2 cups', rice, 237],
    ['½ cup', oats, 40.5], ['2 eggs', egg, 100], ['a banana', banana, 118], ['half an avocado', avocado, 100.5],
    ['a large banana', banana, 136], ['3 slices of bread', bread, 87], ['a handful of almonds', almonds, 28],
    ['a scoop of whey', whey, 30], ['2 tbsp peanut butter', pb, 32], ['a glass of milk', milk, 244],
    ['16 fl oz milk', milk, 488], ['8 oz of milk', milk, 244], ['a couple eggs', egg, 100], ['a few strawberries', strawberries, 36],
    ['a dozen almonds', almonds, 14.4], ['2-3 eggs', egg, 125], ['chicken 200g', chicken, 200], ['2 x 50g bars', undefined, 100],
    ['a pint of blueberries', blueberries, 296], ['rice', rice, 158], ['half a dozen eggs', egg, 300], ['3 strips of bacon', bacon, 24],
    ['a pat of butter', butter, 5], ['a can of black beans', beans, 258], ['2 beers', beer, 712.8], ['a glass of wine', wine, 147],
  ];
  for (const [t, f, want] of cases) {
    const a = parseAmount(t);
    near(grams(f, a.qty, a.unit), want, t);
  }
});

test('macrosFor scales per 100 g and rounds', () => {
  assert.deepEqual(macrosFor(rice, 158), { kcal: 205, protein: 4.3, carbs: 44.6, fat: 0.5, fiber: 0.6 });
  assert.deepEqual(macrosFor(egg, 100), { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 });
  assert.deepEqual(macrosFor(egg, 50), { kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 });
  assert.deepEqual(macrosFor(rice, 0), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
});

test('amountLabel writes amounts the way people read them', () => {
  const cases: [number | undefined, FoodUnit | undefined, Food | undefined, string][] = [
    [200, 'g', undefined, '200 g'], [150.4, 'g', undefined, '150 g'], [6, 'oz', undefined, '6 oz'], [1.5, 'cup', undefined, '1½ cups'],
    [2, 'tbsp', undefined, '2 tbsp'], [1, 'tsp', undefined, '1 tsp'], [0.5, 'cup', undefined, '½ cup'], [1, 'cup', undefined, '1 cup'],
    [2, 'cup', undefined, '2 cups'], [0.25, 'cup', undefined, '¼ cup'], [0.75, 'cup', undefined, '¾ cup'], [0.33, 'cup', undefined, '⅓ cup'],
    [2 / 3, 'cup', undefined, '⅔ cup'], [1.25, 'lb', undefined, '1¼ lb'], [1.3, 'cup', undefined, '1.3 cups'], [2.5, 'piece', undefined, '2½ pieces'],
    [16, 'fl_oz', undefined, '16 fl oz'], [1.5, 'l', undefined, '1.5 L'], [0.25, 'kg', undefined, '0.25 kg'], [250, 'ml', undefined, '250 ml'],
    [2, 'pint', undefined, '2 pints'], [1, 'large', undefined, '1 large'], [2, 'large', undefined, '2 large'], [2, 'xl', undefined, '2 XL'],
    [2, 'each', undefined, '2 whole'], [3, 'slice', undefined, '3 slices'], [1, 'slice', undefined, '1 slice'], [1, 'handful', undefined, '1 handful'],
    [2, 'handful', undefined, '2 handfuls'], [2, 'glass', undefined, '2 glasses'], [2, 'patty', undefined, '2 patties'], [3, 'leaf', undefined, '3 leaves'],
    [1, 'serving', undefined, '1 serving'], [undefined, 'cup', undefined, '1 cup'], [2, undefined, undefined, '2'], [0.02, 'cup', undefined, '0.02 cup'],
    // with a food: counts show what one item was weighed as, oz of a drink is fl oz, no amount is the serving
    [2, undefined, egg, '2 large'], [1, undefined, banana, '1 medium'], [2, undefined, chicken, '2 breasts'], [1, undefined, avocado, '1 whole'],
    [2, undefined, rice, '2 servings'], [8, 'oz', milk, '8 fl oz'], [8, 'oz', beef, '8 oz'],
    [undefined, undefined, rice, '1 cup'], [undefined, undefined, oil, '1 tbsp'], [undefined, undefined, pb, '2 tbsp'],
    [undefined, undefined, avocado, '½ whole'], [undefined, undefined, almonds, '1 oz'], [undefined, undefined, undefined, '1 serving'],
  ];
  for (const [q, u, f, want] of cases) assert.equal(amountLabel(q, u, f), want, `${q} ${u} ${f?.id}`);
});

test('unitsFor offers items first, then volume, then weight', () => {
  assert.deepEqual(unitsFor(egg), ['small', 'medium', 'large', 'xl', 'cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(banana), ['small', 'medium', 'large', 'cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(rice), ['cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(oil), ['cup', 'tbsp', 'tsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(chicken), ['breast', 'cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(bread), ['slice', 'g', 'oz']);
  assert.deepEqual(unitsFor(butter), ['pat', 'stick', 'cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(avocado), ['each', 'cup', 'tbsp', 'g', 'oz']);
  assert.deepEqual(unitsFor(whey), ['g', 'oz']);
  assert.deepEqual(unitsFor(milk), ['cup', 'tbsp', 'ml', 'fl_oz']);
  assert.deepEqual(unitsFor(coffee), ['cup', 'tbsp', 'ml', 'fl_oz']);
  assert.deepEqual(unitsFor(cola), ['can', 'cup', 'tbsp', 'ml', 'fl_oz']);
  assert.deepEqual(unitsFor(beer), ['cup', 'tbsp', 'fl_oz', 'ml']);
  // every offered unit can be weighed
  for (const f of [egg, banana, rice, oil, chicken, bread, butter, avocado, whey, milk, coffee, cola, beer, almonds, bacon])
    for (const u of unitsFor(f)) assert.ok(toGrams(f, 1, u), `${f.id} ${u}`);
});

test('convertQty switches units and rounds to friendly steps', () => {
  assert.equal(convertQty(rice, 1, 'cup', 'g'), 158);
  assert.equal(convertQty(rice, 158, 'g', 'cup'), 1);
  assert.equal(convertQty(rice, 100, 'g', 'cup'), 0.75);
  assert.equal(convertQty(rice, 1, 'cup', 'oz'), 5.5);
  assert.equal(convertQty(rice, 2, 'cup', 'kg'), 0.32);
  assert.equal(convertQty(egg, 2, undefined, 'g'), 100);
  assert.equal(convertQty(egg, 100, 'g', 'large'), 2);
  assert.equal(convertQty(egg, 2, 'large', 'medium'), 2.5);
  assert.equal(convertQty(milk, 1, 'cup', 'fl_oz'), 8);
  assert.equal(convertQty(milk, 8, 'oz', 'ml'), 237);
  assert.equal(convertQty(milk, 8, 'oz', 'cup'), 1);
  assert.equal(convertQty(oil, 1, 'tbsp', 'tsp'), 3);
  assert.equal(convertQty(oil, 1, 'tbsp', 'g'), 14);
  assert.equal(convertQty(oil, 1, 'tsp', 'cup'), 0.25); // never below one step
  assert.equal(convertQty(chicken, 200, 'g', 'lb'), 0.5);
  assert.equal(convertQty(chicken, 1, 'breast', 'oz'), 6);
  assert.equal(convertQty(bread, 2, 'slice', 'g'), 58);
  assert.equal(convertQty(banana, 1, 'large', 'medium'), 1);
  assert.equal(convertQty(avocado, 0.5, 'each', 'cup'), 0.75);
  assert.equal(convertQty(rice, 0, 'cup', 'g'), 0);
  assert.equal(convertQty(whey, 1, 'scoop', 'cup'), 1); // can't weigh a cup of it: unchanged
});

test('convertQty round trips through grams', () => {
  const trips: [Food, number, FoodUnit | undefined][] = [
    [rice, 1, 'cup'], [rice, 1.5, 'cup'], [egg, 2, 'large'], [egg, 3, undefined], [banana, 2, 'medium'], [bread, 3, 'slice'],
    [oil, 2, 'tbsp'], [oil, 1, 'tsp'], [pb, 2, 'tbsp'], [chicken, 1, 'breast'], [avocado, 0.5, 'each'], [milk, 2, 'cup'],
    [butter, 1, 'stick'], [cheddar, 2, 'slice'],
  ];
  for (const [f, q, u] of trips) {
    const g = convertQty(f, q, u, 'g');
    assert.equal(convertQty(f, g, 'g', u ?? 'each'), q, `${f.id} ${q} ${u}`);
  }
});

test('kitchen multiples: dl, cl, dollop, splash, drizzle, knob; spoon and huge', () => {
  assert.deepEqual(parseAmount('1,5 dl oats'), { qty: 150, unit: 'ml', rest: 'oats' });
  assert.deepEqual(parseAmount('33 cl beer'), { qty: 330, unit: 'ml', rest: 'beer' });
  assert.deepEqual(parseAmount('a dollop of sour cream'), { qty: 2, unit: 'tbsp', rest: 'sour cream' });
  assert.deepEqual(parseAmount('a splash of milk'), { qty: 1, unit: 'fl_oz', rest: 'milk' });
  assert.deepEqual(parseAmount('a drizzle of olive oil'), { qty: 2, unit: 'tsp', rest: 'olive oil' });
  assert.deepEqual(parseAmount('a knob of butter'), { qty: 10, unit: 'g', rest: 'butter' });
  assert.deepEqual(parseAmount('spoon of pb'), { unit: 'tbsp', rest: 'pb' });
  assert.deepEqual(parseAmount('a spoonful of honey'), { qty: 1, unit: 'tbsp', rest: 'honey' });
  assert.deepEqual(parseAmount('huge sweet potato'), { unit: 'xl', rest: 'sweet potato' });
});
