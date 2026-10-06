/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFreshInstall, guessUnit } from './onboarding';

const keys = (store: string | null, templates: string | null = null, schedule: string | null = null, plans: string | null = null) =>
  [['@training-tracker/storage', store], ['@training-tracker/templates', templates], ['@training-tracker/schedule', schedule], ['@training-tracker/plans', plans]] as const;

test('only an install with nothing stored sees setup', () => {
  assert.equal(isFreshInstall(keys(null)), true);
  assert.equal(isFreshInstall(keys(null, '[]', '[]', '[]')), true);
});

test('any stored workouts, settings, templates, schedule or plans mean an existing user', () => {
  assert.equal(isFreshInstall(keys('{"state":{"workouts":[],"settings":{"weightUnit":"lbs"}},"version":1}')), false);
  assert.equal(isFreshInstall(keys(null, '[{"id":"t"}]')), false);
  assert.equal(isFreshInstall(keys(null, null, '[{"id":"s"}]')), false);
  assert.equal(isFreshInstall(keys(null, null, null, '[{"id":"p"}]')), false);
});

test('units are guessed from the region', () => {
  assert.equal(guessUnit('en-US'), 'lbs');
  assert.equal(guessUnit('es_US'), 'lbs');
  assert.equal(guessUnit('en-GB'), 'kg');
  assert.equal(guessUnit('it-IT'), 'kg');
  assert.equal(guessUnit('zh-Hans-CN'), 'kg');
  assert.equal(guessUnit('en'), 'lbs'); // no region: the app's old default
});
