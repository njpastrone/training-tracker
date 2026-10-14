/// <reference types="node" />
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

const { useWorkoutStore } = await import('../stores/workoutStore');
const { askCoach, CANT_HELP, looksLikeQuestion, readsAsQuestion } = await import('./ask');
const { SAM, SAM_NOW, SAM_SETTINGS } = await import('./coachPack.fixtures');
const { COACH_MODEL } = await import('../server/src/coach');

process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
let sent: Record<string, any>[] = [];
let replies: string[] = [];
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  sent.push(JSON.parse(init.body as string));
  return new Response(JSON.stringify({ text: replies.shift() ?? '' }), { status: 200 });
}) as typeof fetch;

const answer = (a: string, extra = '') => `{"headline":"Start lower, a bit lighter","answer":"${a}","fromLog":"6 days since your last workout","chips":["Upper instead","Why 10% off?","Make it 30 minutes"]${extra}}`;

beforeEach(() => {
  sent = [];
  replies = [];
  useWorkoutStore.setState({ workouts: SAM.workouts, foodEntries: SAM.foodEntries, settings: SAM_SETTINGS, exerciseLibrary: SAM.library });
});

test('a question goes to the Worker in coach mode with the pack, the thread and the date', async () => {
  replies = [answer('Six days off after 9 weeks at 4 a week. Squat 165x5, 10% off 185x5.')];
  const { reply } = await askCoach("I've taken a few days off. What should I start with?", [], SAM_NOW);
  assert.equal(sent.length, 1);
  const { coach, system, messages } = sent[0];
  assert.equal(coach.date, '2026-10-12');
  assert.equal(coach.unit, 'lbs');
  assert.equal(coach.pack.training.daysSinceLastWorkout, 6);
  assert.deepEqual(coach.messages, [{ role: 'user', content: "I've taken a few days off. What should I start with?" }]);
  // Older Workers read these instead and still answer from the pack
  assert.match(system, /<knowledge>[\s\S]*<pack>/);
  assert.equal(messages[0].content, "I've taken a few days off. What should I start with?");
  assert.equal(COACH_MODEL, 'claude-sonnet-5-5');
  assert.equal(reply.headline, 'Start lower, a bit lighter');
  assert.equal(reply.answer, 'Six days off after 9 weeks at 4 a week. Squat 165x5, 10% off 185x5.');
  assert.deepEqual(reply.chips, ['Upper instead', 'Why 10% off?', 'Make it 30 minutes']);
});

test('a follow-up sends the thread with the model\'s own earlier reply', async () => {
  const first = answer('Start lower.');
  replies = [answer('Upper then: bench 150x8.')];
  await askCoach('Upper instead', [{ role: 'user', content: 'what first?' }, { role: 'assistant', content: first }], SAM_NOW);
  assert.deepEqual(sent[0].coach.messages.map((m: { role: string }) => m.role), ['user', 'assistant', 'user']);
  assert.equal(sent[0].coach.messages[1].content, first);
});

test('an invented number costs no second call: its sentence goes', async () => {
  replies = [answer('Try 170x5 today. Keep the reps.')];
  const { reply, raw } = await askCoach('what should I squat?', [], SAM_NOW);
  assert.equal(sent.length, 1);
  assert.equal(reply.answer, 'Keep the reps.');
  // The checked reply is what goes back in the thread, not the model's words
  assert.doesNotMatch(raw, /170/);
});

test("the coach's own earlier words don't vouch for a number; the user's do", async () => {
  replies = [answer('Because 170x5 fits. Keep the reps.')];
  const said = await askCoach('why that weight?', [{ role: 'user', content: 'what first?' }, { role: 'assistant', content: answer('Try 170x5.') }], SAM_NOW);
  assert.equal(said.reply.answer, 'Keep the reps.');
  replies = [answer('Then 170x5 is fine. Keep the reps.')];
  const mine = await askCoach('ok', [{ role: 'user', content: 'can I do 170?' }, { role: 'assistant', content: answer('Start lower.') }], SAM_NOW);
  assert.equal(mine.reply.answer, 'Then 170x5 is fine. Keep the reps.');
});

test('an empty or unreadable reply, or one with nothing left, becomes the fixed message', async () => {
  replies = [''];
  assert.deepEqual((await askCoach('hello', [], SAM_NOW)).reply, CANT_HELP);
  replies = [answer('Go 170x5.')];
  assert.deepEqual((await askCoach('what should I squat?', [], SAM_NOW)).reply, CANT_HELP);
  assert.equal(sent.length, 2);
});

test('questions read as questions; logs do not', () => {
  for (const q of [
    "I've taken a few days off. what should i start with to get back on track?",
    'based on what you know i like to eat, can you suggest some high protein meals for me today',
    "how's my bench going?",
    'what should I squat today',
    'did I train legs this week?',
    'Why did squats feel heavy?',
  ]) assert.equal(readsAsQuestion(q), true, q);
  for (const log of [
    'bench 3x8 at 135, rows 3x10',
    'did legs today, squats and lunges',
    'ran 3 miles',
    'how about 3x5 at 225', // looks like a question but carries a set scheme
    '2 eggs and toast',
    'chest and back: bench, rows, pull-ups',
    'took a long walk after dinner',
    'i took creatine this morning',
    'help me log: squats and bench',
    'been away a week, back today with squats and bench',
    'any cardio counts: ran on the treadmill',
    "I haven't logged Monday: legs and abs",
    'steak tips and rice',
  ]) assert.equal(readsAsQuestion(log), false, log);
  assert.equal(looksLikeQuestion('is my bench stalling'), true);
  assert.equal(looksLikeQuestion('ate a lot today'), false);
});
