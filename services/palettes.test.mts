/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PALETTE, PALETTES, PALETTE_IDS, paletteOf } from '../constants/palettes';
import { weekSky } from './sky';

const HEX = /^#[0-9A-F]{6}$/;
const COLOUR = /^(#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|0?\.\d+|1)\))$/;
const tokens = Object.keys(PALETTES.classic.light).sort();

test('every palette defines every token, light and dark, as a colour', () => {
  assert.ok(tokens.length > 30);
  for (const id of PALETTE_IDS) {
    const p = PALETTES[id];
    assert.equal(p.id, id);
    assert.ok(p.name.length > 0);
    for (const mode of ['light', 'dark'] as const) {
      assert.deepEqual(Object.keys(p[mode]).sort(), tokens, `${id} ${mode} tokens`);
      for (const [k, v] of Object.entries(p[mode])) assert.match(v, COLOUR, `${id} ${mode} ${k}`);
    }
    for (const phase of ['dawn', 'day', 'dusk', 'night'] as const) {
      assert.equal(p.sky[phase].length, 4, `${id} sky ${phase}`);
      for (const stop of p.sky[phase]) assert.match(stop, HEX);
    }
    assert.match(p.glow.light, COLOUR);
    assert.match(p.glow.dark, COLOUR);
  }
});

test('the default palette exists and an unknown id falls back to it', () => {
  assert.ok(PALETTE_IDS.includes(DEFAULT_PALETTE));
  assert.equal(paletteOf(undefined).id, DEFAULT_PALETTE);
  assert.equal(paletteOf('no-such-palette').id, DEFAULT_PALETTE);
  assert.equal(paletteOf('cool').id, 'cool');
});

test("a palette's sky is what the week paints", () => {
  assert.deepEqual(weekSky([], [], new Date(2026, 9, 8), {}, PALETTES.cool.sky).stops, PALETTES.cool.sky.dawn);
  assert.notDeepEqual(PALETTES.cool.sky.dawn, PALETTES.classic.sky.dawn);
});
