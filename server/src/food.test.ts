import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFoodCorrectionRequest, buildFoodRequest, readFoodItems } from './food.ts';

test('buildFoodRequest lists the candidate foods by key after the log', () => {
  const req = buildFoodRequest('2 eggs', { date: '2026-10-03', foods: ['Egg, whole (cooked)', 'Egg white (cooked)'] });
  assert.equal(req.model, 'claude-haiku-4-5-20251001');
  assert.match(req.messages[0].content, /Saturday 2026-10-03[\s\S]*<log>2 eggs<\/log>\n<foods>\nf1 Egg, whole \(cooked\)\nf2 Egg white \(cooked\)\n<\/foods>$/);
  assert.doesNotMatch(buildFoodRequest('x', { date: '2026-10-03' }).messages[0].content, /<foods>/);
});

test('buildFoodCorrectionRequest sends every draft field, nulls included', () => {
  const req = buildFoodCorrectionRequest([{ food: 'f1', name: 'Egg', qty: 2 }], 'it was 3', { date: '2026-10-03', foods: ['Egg'] });
  assert.match(req.system, /<correction>/);
  assert.match(req.messages[0].content, /<draft>\{"items":\[\{"food":"f1","name":"Egg","qty":2,"unit":null,"grams":null,"dayOffset":0,"kcal":null,"protein":null,"carbs":null,"fat":null\}\]\}<\/draft>\n<fix>it was 3<\/fix>/);
});

test('readFoodItems keeps valid picks and estimates and drops bad values', () => {
  const text = 'Here you go: ' + JSON.stringify({
    items: [
      { said: '2 eggs', food: 'f1', qty: 2, unit: null, grams: 100, dayOffset: 0, kcal: null },
      { said: 'a Big Mac', food: null, name: 'Big Mac', qty: 1, grams: 219, kcal: 590, protein: 25, carbs: 46, fat: 34, dayOffset: -1 },
      { said: 'toast', food: 'f9', qty: -1, unit: ' slice ', grams: 'x' }, // key out of range, bad qty
      { food: null, name: null, said: null }, // nothing to show
      null,
    ],
    confidence: 0.9,
  });
  const read = readFoodItems(text, 3)!;
  assert.equal(read.confidence, 0.9);
  assert.deepEqual(read.items, [
    { said: '2 eggs', food: 0, qty: 2, grams: 100 },
    { said: 'a Big Mac', name: 'Big Mac', qty: 1, grams: 219, dayOffset: -1, estimate: { kcal: 590, protein: 25, carbs: 46, fat: 34 } },
    { said: 'toast', unit: 'slice' },
  ]);
  assert.equal(readFoodItems('no json here', 3), null);
  assert.equal(readFoodItems('{"items":"x"}', 3), null);
  assert.equal(readFoodItems('{"items":[],"reply":"About 40 g."}', 0)!.reply, 'About 40 g.');
});
