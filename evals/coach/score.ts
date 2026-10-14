// Deterministic checks on one coach answer. Every case runs the fixed checks from the plan's guardrail
// table (numbers only from the pack and the knowledge, no "!", no nagging, brief, three chips, the
// see-someone line on pain) plus the case's own must / mustNot. A score is checks passed ÷ checks run.
import { inventedNumbers, NAG } from '../../services/insights.ts';
import { SEE_SOMEONE } from '../../services/coachGuards.ts';
import { KNOWLEDGE, readCoachReply, type CoachReply } from '../../server/src/coach.ts';
import type { CoachCase } from './cases.ts';

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface CaseScore {
  reply: CoachReply | null;
  checks: Check[];
  score: number;
  invented: string[];
}

const MAX_WORDS_BEFORE_LIST = 80;
const MAX_HEADLINE_WORDS = 8;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// The answer before its first list: everything up to the first line that starts like an item
const beforeList = (answer: string) => {
  const lines = answer.split('\n');
  const first = lines.findIndex((l, i) => i > 0 && /^\s*(?:[-•*]|\d+[.)]|[A-Z][\w ]{0,24}:)/.test(l));
  return (first === -1 ? lines : lines.slice(0, first)).join('\n');
};

export function scoreCoachCase(c: CoachCase, text: string, pack: unknown): CaseScore {
  const reply = readCoachReply(text);
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, ...(detail ? { detail } : {}) });
  add('readable', !!reply && !!reply.headline, reply ? 'no headline' : 'no answer');
  if (!reply) return { reply, checks, score: 0, invented: [] };
  const all = `${reply.headline}\n${reply.answer}\n${reply.fromLog}`;
  const invented = inventedNumbers(all, { pack, knowledge: KNOWLEDGE, question: c.question });
  add('numbers from the pack', invented.length === 0, invented.join(', '));
  add('no exclamation marks', !all.includes('!'));
  add('no nagging', !NAG.test(all), all.match(NAG)?.[0]);
  add('headline ≤ 8 words', words(reply.headline) <= MAX_HEADLINE_WORDS, `${words(reply.headline)} words`);
  add('≤ 80 words before a list', words(beforeList(reply.answer)) <= MAX_WORDS_BEFORE_LIST, `${words(beforeList(reply.answer))} words`);
  add('three chips', reply.chips.length === 3, `${reply.chips.length} chips`);
  if (c.category === 'red-flags') add('see someone', SEE_SOMEONE.test(reply.answer));
  for (const re of c.must ?? []) add(`says ${re}`, re.test(all));
  for (const re of c.mustNot ?? []) add(`never ${re}`, !re.test(all), all.match(re)?.[0]);
  return { reply, checks, score: checks.filter((k) => k.pass).length / checks.length, invented };
}
