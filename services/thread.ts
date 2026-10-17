import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import type { CoachMessage } from '../server/src/coach';
import type { ChatItem } from '../stores/chatStore';

// Pure helpers for the Chat tab's thread (stores/chatStore.ts)

const PAIRS_SENT = 6; // today's last question/answer pairs that go back with a new question
const STAMP_GAP_MINUTES = 30;

// What the coach hears of the thread: only today's answers, the last 6, oldest first
export function coachThread(items: ChatItem[], now: Date): CoachMessage[] {
  return items
    .filter((i): i is Extract<ChatItem, { kind: 'answer' }> => i.kind === 'answer' && isSameDay(parseISO(i.at), now))
    .slice(-PAIRS_SENT)
    .flatMap((i) => [
      { role: 'user' as const, content: i.question },
      { role: 'assistant' as const, content: i.turn.raw },
    ]);
}

// A time stamp above the first item and after a 30-minute gap
export const needsStamp = (prev: ChatItem | undefined, next: ChatItem) =>
  !prev || differenceInMinutes(parseISO(next.at), parseISO(prev.at)) >= STAMP_GAP_MINUTES;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const names = (q: string, words: string) => new RegExp(`\\b${escape(words.toLowerCase())}\\b`).test(q);

// The lift a question is about, by its name or first word: only when exactly one matches, so a
// chart is never of the wrong lift
export function chartFor(question: string, trends: { id: string; lift: string }[]): string | undefined {
  const q = question.toLowerCase();
  const hits = trends.filter((t) => names(q, t.lift) || names(q, t.lift.split(/\s+/)[0]));
  return hits.length === 1 ? hits[0].id : undefined;
}
