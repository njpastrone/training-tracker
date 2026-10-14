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
  const s = scoreCoachCase(example, reply('Six days off after nine weeks at four a week, so nothing is lost. Legs have rested longest and your last squat day felt heavy, so start there 10% lighter.\nSquat 165x5 ×3\nRomanian Deadlift 150x8 ×3\nLeg Press'), PACKS.sam);
  assert.deepEqual(s.checks.filter((k) => !k.pass), []);
  assert.equal(s.score, 1);
});

test('each failing check is named', () => {
  const s = scoreCoachCase(example, reply('Great to see you back! Log your weights next time. Try 170x5 and ' + 'word '.repeat(80) + '\n- Squat', 'A long headline that runs well past eight words', ['a']), PACKS.sam);
  assert.deepEqual(s.checks.filter((k) => !k.pass).map((k) => k.name), [
    'numbers from the pack', 'no exclamation marks', 'no nagging', 'headline ≤ 8 words', '≤ 80 words before a list', 'three chips', 'says /\\b(165|10%|lighter)\\b/i',
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
  assert.equal(cases.length, 24);
  assert.equal(holdout.length, 10);
});
