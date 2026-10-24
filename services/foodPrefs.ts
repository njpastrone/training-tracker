import { foodById } from '../data/foods';
import { sumMacros } from './foods';
import type { FoodCategory, FoodItem } from '../types/food';
import type { FoodPreference, FoodPrefs, UserSettings } from '../types/workout';
import { PREFERENCES as FINDER_PREFERENCES, type Preference } from '../server/src/finder';

// Food preferences (data/lt-ui-g/report.md §3.2-3.6): what matters to you, a budget, foods never to
// suggest and how long you cook, kept in settings on the phone. A suggested or logged meal is scored
// here against each preference from the food table's numbers; the price and the minutes are the
// model's estimates and read like it. Never-suggest words are a filter, not a score: a meal holding one
// is dropped before it is shown. Pure functions, tested in foodPrefs.test.mts.

export const PREFERENCES: { value: FoodPreference; label: string; short: string }[] = [
  { value: 'protein', label: 'High protein', short: 'high protein' },
  { value: 'lowSpike', label: 'Low glucose spike', short: 'low spike' },
  { value: 'simple', label: 'Simple ingredients', short: 'simple' },
  { value: 'noSeedOils', label: 'No seed oils', short: 'no seed oils' },
  { value: 'cheap', label: 'Cheap', short: 'cheap' },
  { value: 'lowCalorie', label: 'Low calorie', short: 'low calorie' },
  { value: 'highFiber', label: 'High fiber', short: 'high fiber' },
];
export const DEFAULT_MATTERS: FoodPreference[] = ['protein', 'lowSpike', 'simple', 'noSeedOils', 'cheap'];
export const BUDGETS = [8, 12, 16] as const;
export const COOKING = [0, 10, 20, 40] as const;

// The common allergens and dislikes as chips; each word stands for the foods it covers
export const NEVER_CHIPS: Record<string, RegExp> = {
  shellfish: /\b(shellfish|shrimp|prawns?|crab|lobster|clams?|mussels?|oysters?|scallops?|crawfish|crayfish|calamari|squid)\b/i,
  dairy: /\b(dairy|buttermilk|half and half|cheese|whey|casein|kefir|cottage|paneer|ghee|skyr|(?<!\b(?:almond|oat|coconut|soy|rice|cashew|peanut|cocoa|nut|seed)\s)(?:milk|butter|cream|yogurt|yoghurt))\b/i,
  gluten: /\b(gluten|wheat|bread|toast|pasta|noodles?|flour|barley|rye|bagels?|tortillas?|couscous|seitan|crackers?|cereal|pita|naan)\b/i,
  nuts: /\b(nuts?|almonds?|walnuts?|cashews?|pecans?|pistachios?|hazelnuts?|peanuts?|macadamia)\b/i,
  pork: /\b(pork|bacon|ham|prosciutto|pancetta|chorizo|salami|pepperoni)\b/i,
  eggs: /\b(eggs?|omelette?|omelet)\b/i,
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const neverPattern = (word: string) => NEVER_CHIPS[word.trim().toLowerCase()] ?? new RegExp(`\\b${escape(word.trim())}\\b`, 'i');

// The never-suggest word a meal breaks, read against each food's name and your words for it; none when it is fine
export function neverSuggested(items: Pick<FoodItem, 'name' | 'said'>[], prefs: FoodPrefs | undefined): string | undefined {
  const text = items.flatMap(i => [i.name, i.said ?? '']).join('\n');
  return prefs?.never.find(w => w.trim() && neverPattern(w).test(text));
}

// "High protein · low spike · no seed oils · about $12 · 20 min": the preferences in a line
export function prefsSummary(prefs: FoodPrefs): string {
  const parts = PREFERENCES.filter(p => prefs.matters.includes(p.value)).map(p => p.short);
  if (prefs.budget) parts.push(`about $${prefs.budget}`);
  if (prefs.cooking !== undefined) parts.push(prefs.cooking === 0 ? 'no cooking' : `${prefs.cooking} min`);
  const line = parts.join(' · ');
  return line ? line.charAt(0).toUpperCase() + line.slice(1) : 'Nothing picked yet';
}

export const MAKE_IT_QUESTION = 'What should I make to hit what I have left today?';
export const swapQuestion = (meal: string, foods: string[]) => `I had ${foods.join(', ')} for ${meal.toLowerCase()}. What's a version that fits my food preferences next time?`;

// ---------------------------------------------------------------- scorecard

export type Verdict = 'hit' | 'miss' | 'unknown';
export interface ScoreRow {
  pref: FoodPreference | 'cooking';
  label: string; // "Low spike likely", "~$9"
  verdict: Verdict;
  why: string; // two or three words: "lentils", "under $12"
}
export interface Scorecard {
  hits: number;
  of: number;
  likely: boolean; // a judgment or an estimate is in it, so "likely hits" rather than "hits"
  headline: string; // "Likely hits 4 of 5", "Hit 4 of 5" for a meal eaten; empty with nothing to check
  rows: ScoreRow[];
}

export interface MealFacts {
  items: FoodItem[];
  price?: number; // dollars a serving, the model's estimate
  minutes?: number; // time to make it, the model's estimate
  unknown?: string[]; // foods the table has no numbers for
  eaten?: boolean; // a logged meal: price and cooking time can't be judged, so those rows are left out
}

// ponytail: naive thresholds; tune from the log before any database. 30 g is the top half of ISSN's 20-40 g a meal.
const PROTEIN_MEAL = 30; // g
const SPIKE_CARBS = 40; // g: under this a meal is not read as a spike
const SPIKE_FIBER = 6; // g: this much fiber slows the carbs
const LOW_KCAL = 500;
const HIGH_FIBER = 8; // g
const SIMPLE_ITEMS = 5;
const FAST_CARBS: FoodCategory[] = ['grains', 'sweets_snacks', 'drinks'];
// The seed oils, shared with the finder: olive, avocado, coconut, butter, ghee and tallow are not; peanut
// oil is named and left to the user
export const SEED_OILS = ['canola', 'soybean', 'corn', 'cottonseed', 'sunflower', 'safflower', 'grapeseed', 'rice bran'] as const;
const SEED_OIL = new RegExp(`\\b(${[...SEED_OILS, 'soy', 'rapeseed', 'grape seed'].join('|')})\\b.*\\boil\\b|\\b(margarine|shortening|mayo|mayonnaise|ranch|dressing|fried|fries|chips|crisps|cooking spray)\\b`, 'i');
const PEANUT_OIL = /\bpeanut\b.*\boil\b/i;

const g = (n: number) => `~${Math.round(n)} g`;
const short = (name: string) => name.split(',')[0].trim().toLowerCase();
const category = (i: FoodItem) => (i.foodId && foodById.get(i.foodId)?.category) || 'other';
// A food whose carbs come fast: refined grains, sweets or a sweet drink with little fiber
const refined = (i: FoodItem) => FAST_CARBS.includes(category(i)) && i.macros.carbs >= 15 && (i.macros.fiber ?? 0) < 3;

// Each preference checked on its own, a sunrise hit or a quiet miss with a two-word reason; "spike" is a
// judgment from carbs and fiber, never a medical measure, and seed oils are read from the food's name.
export function scoreMeal(facts: MealFacts, prefs: FoodPrefs): Scorecard {
  const { items, eaten } = facts;
  const t = sumMacros(items);
  const fiber = t.fiber ?? 0;
  const rows: ScoreRow[] = [];
  const row = (pref: ScoreRow['pref'], label: string, verdict: Verdict, why: string) => rows.push({ pref, label, verdict, why });
  const unknownFoods = !!facts.unknown?.length || items.some(i => i.source === 'estimate');

  for (const p of prefs.matters) {
    switch (p) {
      case 'protein':
        row(p, `${g(t.protein)} protein`, t.protein >= PROTEIN_MEAL ? 'hit' : 'miss', t.protein >= PROTEIN_MEAL ? 'a full serving' : 'a light serving');
        break;
      case 'lowSpike': {
        const fast = items.find(refined);
        const spike = t.carbs >= SPIKE_CARBS && fiber < SPIKE_FIBER && fast;
        const fibrous = [...items].sort((a, b) => (b.macros.fiber ?? 0) - (a.macros.fiber ?? 0))[0];
        row(p, spike ? 'Spike likely' : 'Low spike likely', spike ? 'miss' : 'hit', spike ? short(fast.name) : fiber >= 3 && fibrous ? short(fibrous.name) : 'few carbs');
        break;
      }
      case 'simple': {
        const n = items.length + (facts.unknown?.length ?? 0);
        row(p, 'Simple', n <= SIMPLE_ITEMS ? 'hit' : 'miss', `${n} thing${n === 1 ? '' : 's'}`);
        break;
      }
      case 'noSeedOils': {
        const oil = items.find(i => SEED_OIL.test(i.name));
        const peanut = items.find(i => PEANUT_OIL.test(i.name));
        const fat = items.find(i => category(i) === 'fats_oils');
        if (oil) row(p, 'Seed oils likely', 'miss', short(oil.name));
        else if (peanut) row(p, 'Peanut oil', 'unknown', 'your call');
        else if (unknownFoods) row(p, 'Oils not published', 'unknown', 'not in the table');
        else row(p, 'No seed oils', 'hit', fat ? short(fat.name) : 'none added');
        break;
      }
      case 'cheap': {
        if (eaten) break;
        const budget = prefs.budget;
        if (!budget) break;
        if (facts.price === undefined) row(p, 'Price unknown', 'unknown', 'no estimate');
        else row(p, `~$${facts.price}`, facts.price <= budget ? 'hit' : 'miss', `${facts.price <= budget ? 'under' : 'over'} $${budget}`);
        break;
      }
      case 'lowCalorie':
        row(p, `~${Math.round(t.kcal).toLocaleString('en-US')} kcal`, t.kcal <= LOW_KCAL ? 'hit' : 'miss', t.kcal <= LOW_KCAL ? 'a light meal' : 'a full meal');
        break;
      case 'highFiber':
        row(p, `${g(fiber)} fiber`, fiber >= HIGH_FIBER ? 'hit' : 'miss', fiber >= HIGH_FIBER ? 'plenty' : 'not much');
        break;
    }
  }
  if (prefs.cooking !== undefined && !eaten && facts.minutes !== undefined) {
    const most = Math.max(prefs.cooking, 5); // no cooking still allows a few minutes of assembling
    row('cooking', `${facts.minutes} min`, facts.minutes <= most ? 'hit' : 'miss', prefs.cooking === 0 ? 'no stove' : `you cook up to ${prefs.cooking}`);
  }

  const hits = rows.filter(r => r.verdict === 'hit').length;
  const likely = rows.some(r => r.verdict === 'unknown' || r.pref === 'cheap' || r.pref === 'cooking' || r.pref === 'lowSpike' || r.pref === 'noSeedOils');
  const headline = rows.length ? `${eaten ? 'Hit' : likely ? 'Likely hits' : 'Hits'} ${hits} of ${rows.length}` : '';
  return { hits, of: rows.length, likely, headline, rows };
}

// A logged meal's one line, "Hit 3 of 4 of your preferences · spike likely · rice, oils not published · not
// in the table": misses first, then what can't be told; only a miss earns the swap
export function mealCheck(card: Scorecard): { line: string; swap: boolean } {
  const misses = card.rows.filter(r => r.verdict === 'miss');
  const open = card.rows.filter(r => r.verdict === 'unknown');
  const notes = [...misses, ...open].map(r => `${r.label.toLowerCase()} · ${r.why}`);
  return { line: `${card.headline} of your preferences${notes.length ? ` · ${notes.join(', ')}` : ''}`, swap: misses.length > 0 };
}

// ---------------------------------------------------------------- finder

// The preferences the finder checks a pick against, in the finder's words, read from the sheet with
// defaults for anyone who hasn't set it
export interface FinderPrefs {
  matters: Preference[]; // in card order
  budget: number; // a meal should cost about this, $
  never: string[]; // never suggest: allergies and dislikes, filters not scores
  walkMinutes: number; // how far "nearby" is on foot
}

const TO_FINDER: Record<FoodPreference, Preference> = { protein: 'high_protein', lowSpike: 'low_spike', simple: 'simple', noSeedOils: 'no_seed_oils', cheap: 'cheap', lowCalorie: 'low_calorie', highFiber: 'high_fiber' };
const toFinder = (matters: FoodPreference[]) => FINDER_PREFERENCES.filter((p) => matters.some((m) => TO_FINDER[m] === p));

export const DEFAULT_PREFS: FinderPrefs = { matters: toFinder(DEFAULT_MATTERS), budget: 12, never: [], walkMinutes: 10 };

export function readFoodPrefs(settings: UserSettings): FinderPrefs {
  const prefs = settings.foodPrefs;
  const matters = toFinder(prefs?.matters ?? []);
  const never = (prefs?.never ?? []).map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 10);
  return { ...DEFAULT_PREFS, matters: matters.length ? matters : DEFAULT_PREFS.matters, budget: prefs?.budget ?? DEFAULT_PREFS.budget, never };
}
