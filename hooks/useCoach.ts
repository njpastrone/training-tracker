import { useState } from 'react';
import { Alert } from 'react-native';
import { addDays, format } from 'date-fns';
import { ApiError } from '../services/claude';
import { askCoach } from '../services/ask';
import { mealEntry, rememberFact, type MealCard, type WorkoutCard } from '../services/coachCards';
import { templateService } from '../services/templates';
import { scheduleService } from '../services/schedule';
import { digest } from '../services/insights';
import { chartFor, coachThread } from '../services/thread';
import { useWorkoutStore } from '../stores/workoutStore';
import { useChatStore, type ChatItem, type CoachTurnState } from '../stores/chatStore';

const RETRY_MESSAGE = "Couldn't answer that, try again.";

type AnswerItem = Extract<ChatItem, { kind: 'answer' }>;
const answerById = (id: string) => useChatStore.getState().items.find((i): i is AnswerItem => i.id === id && i.kind === 'answer');

// Ask → the answer lands in the Chat thread → follow-ups by typing or a chip. Today's last answers go
// back with each question (services/thread.ts). Cards save only on a tap: a workout goes on the
// calendar, a meal into today's food, a fact into Settings; the tap is kept on the answer.
export function useCoach() {
  const [pending, setPending] = useState<string | null>(null); // the question being answered
  const [error, setError] = useState<string | null>(null);
  const items = useChatStore(s => s.items);
  const patch = (id: string, change: Partial<CoachTurnState>) => useChatStore.getState().patch(id, change);

  // False when it couldn't answer, so the caller can put the question back in its composer
  const ask = async (raw: string): Promise<boolean> => {
    const question = raw.trim();
    if (!question || pending) return false;
    const now = new Date();
    const thread = coachThread(useChatStore.getState().items, now);
    setPending(question);
    setError(null);
    try {
      const { reply, raw: answered, cards } = await askCoach(question, thread, now);
      const { workouts, exerciseLibrary, settings } = useWorkoutStore.getState();
      const chartExerciseId = chartFor(question, digest(workouts, exerciseLibrary, settings.weightUnit, now).liftTrends);
      useChatStore.getState().add({ kind: 'you', text: question }, { kind: 'answer', question, turn: { reply, raw: answered, cards, chartExerciseId } });
      return true;
    } catch (err) {
      console.error('Coach error:', err);
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
      return false;
    } finally {
      setPending(null);
    }
  };

  // The suggested workout as a planned day: a template plus a calendar entry, so Log shows "Today's plan".
  // A day that already has a plan asks before replacing it.
  const plan = async (id: string, workout: WorkoutCard) => {
    const date = format(addDays(new Date(), workout.when === 'tomorrow' ? 1 : 0), 'yyyy-MM-dd');
    const save = async () => {
      try {
        let templateId = answerById(id)?.turn.templateId;
        if (!templateId || !(await templateService.getTemplate(templateId))) {
          templateId = (
            await templateService.createTemplate({
              name: workout.name,
              description: workout.why,
              exercises: workout.exercises.map(({ isNew, ...e }) => e),
              muscleGroups: workout.muscleGroups,
            })
          ).id;
          patch(id, { templateId });
        }
        await scheduleService.scheduleWorkout(date, templateId);
        const { loadTemplates, loadSchedule } = useWorkoutStore.getState();
        await Promise.all([loadTemplates(), loadSchedule()]);
        patch(id, { planned: date });
      } catch (err) {
        console.error('Error planning the suggested workout:', err);
        setError("Couldn't plan that. Try again.");
      }
    };
    const existing = (await scheduleService.getSchedule().catch(() => [])).find(s => s.date === date);
    if (!existing) return save();
    const name = (await templateService.getTemplate(existing.templateId).catch(() => null))?.name ?? 'a workout';
    Alert.alert(`You already have ${name} ${workout.when}. Replace it?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: save },
    ]);
  };

  // One meal into today's food log; tapping again takes it back out
  const logMeal = (id: string, meal: MealCard, k: number) => {
    const { addFoodEntry, removeFoodItem } = useWorkoutStore.getState();
    const logged = [...(answerById(id)?.turn.logged ?? [])];
    if (logged[k]) {
      const entryId = logged[k];
      for (const item of useWorkoutStore.getState().foodEntries.find(e => e.id === entryId)?.items ?? []) removeFoodItem(entryId, item.id);
      logged[k] = '';
    } else {
      const entry = mealEntry(meal);
      addFoodEntry(entry);
      logged[k] = entry.id;
    }
    patch(id, { logged });
  };

  // The remember chip: yes stores the fact in Settings, no just closes the chip
  const remember = (id: string, yes: boolean) => {
    const r = answerById(id)?.turn.cards?.remember;
    if (yes && r) {
      const { settings, updateSettings } = useWorkoutStore.getState();
      updateSettings(rememberFact(settings, r));
    }
    patch(id, { remembered: yes || 'no' });
  };

  // The newest answer's follow-ups, while it's the last thing in the thread
  const last = items[items.length - 1];
  const chips = last?.kind === 'answer' ? last.turn.reply.chips : [];
  return { pending, busy: !!pending, error, clearError: () => setError(null), ask, plan, logMeal, remember, chips };
}
