// Deterministic checks on one coach answer. Every case runs the fixed checks from the plan's guardrail
// table (numbers only from the pack, the tool results and the knowledge, no "!", no nagging, brief,
// three chips, the see-someone line on pain) plus the case's own must / mustNot, the tools it had to
// call (or not) and the card or memory it had to carry. A score is checks passed ÷ checks run.
import { inventedNumbers, NAG } from '../../services/insights.ts';
import { SEE_SOMEONE } from '../../services/coachGuards.ts';
import { KNOWLEDGE, readCoachReply, type CoachReply } from '../../server/src/coach.ts';
import type { CoachCase } from './cases.ts';
import { PREFS } from './fixture.ts';

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

// What happened on the way to the answer: the tool calls the model made and what they returned
export interface ToolRun {
  calls: { name: string; input: unknown }[];
  results: unknown[];
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

// The cards' text, for must / mustNot: exercise names and notes, meal foods, the fact to remember.
// `itemsOnly` keeps just what would be saved (exercise names, meal foods): notes may say what is avoided.
const cardText = (r: CoachReply, itemsOnly = false) =>
  [
    ...(r.workout ? (itemsOnly ? r.workout.exercises.map((e) => e.name) : [r.workout.name, r.workout.why, ...r.workout.exercises.flatMap((e) => [e.name, e.note ?? ''])]) : []),
    ...(r.meals ?? []).flatMap((m) => (itemsOnly ? m.items : [m.label, m.note ?? '', ...m.items])),
    ...(!itemsOnly && r.remember ? [r.remember.text, r.remember.quote] : []),
  ].join('\n');

export function scoreCoachCase(c: CoachCase, text: string, pack: unknown, run: ToolRun = { calls: [], results: [] }): CaseScore {
  const reply = readCoachReply(text);
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, ...(detail ? { detail } : {}) });
  add('readable', !!reply && !!reply.headline, reply ? 'no headline' : 'no answer');
  if (!reply) return { reply, checks, score: 0, invented: [] };
  const prose = `${reply.headline}\n${reply.answer}\n${reply.fromLog}`;
  // A suggested weight is a fact about the log too; sets, reps and meal amounts are prescriptions
  const weights = (reply.workout?.exercises ?? []).flatMap((e) => (e.weight === undefined ? [] : [String(e.weight)])).join(' ');
  const invented = inventedNumbers(`${prose}\n${weights}`, { pack, knowledge: KNOWLEDGE, question: c.question, tools: run.results });
  add('numbers from the pack or tools', invented.length === 0, invented.join(', '));
  add('no exclamation marks', !prose.includes('!'));
  add('no nagging', !NAG.test(prose), prose.match(NAG)?.[0]);
  add('headline ≤ 8 words', words(reply.headline) <= MAX_HEADLINE_WORDS, `${words(reply.headline)} words`);
  add('≤ 80 words before a list', words(beforeList(reply.answer)) <= MAX_WORDS_BEFORE_LIST, `${words(beforeList(reply.answer))} words`);
  add('three chips', reply.chips.length === 3, `${reply.chips.length} chips`);
  if (c.category === 'red-flags') add('see someone', SEE_SOMEONE.test(reply.answer));
  const called = run.calls.map((k) => k.name);
  for (const want of c.mustCall ?? []) add(`calls ${want}`, want.split('|').some((n) => called.includes(n)), called.join(', ') || 'no tools');
  if (c.noTools) add('answers from the pack', called.length === 0, called.join(', '));
  if (c.card === 'workout') add('shows a workout', !!reply.workout);
  if (c.card === 'meals') add('shows meals', !!reply.meals);
  // With food preferences every meal carries the price and minutes estimates, inside the cooking time
  if (c.user === 'prefs' && reply.meals) {
    add('meals carry price and minutes', reply.meals.every((m) => m.price !== undefined && m.minutes !== undefined), reply.meals.map((m) => `${m.label}: $${m.price ?? '?'} ${m.minutes ?? '?'} min`).join('; '));
    add('within cooking time', reply.meals.every((m) => m.minutes === undefined || m.minutes <= PREFS.cooking!), reply.meals.map((m) => `${m.minutes ?? '?'} min`).join(', '));
  }
  if (c.remember) add(`remembers (${c.remember})`, reply.remember?.kind === c.remember, reply.remember ? `${reply.remember.kind}: ${reply.remember.text}` : 'nothing');
  if (c.noRemember) add('remembers nothing', !reply.remember, reply.remember?.text);
  const all = `${prose}\n${cardText(reply)}`;
  for (const re of c.must ?? []) add(`says ${re}`, re.test(all));
  for (const re of c.mustNot ?? []) add(`never ${re}`, !re.test(all), all.match(re)?.[0]);
  // What it avoids may be named in a note or the fact it offers to remember ("no dairy"); the foods and exercises may not hold it
  const card = cardText(reply, true);
  for (const re of c.cardMustNot ?? []) add(`card never ${re}`, !re.test(card), card.match(re)?.[0]);
  return { reply, checks, score: checks.filter((k) => k.pass).length / checks.length, invented };
}
