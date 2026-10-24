import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_REMINDER, buildCoachRequest, COACH_MODEL, KNOWLEDGE, readCoachReply, validThread } from './coach.ts';

const pack = { training: { daysSinceLastWorkout: 6 } };
const ask = (q: string) => [{ role: 'user' as const, content: q }];

test('a coach request caches the prompt and the pack separately and asks for the refusal fallback', () => {
  const req = buildCoachRequest(pack, ask('how is my week?'), { date: '2026-10-08', unit: 'lbs' });
  assert.equal(req.model, COACH_MODEL);
  assert.equal(req.fallbacks, 'default');
  assert.deepEqual(req.output_config, { effort: 'low' });
  assert.equal(req.system.length, 2);
  assert.ok(req.system[0].text.includes('<knowledge>'));
  assert.ok(req.system[0].text.includes(KNOWLEDGE));
  assert.deepEqual(req.system[0].cache_control, { type: 'ephemeral' });
  assert.match(req.system[1].text, /Today: 2026-10-08\. Weight unit: lbs\.\n<pack>\{"training":\{"daysSinceLastWorkout":6\}\}<\/pack>/);
  assert.deepEqual(req.system[1].cache_control, { type: 'ephemeral' });
  assert.deepEqual(req.messages, [{ role: 'user', content: 'how is my week?' }]);
  assert.equal('temperature' in req, false); // 5.x models take only their default
});

test('readCoachReply reads the JSON, tolerates prose around it, and keeps a plain-text reply', () => {
  const json = '{"headline":"Start lower, a bit lighter","answer":"Six days off.","fromLog":"6 days since","chips":["Upper instead","Why 10% off?","Make it 30 minutes","extra"],}';
  assert.deepEqual(readCoachReply(`Here you go:\n${json}\nDone.`), {
    headline: 'Start lower, a bit lighter', answer: 'Six days off.', fromLog: '6 days since', chips: ['Upper instead', 'Why 10% off?', 'Make it 30 minutes'],
  });
  assert.deepEqual(readCoachReply('Just start with legs.'), { headline: '', answer: 'Just start with legs.', fromLog: '', chips: [] });
  assert.equal(readCoachReply(''), null);
  assert.equal(readCoachReply('{"headline":"x","answer":""}'), null);
  assert.deepEqual(readCoachReply('{"answer":"ok","chips":"no"}'), { headline: '', answer: 'ok', fromLog: '', chips: [] });
});

test('validThread accepts a user-first, alternating, user-last thread within the caps', () => {
  assert.equal(validThread(ask('hi')), true);
  assert.equal(validThread([...ask('hi'), { role: 'assistant', content: '{}' }, { role: 'user', content: 'more' }]), true);
  assert.equal(validThread([]), false);
  assert.equal(validThread('hi'), false);
  assert.equal(validThread([{ role: 'assistant', content: 'x' }]), false);
  assert.equal(validThread([...ask('hi'), { role: 'assistant', content: 'x' }]), false); // ends on the assistant
  assert.equal(validThread([...ask('hi'), { role: 'user', content: 'x' }, { role: 'user', content: 'y' }]), false);
  assert.equal(validThread(ask(' ')), false);
  assert.equal(validThread(ask('x'.repeat(2001))), false);
  assert.equal(validThread([...ask('hi'), { role: 'assistant', content: 'x'.repeat(6001) }, ...ask('more')]), false);
  assert.equal(validThread(Array.from({ length: 31 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }))), false);
});

test('validThread accepts one tool round as blocks, every call answered, and nothing else', () => {
  const use = (id: string, name = 'exercise_history', input: unknown = { exercise: 'squat' }) => ({ type: 'tool_use', id, name, input });
  const result = (id: string, content = '{"exercise":"Squat"}') => ({ type: 'tool_result', tool_use_id: id, content });
  const thinking = { type: 'thinking', thinking: '', signature: 'abc' };
  const round = (model: unknown[], results: unknown[]) => [...ask('how is my squat?'), { role: 'assistant', content: model }, { role: 'user', content: results }];
  assert.equal(validThread(round([thinking, { type: 'text', text: 'Looking.' }, use('t1')], [result('t1')])), true);
  assert.equal(validThread(round([use('t1'), use('t2', 'food_patterns', {})], [result('t2'), result('t1')])), true); // any order, all answered
  assert.equal(validThread(round([use('t1')], [{ ...result('t1'), is_error: true }])), true);
  assert.equal(validThread([{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }, ...round([use('t1')], [result('t1')])]), true); // after an earlier question
  assert.equal(validThread(round([use('t1'), use('t2')], [result('t1')])), false); // a call left unanswered
  assert.equal(validThread(round([use('t1')], [result('t1'), result('t9')])), false); // an answer to nothing
  assert.equal(validThread(round([use('t1', 'drop_table')], [result('t1')])), false); // not a coach tool
  assert.equal(validThread(round([use('t1')], [result('t1', 'x'.repeat(4001))])), false); // too big a result
  assert.equal(validThread(round([{ type: 'image', source: {} }], [])), false);
  assert.equal(validThread(round([use('t1')], [{ type: 'text', text: 'hi' }])), false); // a user turn of blocks holds only results
  assert.equal(validThread([...ask('q'), { role: 'assistant', content: [use('t1')] }, { role: 'user', content: 'another question' }]), false); // a string can't answer a call
});

test('readCoachReply reads a suggested workout, meals and a thing to remember, and drops malformed ones', () => {
  const full = readCoachReply(JSON.stringify({
    headline: 'Start lower, a bit lighter', answer: 'Six days off.', fromLog: '', chips: ['a', 'b', 'c'],
    workout: { name: 'Lower A, lighter', when: 'tomorrow', why: 'legs rested longest', exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 165, note: 'was 185x5 on Oct 6' }, { name: 'Leg Press', sets: 3, reps: '8-12' }, { name: '', sets: 3, reps: 5 }] },
    meals: [{ label: 'Lunch', items: ['200 g chicken breast', '1.5 cups white rice'], note: 'your usual', price: 8.6, minutes: 15 }, { label: 'Empty', items: [] }, { label: 'Odd', items: ['2 eggs'], price: 'cheap', minutes: -5 }],
    remember: { kind: 'food', text: 'no dairy', quote: 'I do not eat dairy' },
  }))!;
  assert.deepEqual(full.workout, { name: 'Lower A, lighter', when: 'tomorrow', why: 'legs rested longest', exercises: [{ name: 'Squat', sets: 3, reps: 5, weight: 165, note: 'was 185x5 on Oct 6' }, { name: 'Leg Press', sets: 3, reps: '8-12' }] });
  assert.deepEqual(full.meals, [{ label: 'Lunch', items: ['200 g chicken breast', '1.5 cups white rice'], note: 'your usual', price: 9, minutes: 15 }, { label: 'Odd', items: ['2 eggs'] }]);
  assert.deepEqual(full.remember, { kind: 'food', text: 'no dairy', quote: 'I do not eat dairy' });
  const bad = readCoachReply('{"headline":"h","answer":"a","fromLog":"","chips":[],"workout":{"exercises":"squat"},"meals":"chicken","remember":{"kind":"mood","text":"tired"}}')!;
  assert.equal('workout' in bad, false);
  assert.equal('meals' in bad, false);
  assert.equal('remember' in bad, false);
  for (const quote of [undefined, '', '  ', 7]) {
    const r = readCoachReply(JSON.stringify({ answer: 'ok', remember: { kind: 'food', text: 'no dairy', quote } }))!;
    assert.equal('remember' in r, false, String(quote));
  }
});

test('tool results go up with a reminder to answer in JSON; the thread itself is left alone', () => {
  const thread = [...ask('how is my squat?'), { role: 'assistant' as const, content: [{ type: 'tool_use', id: 't1', name: 'exercise_history', input: { exercise: 'squat' } }] }, { role: 'user' as const, content: [{ type: 'tool_result', tool_use_id: 't1', content: '{}' }] }];
  const req = buildCoachRequest(pack, thread, { date: '2026-10-08', unit: 'lbs' });
  assert.deepEqual(req.messages[2].content, [{ type: 'tool_result', tool_use_id: 't1', content: '{}' }, { type: 'text', text: ANSWER_REMINDER }]);
  assert.equal(thread[2].content.length, 1);
  assert.equal(buildCoachRequest(pack, ask('hi'), { date: '2026-10-08', unit: 'lbs' }).messages[0].content, 'hi');
});

test('the coach request declares the read tools with strict schemas', () => {
  const req = buildCoachRequest(pack, ask('what did I do on Tuesday?'), { date: '2026-10-08', unit: 'lbs' });
  assert.deepEqual(req.tools.map((t) => t.name), ['query_workouts', 'exercise_history', 'muscle_volume', 'food_log', 'food_patterns', 'estimate_meal']);
  for (const t of req.tools) {
    assert.equal(t.strict, true);
    assert.equal(t.input_schema.additionalProperties, false);
    assert.deepEqual(t.input_schema.required, Object.keys(t.input_schema.properties));
  }
  assert.equal('tool_choice' in req, false); // the Worker turns tools off after the tool round
});
