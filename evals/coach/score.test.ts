import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCoachCase } from './score.ts';
import { cases } from './cases.ts';
import { cases as holdout } from './holdout.ts';
import { PACKS } from './fixture.ts';

const example = cases.find((c) => c.id === 'comeback-example')!;
const knee = cases.find((c) => c.id === 'redflag-knee')!;
const reply = (answer: string, headline = 'Start lower, a bit lighter', chips = ['Upper instead', 'Why 10% off?', 'Make it 30 minutes']) =>
  JSON.stringify({ headline, answer, fromLog: '6 days since your last workout; squat 185x5 felt heavy on 2026-10-06', chips });

test('a good answer to the comeback question passes every check', () => {
  const card = { name: 'Lower A, lighter', when: 'today', why: 'legs rested longest', exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 165 }, { name: 'Leg Press', sets: 3, reps: 10 }] };
  const s = scoreCoachCase(example, reply('Six days off after nine weeks at four a week, so nothing is lost. Legs have rested longest and your last squat day felt heavy, so start there 10% lighter.').replace(/}$/, `,"workout":${JSON.stringify(card)}}`), PACKS.sam);
  assert.deepEqual(s.checks.filter((k) => !k.pass), []);
  assert.equal(s.score, 1);
  // Without the card the example question misses one check; a weight from nowhere on the card is invented
  assert.deepEqual(scoreCoachCase(example, reply('Legs first, 10% lighter.'), PACKS.sam).checks.filter((k) => !k.pass).map((k) => k.name), ['shows a workout']);
  const heavy = scoreCoachCase(example, reply('Legs first, 10% lighter.').replace(/}$/, `,"workout":${JSON.stringify({ ...card, exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 170 }] })}}`), PACKS.sam);
  assert.deepEqual(heavy.invented, ['170']);
});

test('tool, card and memory checks read the run and the reply', () => {
  const tuesday = cases.find((c) => c.id === 'tool-last-tuesday')!;
  const run = { calls: [{ name: 'query_workouts', input: { from: '2026-10-06', to: '2026-10-06' } }], results: [{ days: [{ date: '2026-10-06', exercises: ['Squat 185x5 ×3 (felt heavy again)'] }] }] };
  const good = scoreCoachCase(tuesday, reply('Legs: squat 185x5 for 3, then leg press and calves.', 'Legs, squat 185x5'), PACKS.sam, run);
  assert.equal(good.score, 1);
  const noTool = scoreCoachCase(tuesday, reply('Legs: squat 185x5 for 3.', 'Legs'), PACKS.sam);
  assert.deepEqual(noTool.checks.filter((k) => !k.pass).map((k) => k.name), ['calls query_workouts']);
  // A number only a tool result holds counts as given
  const bench = cases.find((c) => c.id === 'tool-bench-pr')!;
  const pr = scoreCoachCase(bench, reply('145x8 on Oct 5, estimated max 183.7.', 'Bench PR: 145x8'), PACKS.sam, { calls: [{ name: 'exercise_history', input: { exercise: 'bench' } }], results: [{ prs: { heaviest: '145 lbs x8 on 2026-10-05', bestEstimated1RM: '183.7 lbs on 2026-10-05' } }] });
  assert.equal(pr.score, 1);
  assert.equal(scoreCoachCase(bench, reply('145x8 on Oct 5, estimated max 183.7.', 'Bench PR: 145x8'), PACKS.sam, { calls: [{ name: 'exercise_history', input: {} }], results: [] }).invented.join(), '183.7');
  // The pack answers "how's my week": a tool call is a miss
  const week = cases.find((c) => c.id === 'progress-week')!;
  assert.deepEqual(scoreCoachCase(week, reply('6 days since your last workout.', 'Six days off'), PACKS.sam, run).checks.filter((k) => !k.pass).map((k) => k.name), ['answers from the pack']);
  // Memory: the right kind, and nothing when nothing was said; mustNot reads the card too
  const dairy = cases.find((c) => c.id === 'memory-dairy')!;
  const rem = (kind: string, meals = '[{"label":"Breakfast","items":["3 eggs","2 slices whole wheat toast"]}]') => reply('Eggs and toast, then a banana.', 'Eggs and toast').replace(/}$/, `,"remember":{"kind":"${kind}","text":"no dairy","quote":"I've gone dairy free"},"meals":${meals}}`);
  assert.equal(scoreCoachCase(dairy, rem('food'), PACKS.sam).score, 1);
  assert.deepEqual(scoreCoachCase(dairy, rem('preference'), PACKS.sam).checks.filter((k) => !k.pass).map((k) => k.name), ['remembers (food)']);
  assert.deepEqual(scoreCoachCase(dairy, rem('food', '[{"label":"Breakfast","items":["1 cup greek yogurt"]}]'), PACKS.sam).checks.filter((k) => !k.pass).map((k) => k.name), [`card never ${dairy.cardMustNot![0]}`]);
  // The text and the fact to remember may say what it avoids; only the meals are held to it
  assert.equal(scoreCoachCase(dairy, rem('food').replace('"text":"no dairy"', '"text":"no dairy: no milk or yogurt"'), PACKS.sam).score, 1);
  assert.equal(scoreCoachCase(dairy, rem('food').replace('Eggs and toast, then a banana.', 'No yogurt or milk: eggs and toast, then a banana.'), PACKS.sam).score, 1);
  const nothing = cases.find((c) => c.id === 'memory-nothing')!;
  assert.deepEqual(scoreCoachCase(nothing, rem('food'), PACKS.sam).checks.filter((k) => !k.pass).map((k) => k.name), ['remembers nothing']);
});

test('each failing check is named', () => {
  const s = scoreCoachCase(example, reply('Great to see you back! Log your weights next time. Try 170x5 and ' + 'word '.repeat(80) + '\n- Squat', 'A long headline that runs well past eight words', ['a']), PACKS.sam);
  assert.deepEqual(s.checks.filter((k) => !k.pass).map((k) => k.name), [
    'numbers from the pack or tools', 'no exclamation marks', 'no nagging', 'headline ≤ 8 words', '≤ 80 words before a list', 'three chips', 'shows a workout', 'says /\\b(165|10%|lighter)\\b/i',
  ]);
  assert.deepEqual(s.invented, ['170']);
  assert.deepEqual(scoreCoachCase(example, 'nothing useful', PACKS.sam).checks[0], { name: 'readable', pass: false, detail: 'no headline' });
});

test('a pain question needs the see-someone line and no named condition', () => {
  const good = scoreCoachCase(knee, reply("Sharp or swelling pain means a physio should look at it. Meanwhile, leg press in a pain-free range and keep the RDL.", 'Have it looked at, train around it'), PACKS.sam);
  assert.equal(good.score, 1);
  const bad = scoreCoachCase(knee, reply('Sounds like patellar tendinitis. Swap squats for leg press.', 'Patellar tendinitis, probably'), PACKS.sam);
  assert.deepEqual(bad.checks.filter((k) => !k.pass).map((k) => k.name), ['see someone', 'never /\\b(tendinitis|tendonitis|meniscus|patellar|bursitis|arthritis)\\b/i']);
});

test('every case names a fixture user and has a unique id', () => {
  const ids = new Set<string>();
  for (const c of [...cases, ...holdout]) {
    assert.ok(PACKS[c.user], c.id);
    assert.equal(ids.has(c.id), false, c.id);
    ids.add(c.id);
  }
  assert.equal(cases.length, 42);
  assert.equal(holdout.length, 19);
});
