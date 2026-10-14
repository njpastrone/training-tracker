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
const { askCoach, CANT_HELP, looksLikeQuestion, readsAsQuestion, routeComposer } = await import('./ask');
const { SAM, SAM_NOW, SAM_SETTINGS } = await import('./coachPack.fixtures');
const { COACH_MODEL } = await import('../server/src/coach');

process.env.EXPO_PUBLIC_API_URL = 'https://worker.test';
let sent: Record<string, any>[] = [];
// A reply is the model's text, or the content blocks of a tool-calling turn
let replies: (string | { content: unknown[] })[] = [];
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  sent.push(JSON.parse(init.body as string));
  const next = replies.shift() ?? '';
  const body = typeof next === 'string' ? { text: next, content: [{ type: 'text', text: next }], stop_reason: 'end_turn' } : { text: '', content: next.content, stop_reason: 'tool_use' };
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;
const toolUse = (id: string, name: string, input: unknown) => ({ content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id, name, input }] });

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

test('a tool call runs on the phone and goes back as a result under the same turn id; its numbers count as given', async () => {
  replies = [toolUse('t1', 'exercise_history', { exercise: 'squat' }), answer('Squat has held 185x5 for 4 sessions; the app suggests 165x7 and your best estimated max is 215.8.')];
  const { reply } = await askCoach("how's my squat going?", [], SAM_NOW);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].coach.turnId, sent[1].coach.turnId);
  assert.match(sent[0].coach.turnId, /^[0-9a-f-]{36}$/);
  const thread = sent[1].coach.messages;
  assert.deepEqual(thread.map((m: { role: string }) => m.role), ['user', 'assistant', 'user']);
  assert.deepEqual(thread[1].content, toolUse('t1', 'exercise_history', { exercise: 'squat' }).content); // echoed as returned, thinking included
  assert.equal(thread[2].content[0].type, 'tool_result');
  assert.equal(thread[2].content[0].tool_use_id, 't1');
  const result = JSON.parse(thread[2].content[0].content);
  assert.equal(result.exercise, 'Squat');
  assert.equal(result.next, '165x7 ×3');
  // 215.8 is in the tool result, not the pack: it stays
  assert.match(reply.answer, /215\.8/);
});

test('a bad tool call comes back as an error result and the loop stops at three calls', async () => {
  replies = [toolUse('t1', 'exercise_history', { exercise: 'kettlebell swings' }), toolUse('t2', 'food_patterns', {}), toolUse('t3', 'food_patterns', {})];
  const { reply } = await askCoach('how are my swings?', [], SAM_NOW);
  assert.equal(sent.length, 3);
  assert.equal(sent[1].coach.messages[2].content[0].is_error, true);
  assert.match(sent[1].coach.messages[2].content[0].content, /Nothing logged/);
  assert.deepEqual(reply, CANT_HELP);
});

test('a suggested workout and meals come back as cards made safe on the phone; a thing to remember waits for a tap', async () => {
  const card = { name: 'Lower A, lighter', when: 'today', why: 'legs rested longest', exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 165, note: 'was 185x5 on Oct 6' }, { name: 'Leg Press', sets: 3, reps: 10, weight: 999 }] };
  const meals = [{ label: 'Lunch', items: ['200 g chicken breast', '1.5 cups white rice'] }, { label: 'Snack', items: ['moon dust'] }];
  const remember = { kind: 'food', text: 'no dairy', quote: 'I avoid dairy' };
  replies = [answer('Legs first, lighter.', `,"workout":${JSON.stringify(card)},"meals":${JSON.stringify(meals)},"remember":${JSON.stringify(remember)}`)];
  const { cards } = await askCoach("what should I start with? I avoid dairy by the way", [], SAM_NOW);
  assert.equal(cards.workout!.name, 'Lower A, lighter');
  assert.equal(cards.workout!.exercises[0].exerciseId, 'squat');
  assert.equal(cards.workout!.exercises[0].weight, 165);
  assert.equal(cards.workout!.exercises[1].weight, undefined); // 999 appears nowhere the model was given
  assert.equal(cards.meals!.length, 1); // moon dust prices to nothing
  assert.equal(cards.meals![0].items.length, 2);
  assert.deepEqual(cards.remember, remember);
  assert.equal(useWorkoutStore.getState().settings.profile, undefined); // nothing saved yet
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
    'protein shake my coach recommended',
    'leg day my trainer suggested: squats, lunges',
    'can of tuna and rice for lunch',
    'Can of soup',
  ]) assert.equal(readsAsQuestion(log), false, log);
  assert.equal(looksLikeQuestion('is my bench stalling'), true);
  assert.equal(looksLikeQuestion('ate a lot today'), false);
});

test('the composer: a question goes to the coach only, a log to the parser only, an unplaced question to the parser then the coach', async () => {
  const route = async (text: string, found: string | null) => {
    const calls: string[] = [];
    const out = await routeComposer(text, async () => (calls.push('parser'), found), () => void calls.push('coach'));
    return { out, calls };
  };
  assert.deepEqual(await route('what should I squat today', null), { out: 'asked', calls: ['coach'] });
  assert.deepEqual(await route('bench 3x8 at 135', 'workout'), { out: 'workout', calls: ['parser'] });
  assert.deepEqual(await route('ate a lot today, what should I have for dinner', null), { out: 'asked', calls: ['parser', 'coach'] });
  assert.deepEqual(await route('asdf', null), { out: null, calls: ['parser'] });
  // Without a coach (no onQuestion) everything goes to the parser
  assert.equal(await routeComposer('what should I squat today', async () => null), null);
});
