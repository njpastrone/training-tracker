import { useState } from 'react';
import { ApiError } from '../services/claude';
import { askCoach, type CoachMessage, type CoachReply } from '../services/ask';

// ponytail: 12 questions a thread keeps one sitting from draining the daily cap; the Worker refuses longer threads
const MAX_TURNS = 12;
const RETRY_MESSAGE = "Couldn't answer that, try again.";

export interface CoachTurn {
  question: string;
  reply?: CoachReply; // unset while the coach thinks
  raw?: string; // the model's reply as written, sent back with the next question
}

// Ask → the answer card → follow-ups by typing or a chip. One thread per visit of the Ask sheet.
export function useCoach() {
  const [text, setText] = useState(''); // what's in the composer
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || busy) return;
    if (turns.length >= MAX_TURNS) {
      setError('Start over to keep asking.');
      return;
    }
    const thread: CoachMessage[] = turns.flatMap(t => (t.raw ? [{ role: 'user' as const, content: t.question }, { role: 'assistant' as const, content: t.raw }] : []));
    setBusy(true);
    setError(null);
    setText('');
    setTurns([...turns, { question }]);
    try {
      const { reply, raw: answered } = await askCoach(question, thread);
      setTurns(prev => prev.map(t => (t === prev[prev.length - 1] ? { question, reply, raw: answered } : t)));
    } catch (err) {
      console.error('Coach error:', err);
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
      setTurns(prev => prev.slice(0, -1));
      setText(question);
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setTurns([]);
    setText('');
    setError(null);
  };

  const last = turns[turns.length - 1];
  return { text, setText, turns, busy, error, ask, startOver, chips: last?.reply?.chips ?? [] };
}
