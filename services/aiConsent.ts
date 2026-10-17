import { useWorkoutStore } from '../stores/workoutStore';

// Nothing typed goes to Anthropic until the user agrees (App Store guideline 5.1.2(i)) and says they're
// 18 or older: AI is 18+, and under 18 LiftText runs on the phone alone. The sheet that asks
// (components/AiConsentSheet.tsx) registers here; it answers null when swiped away.
export type AiConsentAnswer = 'granted' | 'declined' | 'under18';
type Asker = () => Promise<AiConsentAnswer | null>;
let asker: Asker | null = null;
let asking: Promise<AiConsentAnswer | null> | null = null;

export function setAiConsentAsker(fn: Asker | null) {
  asker = fn;
}

// Shows the sheet (once, however many calls are waiting) and remembers the answer
export async function askAiConsent(): Promise<boolean> {
  if (!asker) return false;
  asking ??= asker().finally(() => { asking = null; });
  const answer = await asking;
  if (answer !== null) useWorkoutStore.getState().updateSettings({ aiConsent: answer });
  return answer === 'granted';
}

// The privacy policy and terms, served by the Worker (server/src/legal.ts)
export const legalUrl = (page: 'privacy' | 'terms') => `${(process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')}/${page}`;

// True only after a yes from someone 18 or older; the first AI call asks
export async function hasAiConsent(): Promise<boolean> {
  const { aiConsent } = useWorkoutStore.getState().settings;
  return aiConsent ? aiConsent === 'granted' : askAiConsent();
}
