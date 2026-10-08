/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { englishFoodWords } from './foodWords';

test('emoji become the food words the table knows', () => {
  assert.equal(englishFoodWords('🍳🍳 + 🥑 toast').replace(/\s+/g, ' ').trim(), 'egg egg + avocado toast');
  assert.match(englishFoodWords('🍌 and ☕️ black'), /banana .*coffee/);
});

test('common foods in other languages become English; everything else is left alone', () => {
  assert.equal(englishFoodWords('2 huevos y arroz con pollo'), '2 eggs y rice con chicken');
  assert.equal(englishFoodWords('un croissant et un café au lait'), 'un croissant et un coffee au milk');
  assert.equal(englishFoodWords('Eier mit Käse'), 'eggs mit cheese');
  assert.equal(englishFoodWords('pan con queso'), 'pan con cheese'); // "pan" is also English: left alone
  assert.equal(englishFoodWords('bench 3x5 225'), 'bench 3x5 225');
});
