import { format } from 'date-fns';
import { buildCoachRequest, KNOWLEDGE, readCoachReply, type CoachMessage, type CoachReply } from '../server/src/coach';
import { buildCoachPack } from './coachPack';
import { checkReply, stripInvented } from './coachGuards';
import { callClaude } from './claude';
import { useWorkoutStore } from '../stores/workoutStore';

// The coach (Phase 0, data/lifttext-agentic/report.md): a question about your own training or food,
// answered by Claude from the context pack (services/coachPack.ts) through the Worker's coach mode,
// then checked in code (services/coachGuards.ts). No tools yet: the pack is all it knows.

export type { CoachMessage, CoachReply };

// What a question that isn't about the log, or a refusal, gets instead of nothing
export const CANT_HELP: CoachReply = {
  headline: '',
  answer: "I can't help with that one. Ask about your training or what you eat and I'll answer from your log.",
  fromLog: '',
  chips: [],
};

// Asks the coach. `thread` is the earlier questions and the coach's checked replies, newest last. One
// Worker call per question (one cap slot); a sentence with a number from nowhere is dropped. Returns
// the checked reply as the assistant turn to send back. Throws ApiError on a server refusal.
export async function askCoach(question: string, thread: CoachMessage[] = [], now: Date = new Date()): Promise<{ reply: CoachReply; raw: string }> {
  const { workouts, foodEntries, settings, exerciseLibrary, schedule, templates } = useWorkoutStore.getState();
  const pack = buildCoachPack({ workouts, foodEntries, settings, library: exerciseLibrary, schedule, templates }, now);
  const options = { date: format(now, 'yyyy-MM-dd'), unit: settings.weightUnit };
  const req = buildCoachRequest(pack, [], options);
  // Workers deployed before coach mode read system/messages: they get the prompt, the pack and the question
  const system = req.system.map(b => b.text).join('\n\n');
  const messages: CoachMessage[] = [...thread, { role: 'user', content: question }];
  const text = await callClaude(system, question, req.max_tokens, { coach: { ...options, pack, messages } });
  const read = readCoachReply(text);
  if (!read) return { reply: CANT_HELP, raw: JSON.stringify(CANT_HELP) };
  // Only what the user said counts as given: the coach's own earlier words don't vouch for a number
  const given = { pack, question, asked: thread.filter(m => m.role === 'user'), knowledge: KNOWLEDGE };
  const checked = checkReply(read, question, given);
  const stripped = stripInvented(checked.reply, checked.invented);
  const reply = stripped.answer.trim() ? stripped : CANT_HELP;
  return { reply, raw: JSON.stringify(reply) };
}

// ---------------------------------------------------------------- routing
// A message typed into the Log or Progress composer that reads as a question goes to the coach
// before the parser is called (one coach slot). Text it can't place goes to the parser, and only when
// that finds nothing and it looksLikeQuestion does it go to the coach: the one two-slot path.

// A log: sets x reps, a weight or rep count, a time or distance
const LOG_SHAPE = /\b\d+\s*[x×]\s*\d+\b|\b\d+(?:\.\d+)?\s*(?:lbs?|kg|kgs|kilos?|pounds?|reps?|sets?|mi|miles?|km|k|min|mins|minutes?)\b|@\s*\d/i;
// Question words that don't start logs ("did legs" is a log; "did I train legs?" ends with ?), and
// asks no log makes
const OPENERS = /^(?:what|what's|whats|should|how|how's|hows|can|could|would|why|which|when|where|suggest|recommend)\b|\b(?:suggest|recommend|advice)\b/i;
const QUESTION_WORDS = /\?|\b(?:what|should|how|can|could|would|why|which|is|are|am|do|does|did|suggest|recommend|help|coach|advice|ideas?|tips?)\b/i;

// Sure enough to skip the parser: a question mark at the end, or a question word, and nothing log-shaped
export const readsAsQuestion = (text: string) => {
  const t = text.trim();
  return !LOG_SHAPE.test(t) && (/\?\s*$/.test(t) || OPENERS.test(t));
};

// After the parser found no workout and no food: a question word anywhere is enough to try the coach
export const looksLikeQuestion = (text: string) => QUESTION_WORDS.test(text);
