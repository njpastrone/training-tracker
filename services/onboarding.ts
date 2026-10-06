import { TrainingGoal, WeightUnit } from '../types/workout';

// First-run setup: who sees it, and the answers it offers. Pure so it can be unit-tested.

// Setup is only for a fresh install: nothing at all stored under the app's keys (BACKUP_KEYS).
// The store key exists for anyone who ever logged, changed a setting or opened the Log screen,
// so existing users never see setup. Empty lists count as nothing.
export function isFreshInstall(stored: readonly (readonly [string, string | null])[]): boolean {
  return stored.every(([, raw]) => raw === null || raw === '[]');
}

// lb where the iPhone's region uses pounds (or the region is unknown), kg everywhere else
export function guessUnit(locale: string): WeightUnit {
  const region = locale.split(/[-_]/).slice(1).find(part => /^[A-Z]{2}$/.test(part));
  return !region || ['US', 'LR', 'MM'].includes(region) ? 'lbs' : 'kg';
}

export const DAYS_OPTIONS = [
  { value: '3', label: '2–3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
] as const;

export const GOALS: { value: TrainingGoal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'fitness', label: 'General fitness' },
  { value: 'comeback', label: 'Getting back into it' },
];
