import { useWorkoutStore } from '../stores/workoutStore';

// Nothing typed goes to Anthropic until the user agrees (App Store guideline 5.1.2(i)). The sheet
// that asks (components/AiConsentSheet.tsx) registers here; it answers null when swiped away.
type Asker = () => Promise<boolean | null>;
let asker: Asker | null = null;
let asking: Promise<boolean | null> | null = null;

export function setAiConsentAsker(fn: Asker | null) {
  asker = fn;
}

// Shows the sheet (once, however many calls are waiting) and remembers a yes or a no
export async function askAiConsent(): Promise<boolean> {
  if (!asker) return false;
  asking ??= asker().finally(() => { asking = null; });
  const agreed = await asking;
  if (agreed !== null) useWorkoutStore.getState().updateSettings({ aiConsent: agreed ? 'granted' : 'declined' });
  return !!agreed;
}

// True only after a yes; the first AI call asks
export async function hasAiConsent(): Promise<boolean> {
  const { aiConsent } = useWorkoutStore.getState().settings;
  return aiConsent ? aiConsent === 'granted' : askAiConsent();
}
