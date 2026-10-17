// A realistic user for the coach: Sam from insights.fixtures (upper/lower 4x a week, full detail),
// seen on Monday 12 October 2026 at noon, six days after the last workout, with two weeks of food
// logged through the no-AI parser (so every item has USDA numbers) and breakfast already in today.
// Used by the pack tests and evals/coach.
import { USERS } from './insights.fixtures';
import { localFoodParse } from './foods';
import { emptyLibrary } from './exerciseIdentity';
import type { PackInput } from './coachPack';
import type { FoodEntry } from '../types/food';
import type { UserSettings } from '../types/workout';

export const SAM_NOW = new Date(2026, 9, 12, 12);

const meal = (date: string, hour: number, log: string): FoodEntry => ({
  id: `${date}-${hour}`,
  date,
  rawInput: log,
  createdAt: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8)), hour).toISOString(),
  items: localFoodParse(log).items.map((i, k) => ({ ...i, id: `${date}-${hour}-${k}` })),
});

const BREAKFAST = '3 eggs, 2 slices of whole wheat toast, a banana';
const LUNCH = '200g chicken breast, 1.5 cups white rice, 1 cup broccoli';
const LUNCH_B = '1 cup greek yogurt, 1 cup oatmeal';
const SNACK = '1 scoop whey protein, 1 cup 2% milk';
const DINNER = '6 oz salmon, 1 cup sweet potato';
const DINNER_B = '200g ground beef 93, 1 cup pasta';

// 28 September to 11 October, then today's breakfast
const FOOD: FoodEntry[] = [];
for (let day = 28; day <= 30; day++) FOOD.push(...dayOf(`2026-09-${day}`, day));
for (let day = 1; day <= 11; day++) FOOD.push(...dayOf(`2026-10-${String(day).padStart(2, '0')}`, day));
FOOD.push(meal('2026-10-12', 8, BREAKFAST));

function dayOf(date: string, n: number): FoodEntry[] {
  const out = [meal(date, 8, BREAKFAST), meal(date, 13, n % 3 === 0 ? LUNCH_B : LUNCH), meal(date, 19, n % 2 ? DINNER : DINNER_B)];
  if (n % 2) out.push(meal(date, 16, SNACK));
  return out;
}

export const SAM_SETTINGS: UserSettings = {
  weightUnit: 'lbs',
  weeklyTarget: 4,
  goal: 'strength',
  goals: {
    muscles: ['chest', 'back', 'shoulders', 'quads', 'hamstrings'],
    timesPerWeek: 2,
    custom: [{ id: 'g1', kind: 'lift', exerciseId: 'squat', weight: 225, unit: 'lbs' }],
    food: { kind: 'protein', target: 160 },
  },
  aiConsent: 'granted',
  aiConsentVersion: 2,
};

export const SAM: PackInput = { workouts: USERS.sam, foodEntries: FOOD, settings: SAM_SETTINGS, library: emptyLibrary() };

// Jordan logs names only and no food; a brand-new user has nothing
export const JORDAN: PackInput = { workouts: USERS.jordan, foodEntries: [], settings: { weightUnit: 'lbs', weeklyTarget: 3 }, library: emptyLibrary() };
export const NEW_USER: PackInput = { workouts: [], foodEntries: [], settings: { weightUnit: 'kg' }, library: emptyLibrary() };
