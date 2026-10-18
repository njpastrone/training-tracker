import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { buildCoachRequest, KNOWLEDGE, MAX_CALLS_PER_QUESTION, readCoachReply, type CoachMessage, type CoachReply, type ContentBlock, type Remember } from '../server/src/coach';
import { buildCoachPack } from './coachPack';
import { runTool } from './coachTools';
import { priceMeals, resolveWorkout, type MealCard, type WorkoutCard } from './coachCards';
import { checkReply, stripInvented } from './coachGuards';
import { callWorker } from './claude';
import { useWorkoutStore } from '../stores/workoutStore';

// The coach (Phase 1, data/lifttext-agentic/report.md): a question about your own training or food,
// answered by Claude from the context pack (services/coachPack.ts) and the read tools it asks for
// (services/coachTools.ts, run here on the phone), through the Worker's coach mode, then checked in
// code (services/coachGuards.ts). A suggested workout or meals come back as cards (services/coachCards.ts)
// that save only on a tap; a thing to remember is stored only on a tap.

export type { CoachMessage, CoachReply };

// What a question that isn't about the log, or a refusal, gets instead of nothing
export const CANT_HELP: CoachReply = {
  headline: '',
  answer: "I can't help with that one. Ask about your training or what you eat and I'll answer from your log.",
  fromLog: '',
  chips: [],
};

export interface CoachCards {
  workout?: WorkoutCard;
  meals?: MealCard[];
  remember?: Remember;
}

export interface Answer {
  reply: CoachReply; // the checked answer
  raw: string; // the assistant turn to send back with the next question
  cards: CoachCards;
}

// Asks the coach. `thread` is the earlier questions and the coach's checked replies, newest last. One
// question is one cap slot however many model calls it takes: the first call may ask for tools, which
// run here and go back as tool results; the next call answers. A sentence with a number from nowhere
// is dropped. Throws ApiError on a server refusal.
export async function askCoach(question: string, thread: CoachMessage[] = [], now: Date = new Date()): Promise<Answer> {
  const { workouts, foodEntries, settings, exerciseLibrary, schedule, templates } = useWorkoutStore.getState();
  const data = { workouts, foodEntries, settings, library: exerciseLibrary, schedule, templates };
  const pack = buildCoachPack(data, now);
  const options = { date: format(now, 'yyyy-MM-dd'), unit: settings.weightUnit };
  const req = buildCoachRequest(pack, [], options);
  // Workers deployed before coach mode read system/messages: they get the prompt, the pack and the question
  const system = req.system.map(b => b.text).join('\n\n');
  const messages: CoachMessage[] = [...thread, { role: 'user', content: question }];
  const turnId = uuidv4();
  const tools: unknown[] = []; // every tool result, so the guard counts their numbers as given
  let text = '';
  for (let call = 0; call < MAX_CALLS_PER_QUESTION; call++) {
    const res = await callWorker(system, question, req.max_tokens, { coach: { ...options, pack, messages, turnId } });
    const uses = (res.content ?? []).filter(b => b.type === 'tool_use') as (ContentBlock & { id: string; name: string; input: unknown })[];
    if (!uses.length || call === MAX_CALLS_PER_QUESTION - 1) {
      text = res.text;
      break;
    }
    const results: ContentBlock[] = uses.map(u => {
      const out = runTool(u.name, u.input, data, now);
      tools.push(out);
      return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out), ...(out.error ? { is_error: true } : {}) };
    });
    messages.push({ role: 'assistant', content: res.content! }, { role: 'user', content: results });
  }
  const read = readCoachReply(text);
  if (!read) return { reply: CANT_HELP, raw: JSON.stringify(CANT_HELP), cards: {} };
  // Only what the user said and what the tools returned count as given: the coach's own earlier words don't vouch for a number
  const asked = thread.flatMap(m => (m.role === 'user' && typeof m.content === 'string' ? [m.content] : []));
  const given = { pack, question, asked, tools, knowledge: KNOWLEDGE };
  const checked = checkReply(read, question, given, asked);
  const stripped = stripInvented(checked.reply, checked.invented);
  if (!stripped.answer.trim()) return { reply: CANT_HELP, raw: JSON.stringify(CANT_HELP), cards: {} };
  const cards: CoachCards = {
    ...(stripped.workout ? { workout: resolveWorkout(stripped.workout, exerciseLibrary, settings.weightUnit, given) } : {}),
    ...(stripped.meals ? { meals: priceMeals(stripped.meals, foodEntries) } : {}),
    ...(stripped.remember ? { remember: stripped.remember } : {}),
  };
  if (cards.meals && !cards.meals.length) delete cards.meals;
  return { reply: stripped, raw: JSON.stringify(stripped), cards };
}

// ---------------------------------------------------------------- routing
// A message typed into the Log or Progress composer that reads as a question goes to the coach
// before the parser is called (one coach slot). Text it can't place goes to the parser, and only when
// that finds nothing and it looksLikeQuestion does it go to the coach: the one two-slot path.

// A log: sets x reps, a weight or rep count, a time or distance
export const LOG_SHAPE = /\b\d+\s*[x×]\s*\d+\b|\b\d+(?:\.\d+)?\s*(?:lbs?|kg|kgs|kilos?|pounds?|reps?|sets?|mi|miles?|km|k|min|mins|minutes?)\b|@\s*\d/i;
// Question words that don't start logs ("did legs" is a log; "did I train legs?" ends with ?;
// "can of tuna" is a log, "can you" is not)
const OPENERS = /^(?:what|what's|whats|should|how|how's|hows|why|which|when|where|suggest|recommend)\b|\b(?:can|could|would) (?:i|you|we)\b/i;
const QUESTION_WORDS = /\?|\b(?:what|should|how|can|could|would|why|which|is|are|am|do|does|did|suggest|recommend|help|coach|advice|ideas?|tips?)\b/i;

// Sure enough to skip the parser: a question mark at the end, or a question word, and nothing log-shaped
export const readsAsQuestion = (text: string) => {
  const t = text.trim();
  return !LOG_SHAPE.test(t) && (/\?\s*$/.test(t) || OPENERS.test(t));
};

// After the parser found no workout and no food: a question word anywhere is enough to try the coach
export const looksLikeQuestion = (text: string) => QUESTION_WORDS.test(text);

// The composer's order: a question readsAsQuestion places goes to the coach and the parser is never
// called; anything else goes to the parser, and when that finds nothing, a looksLikeQuestion message
// goes to the coach too: the one residual path that costs two cap slots. 'asked' when the coach took it.
export async function routeComposer<P>(text: string, parse: () => Promise<P | null>, ask?: (question: string) => void): Promise<P | null | 'asked'> {
  if (ask && readsAsQuestion(text)) {
    ask(text);
    return 'asked';
  }
  const parsed = await parse();
  if (parsed || !ask || !looksLikeQuestion(text)) return parsed;
  ask(text);
  return 'asked';
}
