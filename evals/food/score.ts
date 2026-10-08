// Scores one food parse against a gold case: is each meal total within 20% of the reference?
// Small numbers get a floor (a 1 g vs 2 g fat miss is not a 100% miss): see TOLERANCE.

import type { FoodCase } from './cases.ts';

export type MacroKey = 'kcal' | 'protein' | 'carbs' | 'fat';
export const MACROS: MacroKey[] = ['kcal', 'protein', 'carbs', 'fat'];

// Within 20% of the reference, or within the floor, whichever is looser
export const TOLERANCE = { share: 0.2, floor: { kcal: 25, protein: 3, carbs: 3, fat: 3 } as Record<MacroKey, number> };

export const within = (k: MacroKey, got: number, ref: number) => Math.abs(got - ref) <= Math.max(TOLERANCE.share * ref, TOLERANCE.floor[k]);

// tools/score.py in the scout's folder: [share, floor kcal]
const SCOUT_TOLERANCE = { tight: [0.1, 25], normal: [0.2, 50], loose: [0.35, 75] } as const;

export interface Predicted {
  items: { name: string; macros: Record<MacroKey, number>; source: string; grams?: number }[];
}

export interface CaseScore {
  hits: Record<MacroKey, boolean>;
  all: boolean; // all four within tolerance
  got: Record<MacroKey, number>;
  itemsDiff: number; // predicted items minus reference items (diagnostic)
  misses: string[];
  atTolerance?: boolean; // kcal within the case's own tolerance, when it has one
}

export function scoreFoodCase(c: FoodCase, p: Predicted | null): CaseScore {
  const items = p?.items ?? [];
  const got = Object.fromEntries(MACROS.map((k) => [k, Math.round(items.reduce((s, i) => s + (i.macros[k] ?? 0), 0) * 10) / 10])) as Record<MacroKey, number>;
  // No food in the log: right only when nothing was logged
  const empty = c.items.length === 0;
  const hits = Object.fromEntries(MACROS.map((k) => [k, empty ? items.length === 0 : within(k, got[k], c.ref[k])])) as Record<MacroKey, boolean>;
  const misses = MACROS.filter((k) => !hits[k]).map((k) => `${k}: got ${got[k]}, want ${c.ref[k]}`);
  if (empty && items.length) misses.splice(0, misses.length, `not food, but logged ${items.map((i) => i.name).join(', ')}`);
  // The scout set's own kcal tolerance per case, as its scorer judges it
  const tol = c.tolerance && SCOUT_TOLERANCE[c.tolerance];
  const atTolerance = tol ? (empty ? items.length === 0 : Math.abs(got.kcal - c.ref.kcal) <= Math.max(tol[0] * c.ref.kcal, tol[1])) : undefined;
  return { hits, all: MACROS.every((k) => hits[k]), got, itemsDiff: items.length - c.items.length, misses, atTolerance };
}
