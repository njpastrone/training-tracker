import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '../stores/workoutStore';
import { parseWorkout, correctWorkout, workoutsFromParse, ApiError } from '../services/claude';
import { ParsedWorkoutResponse } from '../types/workout';

export type Draft = ParsedWorkoutResponse;

// Type it → review the parsed card → fix by typing or tapping a number → Save.
// Nothing is stored until save(); date is the day being logged.
export function useLogDraft({ date, onLogged }: { date: string; onLogged?: (workoutId: string, templateId?: string) => void }) {
  const { addWorkout, markTemplateUsed, settings } = useWorkoutStore();
  const [text, setText] = useState(''); // what's in the composer
  const [sent, setSent] = useState<string | null>(null); // the log as typed, shown as your bubble
  const [draft, setDraft] = useState<Draft | null>(null);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [busy, setBusy] = useState<'parse' | 'fix' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = { date, unit: settings.weightUnit };

  const fail = (err: unknown, fallback: string) => {
    console.error(fallback, err);
    setError(err instanceof ApiError ? err.message : fallback);
  };

  const parse = async () => {
    const raw = text.trim();
    if (!raw || busy) return;
    setSent(raw);
    setText('');
    setDraft(null);
    setTemplateId(undefined);
    setError(null);
    setBusy('parse');
    try {
      const parsed = await parseWorkout(raw, options);
      if (!parsed || parsed.exercises.length === 0) {
        setError('Could not understand the workout. Try being more specific.');
        setText(raw);
        setSent(null);
        return;
      }
      setDraft(parsed);
    } catch (err) {
      fail(err, 'Failed to read your workout. Please try again.');
      setText(raw);
      setSent(null);
    } finally {
      setBusy(null);
    }
  };

  // A typed correction ("actually 3x10, not 3x8") re-parses with the current draft as context
  const fix = async (instruction: string) => {
    if (!draft || !instruction.trim() || busy) return false;
    setError(null);
    setBusy('fix');
    try {
      const updated = await correctWorkout(draft, instruction.trim(), options);
      if (!updated || updated.exercises.length === 0) {
        setError("Couldn't apply that fix. Try saying it another way.");
        return false;
      }
      setDraft(updated);
      return true;
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
    setDraft({ exercises: workout.exercises, muscleGroups: workout.muscleGroups as Draft['muscleGroups'], notes: workout.notes, confidence: 1 });
  };

  const save = async () => {
    if (!draft || busy) return;
    setBusy('save');
    const workouts = workoutsFromParse(draft, sent ?? 'Started from template', date, templateId);
    workouts.forEach(addWorkout);
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
    onLogged?.(workouts[workouts.length - 1].id, loggedTemplate); // latest day, i.e. today's session
  };

  const discard = () => {
    setSent(null);
    setDraft(null);
    setTemplateId(undefined);
    setError(null);
    setBusy(null);
  };

  return { text, setText, sent, draft, setDraft, templateId, busy, error, parse, fix, startFromTemplate, save, discard };
}
