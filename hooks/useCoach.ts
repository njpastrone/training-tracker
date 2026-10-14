import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { ApiError } from '../services/claude';
import { askCoach, type CoachCards, type CoachMessage, type CoachReply } from '../services/ask';
import { mealEntry, rememberFact, type MealCard, type WorkoutCard } from '../services/coachCards';
import { templateService } from '../services/templates';
import { scheduleService } from '../services/schedule';
import { useWorkoutStore } from '../stores/workoutStore';

// ponytail: 12 questions a thread keeps one sitting from draining the daily cap; the Worker refuses longer threads
const MAX_TURNS = 12;
const RETRY_MESSAGE = "Couldn't answer that, try again.";

export interface CoachTurn {
  question: string;
  reply?: CoachReply; // unset while the coach thinks
  raw?: string; // the checked reply, sent back with the next question
  cards?: CoachCards;
  planned?: string; // the date a suggested workout was planned for
  logged?: string[]; // ids of the meal entries logged from this answer, by meal index
  remembered?: boolean | 'no'; // the remember chip's answer
}

// Ask → the answer card → follow-ups by typing or a chip. One thread per visit of the Ask sheet.
// Cards save only on a tap: a workout goes on the calendar, a meal into today's food, a fact into Settings.
export function useCoach() {
  const [text, setText] = useState(''); // what's in the composer
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (i: number, change: Partial<CoachTurn>) => setTurns(prev => prev.map((t, k) => (k === i ? { ...t, ...change } : t)));

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
      const { reply, raw: answered, cards } = await askCoach(question, thread);
      setTurns(prev => prev.map(t => (t === prev[prev.length - 1] ? { question, reply, raw: answered, cards } : t)));
    } catch (err) {
      console.error('Coach error:', err);
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
      setTurns(prev => prev.slice(0, -1));
      setText(question);
    } finally {
      setBusy(false);
    }
  };

  // The suggested workout as a planned day: a template plus a calendar entry, so Log shows "Today's plan"
  const plan = async (i: number, workout: WorkoutCard) => {
    const date = format(addDays(new Date(), workout.when === 'tomorrow' ? 1 : 0), 'yyyy-MM-dd');
    try {
      const template = await templateService.createTemplate({
        name: workout.name,
        description: workout.why,
        exercises: workout.exercises.map(({ isNew, ...e }) => e),
        muscleGroups: workout.muscleGroups,
      });
      await scheduleService.scheduleWorkout(date, template.id);
      const { loadTemplates, loadSchedule } = useWorkoutStore.getState();
      await Promise.all([loadTemplates(), loadSchedule()]);
      patch(i, { planned: date });
    } catch (err) {
      console.error('Error planning the suggested workout:', err);
      setError("Couldn't plan that. Try again.");
    }
  };

  // One meal into today's food log; tapping again takes it back out
  const logMeal = (i: number, meal: MealCard, k: number) => {
    const { addFoodEntry, removeFoodItem } = useWorkoutStore.getState();
    const turn = turns[i];
    const logged = [...(turn.logged ?? [])];
    if (logged[k]) {
      const id = logged[k];
      for (const item of useWorkoutStore.getState().foodEntries.find(e => e.id === id)?.items ?? []) removeFoodItem(id, item.id);
      logged[k] = '';
    } else {
      const entry = mealEntry(meal);
      addFoodEntry(entry);
      logged[k] = entry.id;
    }
    patch(i, { logged });
  };

  // The remember chip: yes stores the fact in Settings, no just closes the chip
  const remember = (i: number, yes: boolean) => {
    const r = turns[i].cards?.remember;
    if (yes && r) {
      const { settings, updateSettings } = useWorkoutStore.getState();
      updateSettings(rememberFact(settings, r));
    }
    patch(i, { remembered: yes || 'no' });
  };

  const startOver = () => {
    setTurns([]);
    setText('');
    setError(null);
  };

  const last = turns[turns.length - 1];
  return { text, setText, turns, busy, error, ask, plan, logMeal, remember, startOver, chips: last?.reply?.chips ?? [] };
}
