/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatItem } from '../stores/chatStore';

// In-memory AsyncStorage so the real store runs under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});

const { coachThread, needsStamp, chartFor } = await import('./thread');
const { useChatStore } = await import('../stores/chatStore');

const now = new Date(2026, 9, 17, 18, 0);
const reply = { headline: '', answer: 'a', fromLog: '', chips: [] };
const answer = (n: number, at: Date): ChatItem => ({ id: `a${n}`, at: at.toISOString(), kind: 'answer', question: `q${n}`, turn: { reply, raw: `r${n}` } });
const at = (h: number, m = 0, day = 17) => new Date(2026, 9, day, h, m);

test("coachThread sends only today's answers, the last 6 pairs, oldest first", () => {
  const items: ChatItem[] = [answer(0, at(20, 0, 16)), ...Array.from({ length: 8 }, (_, i) => answer(i + 1, at(9, i)))];
  const thread = coachThread(items, now);
  assert.equal(thread.length, 12);
  assert.deepEqual(thread.slice(0, 2), [{ role: 'user', content: 'q3' }, { role: 'assistant', content: 'r3' }]);
  assert.deepEqual(thread.at(-1), { role: 'assistant', content: 'r8' });
});

test("coachThread leaves out yesterday's answers", () => {
  assert.deepEqual(coachThread([answer(0, at(23, 0, 16))], now), []);
});

test('needsStamp: first item, then a gap of 30 minutes or more', () => {
  const you = (d: Date): ChatItem => ({ id: d.toISOString(), at: d.toISOString(), kind: 'you', text: 'x' });
  assert.equal(needsStamp(undefined, you(at(9))), true);
  assert.equal(needsStamp(you(at(9)), you(at(9, 29))), false);
  assert.equal(needsStamp(you(at(9)), you(at(9, 30))), true);
});

test('chartFor picks the one lift a question names, else none', () => {
  const trends = [{ id: 'bench-press', lift: 'Bench Press' }, { id: 'squat', lift: 'Squat' }];
  assert.equal(chartFor('is my bench stuck?', trends), 'bench-press');
  assert.equal(chartFor('How is my SQUAT going', trends), 'squat');
  assert.equal(chartFor('bench or squat today?', trends), undefined);
  assert.equal(chartFor("how's my protein?", trends), undefined);
  assert.equal(chartFor('benches near me', trends), undefined); // whole words only
});

test('the store adds, patches an answer and clears', () => {
  const s = () => useChatStore.getState();
  s().add({ kind: 'you', text: 'is my bench stuck?' }, { kind: 'answer', question: 'is my bench stuck?', turn: { reply, raw: 'r' } });
  const id = s().items[1].id;
  assert.ok(s().items[0].id && s().items[0].at);
  s().patch(id, { planned: '2026-10-18' });
  const item = s().items[1];
  assert.equal(item.kind === 'answer' && item.turn.planned, '2026-10-18');
  assert.equal(item.kind === 'answer' && item.turn.raw, 'r');
  s().skipOpener('2026-10-17');
  s().clear();
  assert.deepEqual(s().items, []);
  assert.equal(s().skippedOpener, undefined);
});
