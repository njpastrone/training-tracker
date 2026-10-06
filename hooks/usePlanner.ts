import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { ApiError } from '../services/claude';
import { planWorkouts, previewPlan, savePlan, summarizeHistory } from '../services/planner';
import { GOALS } from '../services/onboarding';
import { goalLines } from '../services/goals';
import { PlannerResponse, TrainingPlan } from '../types/plan';

// ponytail: ~8 AI turns per planning session keeps one user from draining the shared daily cap
const MAX_TURNS = 8;
const RETRY_MESSAGE = "Couldn't build that, try again.";

// Say what you want → review the plan card → tweak by typing or a chip → Plan it.
// Nothing is scheduled until planIt().
export function usePlanner({ plans, onPlanned }: { plans: TrainingPlan[]; onPlanned: (plan: TrainingPlan) => void }) {
  const { workouts, schedule, settings, exerciseLibrary, loadSchedule, loadTemplates } = useWorkoutStore();
  const [text, setText] = useState(''); // what's in the chat bar
  const [messages, setMessages] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null); // shown as your bubble while the plan builds
  const [turns, setTurns] = useState(0);
  const [draft, setDraft] = useState<PlannerResponse | null>(null);
  const [previous, setPrevious] = useState<PlannerResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo(
    () => ({
      ...summarizeHistory(workouts, schedule, plans, settings.weightUnit),
      daysPerWeek: settings.weeklyTarget,
      goal: settings.goal,
      goals: settings.goals && goalLines(settings.goals, exerciseLibrary),
    }),
    [workouts, schedule, plans, settings.weightUnit, settings.weeklyTarget, settings.goal, settings.goals, exerciseLibrary]
  );
  const preview = draft ? previewPlan(draft.plan, schedule) : null;

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || busy) return;
    if (draft && turns >= MAX_TURNS) {
      setError('Start a new plan to keep going.');
      return;
    }
    setBusy(true);
    setError(null);
    setSending(message);
    try {
      const result = await planWorkouts(message, draft?.plan ?? null, history, messages);
      if (!result) {
        setError(RETRY_MESSAGE);
        return;
      }
      setPrevious(draft);
      setDraft(result);
      setTurns(draft ? turns + 1 : 1);
      setMessages([...messages, message]);
      setText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
    } finally {
      setBusy(false);
      setSending(null);
    }
  };

  const undoTweak = () => {
    setDraft(previous);
    setPrevious(null);
    setMessages(messages.slice(0, -1));
  };

  const startOver = () => {
    setDraft(null);
    setPrevious(null);
    setMessages([]);
    setTurns(0);
    setText('');
    setError(null);
  };

  const planIt = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const plan = await savePlan(draft.plan, messages[0], settings.weightUnit);
      await Promise.all([loadSchedule(), loadTemplates()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startOver();
      onPlanned(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const lastWorkout = history.daysSinceLastWorkout === null ? null : format(subDays(new Date(), history.daysSinceLastWorkout), 'MMM d');
  const context = lastWorkout
    ? `From your log: last workout ${lastWorkout} (${history.daysSinceLastWorkout} days ago) · about ${history.workoutsPerWeek.prior8w || history.workoutsPerWeek.last4w}/week before that${history.usualDays.length ? `, usually ${history.usualDays.join(', ')}` : ''}`
    : settings.weeklyTarget || settings.goal
      ? `You want ${[settings.weeklyTarget && `${settings.weeklyTarget} days a week`, GOALS.find(g => g.value === settings.goal)?.label.toLowerCase()].filter(Boolean).join(' · ')}.`
      : 'No workouts logged yet, so the plan starts from scratch.';

  // Your latest message: the one being planned, else the one the current plan answers
  const sent = sending ?? messages[messages.length - 1] ?? null;

  return { text, setText, sent, draft, previous, preview, busy, saving, error, context, send, undoTweak, startOver, planIt };
}
