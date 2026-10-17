/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunArc } from './sunArc';

const W = 350, H = 170;

test('one dot per target day along the arc, the last on the horizon', () => {
  const a = sunArc(0, 3, W, H);
  assert.equal(a.dots.length, 3);
  const last = a.dots[2];
  assert.ok(Math.abs(last.x - (a.cx + a.r)) < 0.01 && Math.abs(last.y - a.cy) < 0.01);
  assert.ok(a.dots.every(d => !d.done));
});

test('no sun when nothing is done', () => {
  assert.equal(sunArc(0, 3, W, H).sun, undefined);
  assert.equal(sunArc(0, 3, W, H).doneAngle, Math.PI);
});

test('the sun sits on the latest done dot', () => {
  const a = sunArc(2, 3, W, H);
  assert.deepEqual(a.sun, { x: a.dots[1].x, y: a.dots[1].y });
  assert.deepEqual(a.dots.map(d => d.done), [true, true, false]);
});

test('more done than the target clamps at the end of the arc', () => {
  const a = sunArc(4, 3, W, H);
  assert.equal(a.dots.length, 3);
  assert.ok(a.dots.every(d => d.done));
  assert.deepEqual(a.sun, { x: a.dots[2].x, y: a.dots[2].y });
  assert.equal(a.doneAngle, 0);
});

test('targets of 1 and 7 stay on the arc and apart', () => {
  assert.equal(sunArc(1, 1, W, H).dots.length, 1);
  const seven = sunArc(3, 7, W, H).dots;
  for (const d of seven) assert.ok(d.x >= 0 && d.x <= W && d.y >= 0 && d.y <= H);
  for (let i = 1; i < seven.length; i++) assert.ok(Math.hypot(seven[i].x - seven[i - 1].x, seven[i].y - seven[i - 1].y) > 20);
});
