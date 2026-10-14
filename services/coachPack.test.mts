/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachPack } from './coachPack';
import { JORDAN, NEW_USER, SAM, SAM_NOW } from './coachPack.fixtures';
import { usualMeals } from './suggestions';
import { inventedNumbers } from './insights';

const sam = buildCoachPack(SAM, SAM_NOW);

test('the fixture food was all read from the USDA table', () => {
  assert.ok(SAM.foodEntries.length > 40);
  for (const e of SAM.foodEntries) for (const i of e.items) assert.equal(i.source, 'usda', `${e.rawInput}: ${i.name}`);
});

test('the pack is about 1.1K tokens and holds no raw log text', () => {
  const json = JSON.stringify(sam);
  assert.ok(json.length < 7000, `${json.length} chars`);
  assert.ok(json.length > 2500, `${json.length} chars`);
  assert.equal(json.includes('rawInput'), false);
  assert.equal(json.includes(SAM.foodEntries[0].rawInput), false);
});

test('training: six days off, the usual week, days since each muscle, the lifts with next and lighter targets', () => {
  assert.equal(sam.today, 'Monday 2026-10-12');
  assert.equal(sam.unit, 'lbs');
  assert.deepEqual(sam.profile, { daysAWeek: 4, trainingFor: 'strength', goals: ['Each of chest, back, shoulders, quads, hamstrings on at least 2 days a week', 'Squat: reach 225 lbs'] });
  const t = sam.training;
  assert.equal(t.daysSinceLastWorkout, 6);
  assert.equal(t.usualPerWeek, 4);
  assert.equal(t.daysSinceMuscle.quads, 6);
  assert.equal(t.daysSinceMuscle.chest, 7);
  assert.equal(t.lastSessions!.length, 3);
  assert.deepEqual(t.lastSessions![0], { date: '2026-10-06', name: 'Legs', exercises: ['Squat 185x5 ×3 (felt heavy again)', 'Leg Press', 'Standing Calf Raise'] });
  assert.equal(t.exercises.length, 12);
  assert.equal(t.exercises[0], 'Squat: last 6 days ago, 3x in 4 weeks'); // most done first
  const squat = t.lifts!.find(l => l.lift === 'Squat')!;
  assert.equal(squat.recent[0], '2026-10-06 185x5 ×3 (felt heavy again)');
  assert.equal(squat.heldSessions, 4);
  assert.deepEqual(squat.lighter, { '10% off': 165, '20% off': 150 });
  assert.match(squat.why, /felt heavy/);
  const bench = t.lifts!.find(l => l.lift === 'Bench Press')!;
  assert.equal(bench.best, 'latest is the all-time best');
  assert.equal(bench.next, '150x8 ×3');
  assert.ok(t.goals!.some(g => /^quads: /.test(g)));
  assert.ok(t.goals!.includes('Squat: 185 of 225 lbs'));
  assert.equal(t.loggingStyle, 'full detail');
});

test('food: averages over logged days, today so far and what is left to the goal, usual meals per slot, portions', () => {
  const f = sam.food!;
  assert.equal(f.loggedDaysLast7, 7);
  assert.ok(f.avgPerLoggedDay!.protein > 100 && f.avgPerLoggedDay!.protein < 200, String(f.avgPerLoggedDay!.protein));
  assert.equal(f.goal, 'protein 160 g a day');
  assert.equal(f.today!.meals, 1);
  assert.equal(f.today!.leftToGoal, 160 - f.today!.protein);
  assert.deepEqual(Object.keys(f.usualMeals!), ['breakfast', 'lunch', 'dinner']);
  assert.match(f.usualMeals!.breakfast, /^Egg \d+ g protein \d+ kcal, .* \(14 of the last 14 days\)$/);
  assert.match(f.usualMeals!.lunch, /Chicken breast .* \(10 of the last 14 days\)$/);
  assert.ok(f.usualPortions!.includes('Chicken breast 200 g: 62 g protein, 330 kcal'), f.usualPortions!.join('; '));
  assert.ok(f.topProtein!.includes('chicken breast'));
  assert.ok(f.foodsLogged!.length >= 10);
});

test('every number Progress would show is in the pack, so the guard can hold the coach to it', () => {
  // The two example answers: a lighter squat and today's protein left
  assert.deepEqual(inventedNumbers(`Squat 165x5, was 185x5 on Oct 6. ${sam.food!.today!.leftToGoal} g to go.`, sam), []);
  assert.deepEqual(inventedNumbers('Try 170 for 5', sam), ['170']);
});

test('a names-only logger gets no lifts and no food; a new user gets an empty pack', () => {
  const jordan = buildCoachPack(JORDAN, SAM_NOW);
  assert.equal(jordan.training.lifts, undefined);
  assert.equal(jordan.training.loggingStyle, 'names only');
  assert.equal(jordan.food, undefined);
  assert.equal(jordan.training.exercises.length, 12);
  const fresh = buildCoachPack(NEW_USER, SAM_NOW);
  assert.equal(fresh.training.daysSinceLastWorkout, undefined);
  assert.equal(fresh.training.totalSessions, 0);
  assert.deepEqual(fresh.training.exercises, []);
  assert.equal(fresh.food, undefined);
  assert.equal(fresh.unit, 'kg');
});

test('usualMeals finds the habit in every slot, skipping today', () => {
  const slots = usualMeals(SAM.foodEntries, SAM_NOW);
  assert.deepEqual(slots.map(s => [s.slot, s.days]), [['breakfast', 14], ['lunch', 10], ['dinner', 7]]);
  assert.equal(slots[0].entry.date, '2026-10-11'); // the latest of that kind, not today's
});
