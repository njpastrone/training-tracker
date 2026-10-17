import { inventedNumbers, NAG } from './insights';
import type { CoachReply } from '../server/src/coach';

// Checks on every coach answer before it's shown (data/lifttext-agentic/report.md §2.7). The prompt
// says the same things; these hold whatever the model writes. They match words and numbers, not
// meaning: a guard, not proof.

// A question about pain, injury or symptoms: the answer must send the user to someone who can look
export const RED_FLAG = /\b(pain|painful|hurts?|hurting|ache|aching|injur(?:y|ed|ies)|dizz(?:y|iness)|faint(?:ed|ing)?|numb(?:ness)?|tingl(?:y|ing)|swollen|swelling|chest (?:pain|tight|tightness|pressure)|popp?(?:ed)?|tore|torn|strain(?:ed)?|sprain(?:ed)?|nausea|nauseous|blacked out)\b/i;
export const SEE_SOMEONE = /\b(doctor|physio|physical therapist|physiotherapist|professional|medical|urgent care|emergency|clinician|GP)\b/i;
export const RED_FLAG_LINE = "I can't tell what's going on from here. Sharp pain, swelling, numbness, chest pain or dizziness means stop and have a doctor or physio look at it. This is general training information, not medical advice.";

// A calorie target under the floor (1,200 kcal for women, 1,500 for men) is never suggested
// A daily number only, read from what sits next to it: per-meal and per-food kcal ("about 330 kcal",
// "aim for 400 kcal at breakfast") and a surplus or deficit ("300 calories above maintenance") are left alone
const KCAL = String.raw`(\d{1,3}(?:,\d{3})?|\d{3,4})\s*(?:kcal|calories|cals?)\b`;
const NOT_DAILY = String.raw`(?!\s*(?:at|for|per|with|each)\s+(?:(?:a|an|each|every|your|the|one)\s+)?(?:breakfast|lunch|dinner|meals?|snacks?)\b|\s*(?:(?:a|per|each)\s+day\s+|daily\s+)?(?:(?:above|below|over|under)\s+maintenance|surplus|deficit)\b)`;
const CALORIE_TARGET = new RegExp(
  String.raw`(?<=\b(?:target|goal|aim for|cut to|down to|drop to|stick to|eat)(?:\s+(?:of|is|at|to|around|about|under|below))*\s+)${KCAL}${NOT_DAILY}|\b${KCAL}${NOT_DAILY}\s*(?:(?:a|per|each)\s+day|daily|\/\s*day)\b`,
  'gi',
);
const CALORIE_FLOOR = 1500;
const FLOOR_LINE = 'A calorie target that low needs a professional to set it.';

const sentences = (text: string) => text.split(/(?<=[.?!])\s+/);
const rejoin = (lines: string[][]) => lines.map(s => s.join(' ')).join('\n');
// Applies f to each sentence of each line; a sentence f returns '' for is dropped
const mapSentences = (text: string, f: (s: string) => string) => rejoin(text.split('\n').map(line => sentences(line).map(f).filter(Boolean)));

const lowCalorie = (s: string) => [...s.matchAll(CALORIE_TARGET)].some(m => Number((m[1] ?? m[2]).replace(',', '')) < CALORIE_FLOOR);

// What a card shows the user in words, so its numbers are held to the same rule as the answer's
const cardText = (r: CoachReply) =>
  [r.workout?.name, r.workout?.why, ...(r.workout?.exercises.map(e => e.note) ?? []), ...(r.meals?.flatMap(m => [m.label, m.note]) ?? []), r.remember?.text, r.remember?.quote]
    .filter(Boolean)
    .join('\n');

// Lowercase, one kind of quote mark, single spaces, no punctuation or quote marks at the ends
const words = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/^[\s"'.,!?]+|[\s"'.,!?]+$/g, '');

// The answer with the fixed rules applied, and the numbers it or its cards say that appear nowhere in
// what the model was given (the pack, the knowledge, the question): the caller decides what to do with
// those. A thing to remember stays only when its quote is the user's own words, from this question or
// an earlier one (`asked`).
export function checkReply(reply: CoachReply, question: string, given: unknown, asked: string[] = []): { reply: CoachReply; invented: string[] } {
  const tidy = (text: string) =>
    mapSentences(text.replace(/!/g, '.'), s => (NAG.test(s) ? '' : lowCalorie(s) ? FLOOR_LINE : s));
  let answer = tidy(reply.answer);
  if (RED_FLAG.test(question) && !SEE_SOMEONE.test(answer)) answer = `${RED_FLAG_LINE}\n${answer}`;
  const { remember, ...rest } = reply;
  const said = remember && words(remember.quote) && [question, ...asked].some(q => words(q).includes(words(remember.quote)));
  const out = { ...rest, headline: reply.headline.replace(/!/g, ''), answer, fromLog: tidy(reply.fromLog), ...(said ? { remember } : {}) };
  return { reply: out, invented: inventedNumbers(`${out.headline}\n${out.answer}\n${out.fromLog}\n${cardText(out)}`, given) };
}

// Drops every sentence that holds one of the invented numbers: from the answer, a card's why and notes;
// the headline, a workout's name and a meal's label go if they do, and so does a thing to remember
export function stripInvented(reply: CoachReply, invented: string[]): CoachReply {
  if (!invented.length) return reply;
  const has = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).some(n => invented.includes(n));
  const strip = (text: string) => mapSentences(text, s => (has(s) ? '' : s));
  const { workout, meals, remember, ...rest } = reply;
  return {
    ...rest,
    headline: has(reply.headline) ? '' : reply.headline,
    answer: strip(reply.answer),
    fromLog: strip(reply.fromLog),
    ...(workout ? { workout: { ...workout, name: has(workout.name) ? 'Suggested workout' : workout.name, why: strip(workout.why), exercises: workout.exercises.map(e => ({ ...e, note: e.note && strip(e.note) })) } } : {}),
    ...(meals ? { meals: meals.map(m => ({ ...m, label: has(m.label) ? 'Meal' : m.label, note: m.note && strip(m.note) })) } : {}),
    ...(remember && !has(`${remember.text} ${remember.quote}`) ? { remember } : {}),
  };
}
