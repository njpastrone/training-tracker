import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachRequest, COACH_MODEL, KNOWLEDGE, readCoachReply, validThread } from './coach.ts';

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
  assert.equal(validThread(Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }))), false);
});
