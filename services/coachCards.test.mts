/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgetFact, mealEntry, MAX_FACTS, priceMeals, rememberFact, resolveWorkout } from './coachCards';
import { SAM, SAM_NOW, SAM_SETTINGS } from './coachPack.fixtures';
import { emptyLibrary } from './exerciseIdentity';

const given = { pack: { lifts: [{ lift: 'Squat', recent: ['2026-10-06 185x5 ×3'], lighter: { '10% off': 165 } }] } };

test('resolveWorkout maps names to the catalog or the library, marks unknown ones new, and drops weights from nowhere', () => {
  const library = { ...emptyLibrary(), custom: [{ id: 'custom-1', name: 'Prowler drag', muscleGroup: 'quads' as const, metric: 'weight-reps' as const, createdAt: '2026-01-01' }] };
  const card = resolveWorkout(
    {
      name: 'Lower A, lighter', when: 'tomorrow', why: 'legs rested longest',
      exercises: [
        { name: 'squats', sets: 3, reps: 5, weight: 165, note: 'was 185x5 on Oct 6' },
        { name: 'RDL', sets: 3, reps: '8-10', weight: 170 }, // 170 appears nowhere the model was given
        { name: 'prowler drags', sets: 4, reps: 20 },
        { name: 'Nordic hamstring thing', sets: 2, reps: 6 },
      ],
    },
    library, 'lbs', given,
  );
  assert.equal(card.name, 'Lower A, lighter');
  assert.equal(card.when, 'tomorrow');
  assert.deepEqual(card.exercises[0], { exerciseId: 'squat', match: 'sure', name: 'Squat', muscleGroup: 'quads', sets: 3, reps: 5, weight: 165, weightUnit: 'lbs', notes: 'was 185x5 on Oct 6' });
  assert.deepEqual(card.exercises[1], { exerciseId: 'romanian-deadlift', match: 'sure', name: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, reps: '8-10' });
  assert.deepEqual(card.exercises[2], { exerciseId: 'custom-1', match: 'sure', name: 'Prowler drag', muscleGroup: 'quads', sets: 4, reps: 20 });
  assert.deepEqual(card.exercises[3], { isNew: true, name: 'Nordic hamstring thing', muscleGroup: 'full_body', sets: 2, reps: 6 });
  assert.deepEqual(card.muscleGroups, ['quads', 'hamstrings', 'full_body']);
});

test('priceMeals prices each meal from the USDA table and drops a meal with nothing it knows', () => {
  const meals = priceMeals(
    [
      { label: 'Lunch', items: ['200 g chicken breast', '1.5 cups white rice', 'a quest bar'], note: 'your usual' },
      { label: 'Snack', items: ['something from the vending machine'] },
    ],
    SAM.foodEntries,
  );
  assert.equal(meals.length, 1);
  assert.equal(meals[0].label, 'Lunch');
  assert.equal(meals[0].note, 'your usual');
  assert.deepEqual(meals[0].items.map(i => [i.name, i.foodId, i.source]), [['Chicken breast', 'chicken-breast', 'usda'], ['Rice, white', 'rice', 'usda']]);
  assert.equal(Math.round(meals[0].total.protein), 68);
  assert.deepEqual(meals[0].unknown, ['a quest bar']);
  const entry = mealEntry(meals[0], SAM_NOW);
  assert.equal(entry.date, '2026-10-12');
  assert.equal(entry.items.length, 2);
  assert.ok(entry.items.every(i => i.id));
  assert.equal(entry.rawInput, 'Lunch: Chicken breast, Rice, white');
});

test('priceMeals carries the price and minutes estimates and drops a meal that holds a never-suggest food', () => {
  const prefs = { matters: [], never: ['shellfish', 'cilantro'] };
  const meals = priceMeals(
    [
      { label: 'Dinner', items: ['6 oz salmon', '1 cup lentils'], price: 9, minutes: 20 },
      { label: 'Shrimp bowl', items: ['200 g shrimp', '1 cup rice'], price: 7, minutes: 15 },
      { label: 'Tacos', items: ['200 g chicken breast', 'cilantro'] },
      { label: 'No-shellfish stir fry', items: ['200 g chicken breast', '1 cup broccoli'] },
    ],
    SAM.foodEntries,
    prefs,
  );
  assert.deepEqual(meals.map(m => [m.label, m.price, m.minutes]), [['Dinner', 9, 20], ['No-shellfish stir fry', undefined, undefined]]);
  // Without preferences nothing is filtered
  assert.equal(priceMeals([{ label: 'Shrimp bowl', items: ['200 g shrimp', '1 cup rice'] }], SAM.foodEntries).length, 1);
});

test('rememberFact keeps your words and the day, replaces the same fact, caps the list; forgetFact removes one', () => {
  const once = rememberFact(SAM_SETTINGS, { kind: 'food', text: 'no dairy', quote: "I don't do dairy" }, SAM_NOW);
  assert.equal(once.profile!.facts.length, 1);
  const f = once.profile!.facts[0];
  assert.deepEqual([f.kind, f.text, f.quote, f.saidOn], ['food', 'no dairy', "I don't do dairy", '2026-10-12']);
  assert.ok(f.id);
  const again = rememberFact(once, { kind: 'food', text: 'No dairy', quote: 'still no dairy' }, SAM_NOW);
  assert.equal(again.profile!.facts.length, 1);
  assert.equal(again.profile!.facts[0].quote, 'still no dairy');
  let many = again;
  for (let i = 0; i < MAX_FACTS + 5; i++) many = rememberFact(many, { kind: 'preference', text: `fact ${i}`, quote: `fact ${i}` }, SAM_NOW);
  assert.equal(many.profile!.facts.length, MAX_FACTS);
  assert.equal(many.profile!.facts[0].text, 'fact 5'); // the oldest went
  assert.equal(forgetFact(once, f.id).profile!.facts.length, 0);
  assert.equal(forgetFact(once, 'nope').profile!.facts.length, 1);
  assert.equal(SAM_SETTINGS.profile, undefined); // inputs untouched
});
