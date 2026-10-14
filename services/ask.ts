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

const fixNumbers = (invented: string[]) => `Your answer used numbers that are not in my log or the rules: ${invented.join(', ')}. Say it again without them.`;

// Asks the coach. `thread` is the earlier questions and the model's replies (as it wrote them), newest
// last. One Worker call per question; an answer with a number from nowhere is asked once to drop it
// (a second cap slot, rare), then the sentence goes. Throws ApiError on a server refusal.
export async function askCoach(question: string, thread: CoachMessage[] = [], now: Date = new Date()): Promise<{ reply: CoachReply; raw: string }> {
  const { workouts, foodEntries, settings, exerciseLibrary, schedule, templates } = useWorkoutStore.getState();
  const pack = buildCoachPack({ workouts, foodEntries, settings, library: exerciseLibrary, schedule, templates }, now);
  const options = { date: format(now, 'yyyy-MM-dd'), unit: settings.weightUnit };
  const req = buildCoachRequest(pack, [], options);
  // Workers deployed before coach mode read system/messages: they get the prompt, the pack and the question
  const system = req.system.map(b => b.text).join('\n\n');
  const send = (messages: CoachMessage[]) => callClaude(system, messages[messages.length - 1].content, req.max_tokens, { coach: { ...options, pack, messages } });
  const given = { pack, question, thread, knowledge: KNOWLEDGE };

  const messages: CoachMessage[] = [...thread, { role: 'user', content: question }];
  let raw = await send(messages);
  const read = readCoachReply(raw);
  if (!read) return { reply: CANT_HELP, raw };
  let checked = checkReply(read, question, given);
  if (checked.invented.length) {
    const retry = await send([...messages, { role: 'assistant', content: raw }, { role: 'user', content: fixNumbers(checked.invented) }]);
    const again = readCoachReply(retry);
    if (again) {
      raw = retry;
      checked = checkReply(again, question, given);
    }
  }
  const reply = stripInvented(checked.reply, checked.invented);
  return { reply: reply.answer.trim() ? reply : CANT_HELP, raw };
}

// ---------------------------------------------------------------- routing
// A message typed into the Log or Progress composer that reads as a question goes to the coach
// instead of the parser (which would say "Could not understand that").

// A log: sets x reps, a weight or rep count, a time or distance
const LOG_SHAPE = /\b\d+\s*[x×]\s*\d+\b|\b\d+(?:\.\d+)?\s*(?:lbs?|kg|kgs|kilos?|pounds?|reps?|sets?|mi|miles?|km|k|min|mins|minutes?)\b|@\s*\d/i;
// Question openers that don't start logs ("did legs" is a log; "did I train legs?" ends with ?)
const OPENERS = /^(?:what|what's|whats|should|how|how's|hows|can|could|would|why|which|when|where|who|any|suggest|recommend|give me|help|based on|i've taken|ive taken|i took|took a|been (?:off|out|away)|i haven't|i havent|haven't|havent)\b/i;
const QUESTION_WORDS = /\?|\b(?:what|should|how|can|could|would|why|which|is|are|am|do|does|did|suggest|recommend|help|coach|advice|ideas?|tips?)\b/i;

// Sure enough to skip the parser: a question mark at the end, or a question opener, and nothing log-shaped
export const readsAsQuestion = (text: string) => {
  const t = text.trim();
  return !LOG_SHAPE.test(t) && (/\?\s*$/.test(t) || OPENERS.test(t));
};

// After the parser found no workout and no food: a question word anywhere is enough to try the coach
export const looksLikeQuestion = (text: string) => QUESTION_WORDS.test(text);
