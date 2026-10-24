/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neverSuggested, prefsSummary, scoreMeal, swapQuestion } from './foodPrefs';
import { localFoodParse } from './foods';
import type { FoodPrefs } from '../types/workout';

const PREFS: FoodPrefs = { matters: ['protein', 'lowSpike', 'simple', 'noSeedOils', 'cheap'], budget: 12, never: ['shellfish', 'cilantro'], cooking: 20 };
const items = (log: string) => localFoodParse(log).items;

test('a salmon, lentil and spinach dinner hits every preference; price and time are the estimates given', () => {
  const card = scoreMeal({ items: items('6 oz salmon, 1 cup lentils, 2 cups spinach, 1 tbsp olive oil'), price: 9, minutes: 20 }, PREFS);
  assert.deepEqual(card.rows.map(r => r.verdict), ['hit', 'hit', 'hit', 'hit', 'hit', 'hit']);
  assert.equal(card.headline, 'Likely hits 6 of 6');
  assert.equal(card.rows.find(r => r.pref === 'noSeedOils')?.why, 'olive oil');
  assert.equal(card.rows.find(r => r.pref === 'lowSpike')?.why, 'lentils');
  assert.equal(card.rows.find(r => r.pref === 'cheap')?.label, '~$9');
  assert.equal(card.rows.find(r => r.pref === 'cooking')?.why, 'you cook up to 20');
});

test('white rice with little fiber reads as a likely spike, mayonnaise as seed oils, a price over budget as a miss', () => {
  const card = scoreMeal({ items: items('8 oz chicken breast, 1.5 cups white rice, 1 cup broccoli, 1 tbsp mayonnaise'), price: 15, minutes: 25 }, PREFS);
  const by = Object.fromEntries(card.rows.map(r => [r.pref, r]));
  assert.equal(by.lowSpike.verdict, 'miss');
  assert.equal(by.lowSpike.label, 'Spike likely');
  assert.equal(by.lowSpike.why, 'rice');
  assert.equal(by.noSeedOils.verdict, 'miss');
  assert.equal(by.cheap.verdict, 'miss');
  assert.equal(by.cheap.why, 'over $12');
  assert.equal(by.cooking.verdict, 'miss');
  assert.equal(by.protein.verdict, 'hit');
  assert.equal(card.headline, 'Likely hits 2 of 6');
});

test('fiber is summed across the meal, so a bean meal reads as high fiber', () => {
  const card = scoreMeal({ items: items('1 cup black beans, 1 cup brown rice') }, { matters: ['highFiber'], never: [] });
  assert.equal(card.rows[0].verdict, 'hit');
  assert.match(card.rows[0].label, /^~\d+ g fiber$/);
});

test('peanut oil is named and left to the user, not a miss', () => {
  const card = scoreMeal({ items: items('6 oz salmon, 1 tbsp peanut oil') }, { matters: ['noSeedOils'], never: [] });
  assert.deepEqual(card.rows.map(r => [r.verdict, r.label, r.why]), [['unknown', 'Peanut oil', 'your call']]);
});

test('a logged meal is scored without price or cooking rows, and reads "Hit"', () => {
  const card = scoreMeal({ items: items('2 eggs, 1 cup black beans'), eaten: true }, PREFS);
  assert.deepEqual(card.rows.map(r => r.pref), ['protein', 'lowSpike', 'simple', 'noSeedOils']);
  assert.match(card.headline, /^Hit \d of 4$/);
  assert.equal(card.rows.find(r => r.pref === 'lowSpike')?.verdict, 'hit');
});

test('unknown foods leave the oils unknown and a missing price unknown; nothing to check gives no headline', () => {
  const card = scoreMeal({ items: items('1 cup white rice'), unknown: ['Chipotle bowl'] }, PREFS);
  assert.equal(card.rows.find(r => r.pref === 'noSeedOils')?.verdict, 'unknown');
  assert.equal(card.rows.find(r => r.pref === 'cheap')?.verdict, 'unknown');
  assert.equal(card.rows.find(r => r.pref === 'simple')?.why, '2 things');
  assert.equal(scoreMeal({ items: items('2 eggs') }, { matters: [], never: [] }).headline, '');
});

test('never-suggest words filter by chip group or your own words, on the name or what you said', () => {
  assert.equal(neverSuggested([{ name: 'Shrimp' }, { name: 'Rice, white' }], PREFS), 'shellfish');
  assert.equal(neverSuggested([{ name: 'Chicken breast', said: 'chicken with cilantro' }], PREFS), 'cilantro');
  assert.equal(neverSuggested([{ name: 'Coconut milk' }], { matters: [], never: ['nuts'] }), undefined);
  assert.equal(neverSuggested([{ name: 'Peanut butter' }], { matters: [], never: ['nuts'] }), 'nuts');
  assert.equal(neverSuggested([{ name: 'Chicken breast' }], PREFS), undefined);
  assert.equal(neverSuggested([{ name: 'Shrimp' }], undefined), undefined);
});

test('the summary line and the swap question read as the design has them', () => {
  assert.equal(prefsSummary(PREFS), 'High protein · low spike · simple · no seed oils · cheap · about $12 · 20 min');
  assert.equal(prefsSummary({ matters: [], never: [], cooking: 0 }), 'No cooking');
  assert.equal(prefsSummary({ matters: [], never: [] }), 'Nothing picked yet');
  assert.equal(swapQuestion('Midday', ['chicken breast', 'white rice']), "I had chicken breast, white rice for midday. What's a version that fits my food preferences next time?");
});
