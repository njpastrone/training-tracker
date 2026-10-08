import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, parseISO } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { parseWorkout, parseLog, correctWorkout, correctFood, workoutsFromParse, ApiError } from '../services/claude';
import { mentionsFood } from '../services/foods';
import { ParsedWorkoutResponse, Workout } from '../types/workout';
import { FoodDraft, FoodEntry } from '../types/food';
import { NOTHING_CHANGED, sameDraft } from '../services/draft';
import type { FixReplyState } from '../components/ParsedCard';

export type Draft = ParsedWorkoutResponse;

// One food entry per day the food draft covers, dated relative to baseDate (YYYY-MM-DD)
export function foodEntriesFromDraft(food: FoodDraft, rawInput: string, baseDate: string): FoodEntry[] {
  const offsets = [...new Set(food.items.map((i) => i.dayOffset ?? 0))].sort((a, b) => a - b);
  return offsets.map((offset) => ({
    id: uuidv4(),
    date: format(addDays(parseISO(baseDate), offset), 'yyyy-MM-dd'),
    items: food.items.filter((i) => (i.dayOffset ?? 0) === offset).map(({ dayOffset, ...i }) => ({ ...i, id: uuidv4() })),
    rawInput,
    createdAt: new Date().toISOString(),
  }));
}

const DAY_WORDS = /\b(yesterday|today|last night|this morning|days? ago|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;

// Words of the draft's foods the fix mentions ("the rice was brown" → rice)
const namesFood = (food: FoodDraft, fix: string) => {
  const words = new Set(fix.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  return food.items.some((i) => `${i.name} ${i.said ?? ''}`.toLowerCase().match(/[a-z]{3,}/g)?.some((w) => words.has(w)));
};

// Type it → review the parsed card → fix by typing or tapping a number → Save.
// Nothing is stored until save(); date is the day being logged. With withFood, what the user ate is
// read too (services/claude.ts parseLog) and reviewed and saved with the workout.
export function useLogDraft({ date, onLogged, withFood }: { date: string; onLogged?: (workoutId: string | undefined, templateId?: string, saved?: Workout[]) => void; withFood?: boolean }) {
  const { addWorkout, addFoodEntry, markTemplateUsed, settings } = useWorkoutStore();
  const [text, setText] = useState(''); // what's in the composer
  const [sent, setSent] = useState<string | null>(null); // the log as typed, shown as your bubble
  const [draft, setWorkoutDraft] = useState<Draft | null>(null);
  const [food, setFoodDraft] = useState<FoodDraft | null>(null);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [busy, setBusy] = useState<'parse' | 'fix' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<FixReplyState | null>(null); // the fix box's answer to a question
  const options = { date, unit: settings.weightUnit };
  // Removing the last exercise or food leaves the other half on its own
  const setDraft = (next: Draft | null) => setWorkoutDraft(next && next.exercises.length === 0 && food ? null : next);
  const setFood = (next: FoodDraft | null) => setFoodDraft(next && next.items.length === 0 && draft ? null : next);

  const fail = (err: unknown, fallback: string) => {
    console.error(fallback, err);
    setError(err instanceof ApiError ? err.message : fallback);
  };

  const parse = async () => {
    const raw = text.trim();
    if (!raw || busy) return;
    setSent(raw);
    setText('');
    setWorkoutDraft(null);
    setFoodDraft(null);
    setTemplateId(undefined);
    setError(null);
    setReply(null);
    setBusy('parse');
    try {
      const parsed = withFood ? await parseLog(raw, options) : { workout: await parseWorkout(raw, options), food: null };
      if (!parsed.workout?.exercises.length && !parsed.food?.items.length) {
        setError(withFood ? 'Could not understand that. Try naming what you did or ate.' : 'Could not understand the workout. Try being more specific.');
        setText(raw);
        setSent(null);
        return;
      }
      setWorkoutDraft(parsed.workout?.exercises.length ? parsed.workout : null);
      setFoodDraft(parsed.food?.items.length ? parsed.food : null);
    } catch (err) {
      fail(err, withFood ? 'Failed to read that. Please try again.' : 'Failed to read your workout. Please try again.');
      setText(raw);
      setSent(null);
    } finally {
      setBusy(null);
    }
  };

  // A typed correction ("actually 3x10, not 3x8") re-parses with the current draft as context; a
  // question ("is pec deck machine flys?") gets an answer. Something always shows. A fix about the
  // food ("it was 3 eggs") goes to the food parser, anything else to the workout's; a new day ("that
  // was yesterday") goes to both.
  const fix = async (instruction: string) => {
    if ((!draft && !food) || !instruction.trim() || busy) return false;
    setError(null);
    setReply(null);
    setBusy('fix');
    const fixText = instruction.trim();
    const day = DAY_WORDS.test(fixText.toLowerCase());
    const toFood = !!food && (!draft || day || mentionsFood(fixText) || namesFood(food, fixText));
    const toWorkout = !!draft && (!toFood || day);
    try {
      const [w, f] = await Promise.all([
        toWorkout ? correctWorkout(draft!, fixText, options) : undefined,
        toFood ? correctFood(food!, fixText, date) : undefined,
      ]);
      // Dropping all the food is fine while a workout is left; an empty workout never is
      if (w === null || (w && w.draft.exercises.length === 0) || f === null || (f && f.draft.items.length === 0 && !draft)) {
        setError("Couldn't apply that fix. Try saying it another way.");
        return false;
      }
      const changed = (!!w && !sameDraft(draft!, w.draft)) || (!!f && JSON.stringify(f.draft.items) !== JSON.stringify(food!.items));
      if (w) setWorkoutDraft(w.draft);
      if (f) setFoodDraft(f.draft.items.length ? f.draft : null);
      const answer = w?.reply ?? f?.reply;
      if (answer || !changed) setReply({ text: answer ?? NOTHING_CHANGED, callIt: w?.callIt });
      return changed || !!answer;
    } catch (err) {
      fail(err, "Couldn't apply that fix. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  // Start from a template: its exercises go straight to the review card
  const startFromTemplate = (workout: { exercises: Draft['exercises']; muscleGroups: string[]; notes?: string }, id: string) => {
    setSent(null);
    setError(null);
    setTemplateId(id);
    setReply(null);
    setFoodDraft(null);
    setWorkoutDraft({ exercises: workout.exercises, muscleGroups: workout.muscleGroups as Draft['muscleGroups'], notes: workout.notes, confidence: 1 });
  };

  const save = async () => {
    if ((!draft && !food) || busy) return;
    setBusy('save');
    const workouts = draft ? workoutsFromParse(draft, sent ?? 'Started from template', date, templateId) : [];
    workouts.forEach(addWorkout);
    if (food) foodEntriesFromDraft(food, sent ?? '', date).forEach(addFoodEntry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (templateId) {
      try {
        await markTemplateUsed(templateId);
      } catch (err) {
        console.log('Warning: Could not mark template as used:', err);
      }
    }
    const loggedTemplate = templateId;
    discard();
    onLogged?.(workouts[workouts.length - 1]?.id, loggedTemplate, workouts); // latest day, i.e. today's session
  };

  const discard = () => {
    setText('');
    setSent(null);
    setWorkoutDraft(null);
    setFoodDraft(null);
    setTemplateId(undefined);
    setError(null);
    setReply(null);
    setBusy(null);
  };

  return { text, setText, sent, draft, setDraft, food, setFood, templateId, busy, error, reply, parse, fix, startFromTemplate, save, discard };
}
