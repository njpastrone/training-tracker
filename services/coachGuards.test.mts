/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReply, RED_FLAG, RED_FLAG_LINE, SEE_SOMEONE, stripInvented } from './coachGuards';
import { KNOWLEDGE } from '../server/src/coach';

const given = { pack: { lifts: [{ recent: ['2026-10-06 185x5'], lighter: { '10% off': 165 } }], food: { today: { leftToGoal: 136 } } }, knowledge: KNOWLEDGE };
const reply = (answer: string, headline = 'Start lower, a bit lighter', fromLog = '') => ({ headline, answer, fromLog, chips: ['a', 'b', 'c'] });

test('numbers from the pack and the knowledge pass; a number from nowhere is reported', () => {
  const ok = checkReply(reply('Six days off. Squat 165x5 (10% off 185x5 from Oct 6). 136 g protein to go.'), 'what should I start with?', given);
  assert.deepEqual(ok.invented, []);
  const bad = checkReply(reply('Try 170x5 and 4 sets of curls at 35.'), 'what should I start with?', given);
  assert.deepEqual(bad.invented, ['170', '35']); // 4 is in the knowledge ("4-6 week block"); 1-3 are never checked
});

test('a number the user said in the question is theirs to use', () => {
  assert.deepEqual(checkReply(reply('Five days off is nothing.'), 'took 5 days off, what now?', { ...given, question: 'took 5 days off, what now?' }).invented, []);
});

test('exclamation marks go, nagging sentences go, a calorie target under the floor is replaced', () => {
  const { reply: r } = checkReply(reply('Nice work! Log your weights next time so I can see more. Aim for 1,100 kcal a day. Keep the reps.', 'Great week!'), 'how am I doing', given);
  assert.equal(r.headline, 'Great week');
  assert.equal(r.answer, 'Nice work. A calorie target that low needs a professional to set it. Keep the reps.');
  for (const a of ['A goal of 1,100 calories is too low.', 'You could cut to 1,100 calories for a few weeks.', 'Drop down to 1,000 kcal.', 'Stick to 1,200 calories.', 'Aim for 1,100 calories.', 'Stick to 1,200 calories and spread protein across your meals.', 'Cut to 1,100 calories, with eggs at breakfast.'])
    assert.equal(checkReply(reply(a), 'q', given).reply.answer, 'A calorie target that low needs a professional to set it.', a);
});

test('per-meal and per-food kcal are not a daily target', () => {
  for (const a of ['Chicken and rice, about 330 kcal.', 'Eat about 300 calories above maintenance.', 'Chicken breast 200 g: 62 g protein, 330 kcal.', 'Aim for 2,400 kcal a day.', 'Aim for about 400 kcal at breakfast.', 'Aim for about 300 calories above maintenance.', 'Drop to 500 calories below maintenance', 'Eat 300 calories a day above maintenance.'])
    assert.equal(checkReply(reply(a), 'suggest some high protein meals for me today', given).reply.answer, a);
});

test('a question about pain gets the see-someone line when the answer forgot it', () => {
  assert.equal(RED_FLAG.test('my knee hurts when I squat'), true);
  assert.equal(RED_FLAG.test('what should I start with'), false);
  const { reply: r } = checkReply(reply('Swap squats for leg press for a week.'), 'my knee hurts when I squat', given);
  assert.equal(r.answer, `${RED_FLAG_LINE}\nSwap squats for leg press for a week.`);
  assert.ok(SEE_SOMEONE.test(r.answer));
  const kept = checkReply(reply('Have a physio look at it. Meanwhile, leg press.'), 'my knee hurts', given);
  assert.equal(kept.reply.answer, 'Have a physio look at it. Meanwhile, leg press.');
});

test('stripInvented drops the sentences and lines that hold the invented numbers, and the headline when it does', () => {
  const r = stripInvented(reply('Squat 165x5.\nThen 4 sets of curls at 35. Keep it short.', 'Go for 170 today', 'squat 185x5 on Oct 6'), ['170', '4', '35']);
  assert.deepEqual(r, { headline: '', answer: 'Squat 165x5.\nKeep it short.', fromLog: 'squat 185x5 on Oct 6', chips: ['a', 'b', 'c'] });
  assert.equal(stripInvented(reply('fine'), []).answer, 'fine');
});
