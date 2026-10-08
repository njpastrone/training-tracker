// Food logging on the phone: finding table foods a log mentions (the AI's candidate list), turning
// the AI's picks into items with USDA macros, the no-AI parser, and editing an item's amount.
// Amount math lives in foodUnits.ts; the prompt in server/src/food.ts.

import { FOODS, MORE_FOODS, foodById } from '../data/foods';
import { CATALOG, normalizeWords, singularWords } from '../data/catalog';
import { catalogHits, editDistance } from '../server/src/identity';
import type { RawFoodItem } from '../server/src/food';
import type { Food, FoodDraft, FoodEntry, FoodItem, FoodUnit, Macros } from '../types/food';
import { macrosFor, parseAmount, toGrams, unitFromWord, convertQty, unitsFor, isMass, isVolume, own } from './foodUnits';
import { englishFoodWords } from './foodWords';

const MAX_CANDIDATES = 50;

// Words that say nothing about which food it is. State words (raw, dry, whole, plain) do: they
// tell "raw chicken" from "chicken" and "whole milk" from "milk".
const FILLER = new Set([
  'a', 'an', 'the', 'and', 'with', 'w', 'of', 'some', 'my', 'had', 'have', 'having', 'ate', 'eat', 'eaten', 'drank', 'for',
  'on', 'in', 'to', 'then', 'plus', 'just', 'like', 'about', 'little', 'bit', 'big', 'small', 'medium', 'large', 'cup',
  'slice', 'piece', 'scoop', 'handful', 'serving', 'bowl', 'plate', 'glass', 'g', 'oz', 'lb', 'today', 'yesterday',
  'breakfast', 'lunch', 'dinner', 'snack', 'after', 'before', 'also', 'it', 'was', 'i', 'uh', 'um', 'so', 'maybe',
]);

// Food words that are also gym words: they never make a log look like food on their own
const GYM_WORDS = new Set(['leg', 'arm', 'back', 'chest', 'bar', 'plate', 'press', 'dip', 'fly', 'curl', 'row', 'run', 'wing', 'squash', 'shoulder', 'loin', 'rack', 'wrap']);

const key = (s: string) => singularWords(s);

// Exercise names of two or more words: a food word inside one ("glute ham raise", "foam roll") isn't food
const EXERCISE_PHRASES = new Set(CATALOG.filter((e) => !e.replacedBy).flatMap((e) => [e.name, ...e.aliases].map(key).filter((k) => k.includes(' '))));

interface Index {
  phrases: Map<string, string>; // a whole name or alias → food id
  words: Map<string, Set<string>>; // one word of a name or alias → food ids
}

function buildIndex(foods: Food[]): Index {
  const phrases = new Map<string, string>();
  const words = new Map<string, Set<string>>();
  for (const f of foods) {
    for (const w of [f.name, ...f.aliases]) {
      const k = key(w);
      if (k && !phrases.has(k)) phrases.set(k, f.id);
      for (const word of k.split(' ')) {
        if (!word || FILLER.has(word)) continue; // numbers stay: "93" lean, "2" % milk
        words.set(word, (words.get(word) ?? new Set()).add(f.id));
      }
    }
  }
  return { phrases, words };
}

const core = buildIndex(FOODS);
const more = buildIndex(MORE_FOODS);
const vocabulary = [...new Set([...core.words.keys(), ...more.words.keys()])];

// The log as singular words, amounts dropped. Numbers that name a food stay: "93%" lean, "80/20" beef.
// Emoji and common foreign food words become the table's English first ("huevos", "🍳" → egg).
const logWords = (log: string) =>
  key(englishFoodWords(log).replace(/(\d+)\s*%/g, ' pct$1 ').replace(/\b(\d\d)\/(\d\d?)\b/g, ' pct$1 pct$2 ').replace(/(?<![a-z\d])\d+([.,/]\d+)?/g, ' '))
    .split(' ')
    .filter(Boolean)
    .map((w) => w.replace(/^pct(\d+)$/, '$1'));

// A word as the table spells it: itself, or the one table word it's a typo of ("bannana" → "banana")
function tableWord(word: string): string | undefined {
  if (core.words.has(word) || more.words.has(word)) return word;
  const typos = word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0;
  if (!typos) return undefined;
  const near = vocabulary.filter((v) => Math.abs(v.length - word.length) <= typos && editDistance(word, v) <= typos);
  return near.length === 1 ? near[0] : undefined;
}

// Table ids named outright in the log: whole names or aliases, longest first
// The phrases in the log that name a food outright, longest first, with the food each names
function phrasesIn(words: string[], index: Index): [string, string][] {
  const hits: [string, string][] = [];
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      const id = index.phrases.get(phrase);
      if (id) hits.push([phrase, id]);
    }
  }
  return hits;
}
const phraseHits = (words: string[], index: Index) => phrasesIn(words, index).map(([, id]) => id);

// The foods the model picks from: those the log names outright, then those sharing its words (the
// most shared words first, plain names before long ones). The long tail only comes in for words the
// core table doesn't know ("venison", "jicama"), so its near-duplicates of core foods ("Pork, loin,
// tenderloin" next to "Pork tenderloin") never compete with the usual pick.
export function buildFoodCandidates(log: string): Food[] {
  const words = logWords(log).map((w) => tableWord(w) ?? w);
  const tail = words.filter((w) => !core.words.has(w) && !FILLER.has(w));
  const ids = [...phraseHits(words, core), ...phrasesIn(words, more).filter(([p]) => p.split(' ').some((w) => tail.includes(w))).map(([, id]) => id)];
  for (const [index, ws] of [[core, words], [more, tail]] as const) {
    const score = new Map<string, number>();
    for (const w of new Set(ws)) for (const id of index.words.get(w) ?? []) score.set(id, (score.get(id) ?? 0) + 1);
    ids.push(
      ...[...score]
        .sort(([a, x], [b, y]) => y - x || foodById.get(a)!.name.length - foodById.get(b)!.name.length)
        .map(([id]) => id),
    );
  }
  return [...new Set(ids)].slice(0, MAX_CANDIDATES).map((id) => foodById.get(id)!);
}

// How a food is listed for the model
export const candidateName = (f: Food) =>
  (f.state === 'cooked' && !/cook|roast|grill|boil|bake|fried|broil|steam|scrambl|poach/i.test(f.name) ? `${f.name} (cooked)` : f.name).slice(0, 80);

// The candidate list as the model sees it: a food the log's own words name gets "(usual for
// "greek yogurt")", so the plain default wins over variants nobody asked for
export function candidateNames(log: string, foods: Food[]): string[] {
  const usual = new Map<string, string>();
  for (const [phrase, id] of phrasesIn(logWords(log).map((w) => tableWord(w) ?? w), core)) {
    if (!usual.has(id) && phrase !== key(foodById.get(id)!.name)) usual.set(id, phrase);
  }
  return foods.map((f) => {
    const name = candidateName(f);
    const label = usual.get(f.id) && ` (usual for "${usual.get(f.id)}")`;
    return label && name.length + label.length <= 80 ? name + label : name;
  });
}

const EATING = /\b(ate|eat|eaten|eating|breakfast|brunch|lunch|dinner|supper|snack(ed|s)?|meal|drank|drink(ing)?|dessert|munch(ed)?|grabbed a bite)\b/;
const FOOD_AMOUNT = /\d\s*(g|grams?|oz|ounces?|cups?|tbsp|tsp|tablespoons?|teaspoons?|ml|slices?|scoops?)\b|\b(a|one|two|half a?) (cup|slice|scoop|handful|bowl|glass|tablespoon|teaspoon)s? of\b/;
const DISHES = /\b(pizza|burger|cheeseburger|burrito|sandwich|sub|salad|taco|tacos|sushi|pho|ramen|shake|smoothie|latte|cappuccino|frappuccino|big mac|whopper|mcmuffin|mcchicken|nuggets|fries|wings|quesadilla|nachos|curry|stir fry|pasta|mcdonald'?s|chipotle|starbucks|subway|chick fil a|taco bell|wendy'?s|burger king|domino'?s|panda express|dunkin|dunks|kfc|popeyes|five guys|in n out|protein bar|quest bar|clif bar)\b/;

// Does the log seem to mention food? Words the table knows (not gym words like "legs"), eating
// words, kitchen amounts, or a dish or restaurant. Workouts alone must stay false.
export function mentionsFood(log: string): boolean {
  const lower = englishFoodWords(log).toLowerCase();
  if (EATING.test(lower) || FOOD_AMOUNT.test(lower) || DISHES.test(normalizeWords(lower))) return true;
  // No typo matching here: "plank" is one letter from "flank"
  const words = logWords(log);
  const exercise = new Set<number>();
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      if (EXERCISE_PHRASES.has(words.slice(i, i + n).join(' '))) for (let j = i; j < i + n; j++) exercise.add(j);
    }
  }
  for (let n = 1; n <= 4; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      const inExercise = words.slice(i, i + n).every((_, j) => exercise.has(i + j));
      if (core.phrases.has(phrase) && !GYM_WORDS.has(phrase) && !inExercise) return true;
    }
  }
  return false;
}

// Unrounded (the card rounds), so typing a new amount digit by digit never loses precision
const scaleMacros = (m: Macros, k: number): Macros => ({
  kcal: m.kcal * k,
  protein: m.protein * k,
  carbs: m.carbs * k,
  fat: m.fat * k,
  ...(m.fiber !== undefined ? { fiber: m.fiber * k } : {}),
});

// An amount the conversion knows exactly: a weight or volume ("200 g", "1.5 cups"), a unit USDA
// weighs for this food ("2 slices", "1 large"), or a count of whole items it weighs ("2 eggs")
function exactAmount(food: Food, qty: number | undefined, unit: FoodUnit | undefined, how?: string) {
  if (qty === undefined && !unit) return false;
  if (unit) return isMass(unit) || isVolume(unit) || own(food, unit) !== undefined;
  return how === 'portion' || how === 'size';
}

// A table food and an amount as an item. An exact amount is weighed by the conversion, and a plain
// name is the default serving. A vague amount ("some", "a bit") or a size or container USDA doesn't
// weigh for this food ("medium fries", "a bowl") takes the model's weight, which reads the context;
// a vague name then shows in grams. Without the model's weight it's the conversion's convention. A count of 50+ with no unit
// far off the model's weight is a misread amount ("200 chicken" isn't 200 breasts) and shows in grams,
// so the amount, the weight and the numbers always agree.
export function itemFor(food: Food, qty?: number, unit?: FoodUnit, said?: string, modelGrams?: number): FoodItem {
  const weighed = toGrams(food, qty, unit);
  const converted = weighed?.grams;
  const misread = !unit && (qty ?? 0) >= 50 && !!converted && !!modelGrams && converted / modelGrams > 4;
  // A plain name is the table's standard serving; a vague one ("some rice", "a bit of cheese") the model's weight
  const vague = qty === undefined && !unit && !!said && VAGUE.test(normalizeWords(said));
  if (modelGrams && (misread || !converted || vague)) return itemFor(food, Math.round(modelGrams), 'g', said);
  const exact = exactAmount(food, qty, unit, weighed?.how);
  const plainName = qty === undefined && !unit;
  const grams = Math.round(!exact && !plainName && modelGrams ? modelGrams : (converted ?? toGrams(food, undefined, undefined)?.grams ?? 100));
  const amount = converted ? { qty, unit } : { qty: grams, unit: 'g' as const };
  return { name: food.name, ...(said ? { said } : {}), foodId: food.id, ...amount, grams, macros: macrosFor(food, grams), source: 'usda' };
}

export type Portions = Map<string, { qty: number; unit: FoodUnit }>;

// The weight or volume you last logged of each table food: a name alone means your usual portion.
// Counts and sizes aren't remembered: "banana" is one banana even after "3 bananas".
export function usualPortions(entries: FoodEntry[]): Portions {
  const out: Portions = new Map();
  for (const e of [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    for (const i of e.items) {
      if (i.foodId && i.qty !== undefined && i.unit && (isMass(i.unit) || isVolume(i.unit)) && !out.has(i.foodId)) out.set(i.foodId, { qty: i.qty, unit: i.unit });
    }
  }
  return out;
}

// The model's items, matched to the table: a pick gets USDA macros for its amount (your usual
// portion when none was said); anything else keeps the model's estimate. An amount in a unit the
// app doesn't know becomes grams.
export function resolveItems(raw: RawFoodItem[], candidates: Food[], usual: Portions = new Map()): FoodDraft['items'] {
  return raw.flatMap((r): FoodDraft['items'][number] | FoodDraft['items'] => {
    const unit = r.unit ? unitFromWord(r.unit) : undefined;
    const known = !r.unit || unit;
    const [qty, u] = known ? [r.qty, unit] : r.grams ? [r.grams, 'g' as const] : [r.qty, undefined];
    const day = r.dayOffset ? { dayOffset: r.dayOffset } : {};
    const food = r.food !== undefined ? candidates[r.food] : undefined;
    const mine = food && qty === undefined && !u ? usual.get(food.id) : undefined;
    if (mine) return { ...itemFor(food!, mine.qty, mine.unit, r.said), ...day };
    if (food) return { ...itemFor(food, qty, u, r.said, r.grams), ...day };
    if (r.estimate) {
      return { name: r.name ?? r.said ?? 'Food', ...(r.said ? { said: r.said } : {}), qty, unit: u, ...(r.grams ? { grams: Math.round(r.grams) } : {}), macros: r.estimate, source: 'estimate' as const, ...day };
    }
    // Food the model gave no numbers for: the table foods its words name ("chicken rice and
    // broccoli" is three), else an empty estimate to fill in
    const local = localFoodParse(r.said ?? r.name ?? '', usual).items;
    if (local.length && local.every((i) => i.source === 'usda')) return local.map((i) => ({ ...i, ...day }));
    return { name: r.name ?? r.said ?? 'Food', ...(r.said ? { said: r.said } : {}), qty, unit: u, macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'estimate' as const, ...day };
  });
}

// The one table food a phrase names: a whole name or alias; else the food sharing the most words
// with it, at least two ("ground beef 93" → 93% lean, core table first); else a name or alias inside
// it ("grilled salmon" → salmon); else nothing. One word alone never matches part of a name ("pizza"
// isn't pizza sauce).
export function matchFood(phrase: string): Food | undefined {
  const words = logWords(phrase).map((w) => tableWord(w) ?? w).filter((w) => !FILLER.has(w));
  if (!words.length) return undefined;
  const whole = words.join(' ');
  const exact = core.phrases.get(whole) ?? more.phrases.get(whole);
  if (exact) return foodById.get(exact);
  for (const index of [core, more]) {
    const score = new Map<string, number>();
    for (const w of new Set(words)) for (const id of index.words.get(w) ?? []) score.set(id, (score.get(id) ?? 0) + 1);
    const best = [...score].sort(([a, x], [b, y]) => y - x || foodById.get(a)!.name.length - foodById.get(b)!.name.length)[0];
    if (best && best[1] >= 2) return foodById.get(best[0]);
  }
  const hit = phraseHits(words, core)[0] ?? phraseHits(words, more)[0];
  return hit ? foodById.get(hit) : undefined;
}

// Chatter before the food: "uh so I had", "for breakfast", "lunch was"
const CHATTER = /^(?:(?:uh|um|so|like|i|we|had|have|ate|eaten|eat|having|drank|then|also|and|just|for (?:breakfast|lunch|dinner|a snack)|(?:breakfast|lunch|dinner|snack) (?:was|is))\b[\s,]*)+/i;
const COUNTED = new Set<FoodUnit>(['each', 'small', 'medium', 'large', 'xl', 'piece']);

// Without AI: one food per comma, line, "and", "with" or "then" (unless the whole phrase is one
// food, like "mac and cheese"), each read as amount + food. A plural with no number ("eggs and
// toast") is two. Unknown foods stay as rows to fill in.
export function localFoodParse(log: string, usual: Portions = new Map()): FoodDraft {
  const parts = log
    .split(/(?<!\d),|,(?!\d)|[\n;+&]|\bthen\b|\bplus\b/i) // not inside "1,5"
    .flatMap((p) => (matchFood(p) && core.phrases.has(key(parseAmount(p).rest)) ? [p] : p.split(/\band\b|\bwith\b|\bw\/|\bw\b/i)))
    .map((p) => p.replace(CHATTER, '').trim())
    .filter((p) => logWords(p).some((w) => !FILLER.has(w)));
  const items = parts.map((part): FoodItem => {
    const { qty, unit, rest } = parseAmount(part);
    const food = matchFood(rest);
    const last = normalizeWords(rest).split(' ').pop() ?? '';
    const plural = qty === undefined && !unit && food && COUNTED.has(food.serving.unit) && key(last) !== last;
    const mine = food && qty === undefined && !unit && !plural ? usual.get(food.id) : undefined;
    if (mine) return itemFor(food!, mine.qty, mine.unit, part);
    if (food) return itemFor(food, plural ? 2 : qty, unit, part);
    return { name: rest.charAt(0).toUpperCase() + rest.slice(1), said: part, qty, unit, macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, source: 'estimate' };
  });
  return { items, confidence: 0.4 };
}

const WORKOUT_WORDS = /\b(\d+ ?x ?\d+|sets?|reps?|workout|work out|worked out|gym|lift(ed|ing)?|trained|training|cardio|miles?|km|ran|run|jog(ged)?|walk(ed)?|hike|hiked|swam|swim|bike|biked|yoga|pilates|stretch(ed)?|pr|leg day|push day|pull day)\b/;

// Does the log seem to mention a workout? Catalog exercises or workout words.
export const mentionsWorkout = (log: string) => WORKOUT_WORDS.test(log.toLowerCase()) || catalogHits(log).length > 0;

// Without AI, a message with a workout and food in it: each comma, line or "then" goes to the side
// it reads as. Text with no food words is all workout.
export function splitLog(input: string): { workout: string; food: string } {
  const parts = input.split(/(?<!\d),|,(?!\d)|[\n;]+|\bthen\b/i).map((p) => p.trim()).filter(Boolean);
  const isFood = (p: string) => mentionsFood(p) || (!mentionsWorkout(p) && !!matchFood(parseAmount(p).rest));
  return { workout: parts.filter((p) => !isFood(p)).join('\n'), food: parts.filter(isFood).join('\n') };
}

// Amounts the AI reads better from context than a fixed convention: "some rice", "a big bowl"
const VAGUE = /\b(some|bit|little|lot|lots|big|huge|giant|bowl|plate|splash|dollop|drizzle|knob|half|leftover|leftovers)\b/;

// A food log the phone could read as well as the AI: plain whole foods from the core table, each with
// an amount or a name alone, nothing unknown, no vague amount, no dish, brand or workout words. Null
// otherwise. The app doesn't use it: evals/food measures it as the "phone first" alternative, which
// tied the AI on accuracy but took only 11% of realistic held-out messages.
export function confidentLocal(log: string, usual: Portions = new Map()): FoodDraft | null {
  const words = normalizeWords(log);
  if (mentionsWorkout(log) || DISHES.test(words) || VAGUE.test(words) || /\d+\s*(?:-|to)\s*\d+|\bor\b|\?/.test(log)) return null;
  const draft = localFoodParse(log, usual);
  // Every word naming each food is one of that food's own words: "egg mcmuffin" isn't eggs
  const covered = (i: FoodItem) => {
    const f = i.foodId ? foodById.get(i.foodId) : undefined;
    if (!f || !FOODS.includes(f)) return false;
    const { rest } = parseAmount(i.said ?? '');
    if (/\d\s*[a-z]/i.test(rest)) return false; // an amount it couldn't read: "ground beef 150g raw"
    // The words are exactly one of the food's names: "steak potato" (no comma) is two foods
    const words = logWords(rest).map((w) => tableWord(w) ?? w).filter((w) => !FILLER.has(w)).join(' ');
    return core.phrases.get(words) === f.id;
  };
  return draft.items.length && draft.items.every(covered) ? { ...draft, confidence: 0.9 } : null;
}

// A new amount for an item: table foods recompute from USDA, estimates scale with the amount
export function setQty(item: FoodItem, qty: number): FoodItem {
  const food = item.foodId ? foodById.get(item.foodId) : undefined;
  if (food) {
    const perUnit = item.grams && item.qty ? item.grams / item.qty : undefined;
    // An inexact amount ("1 bowl", "1 medium" fries) keeps the weight per unit it was logged with
    const weighed = toGrams(food, qty, item.unit);
    const exact = weighed && exactAmount(food, qty, item.unit, weighed.how);
    const grams = Math.round(exact ? weighed.grams : perUnit ? perUnit * qty : weighed?.grams ?? 100);
    return { ...item, qty, grams, macros: macrosFor(food, grams) };
  }
  const k = qty / (item.qty ?? 1);
  return { ...item, qty, ...(item.grams ? { grams: Math.round(item.grams * k) } : {}), macros: scaleMacros(item.macros, k) };
}

// The same food in another unit ("2 large" eggs → "100 g"): the weight stays, the number changes
export function setUnit(item: FoodItem, unit: FoodUnit): FoodItem {
  const food = item.foodId ? foodById.get(item.foodId) : undefined;
  if (!food) return item;
  const qty = convertQty(food, item.qty ?? food.serving.qty, item.qty === undefined ? food.serving.unit : item.unit, unit);
  return setQty({ ...item, unit, qty }, qty);
}

// Other table foods the user may have meant ("Rice, brown", "Rice, white, dry"), for a one-tap swap
// (close siblings first: those sharing the most words with what was said and the food's name)
export function alternatives(item: FoodItem, max = 3): Food[] {
  return buildFoodCandidates(`${item.said ?? ''} ${item.name}`).filter((f) => f.id !== item.foodId).slice(0, max);
}

// The same amount of another table food: in the same unit when it has a weight for it, else in grams
export function swapFood(item: FoodItem, food: Food): FoodItem {
  const sameUnit = item.qty === undefined || !item.unit || toGrams(food, item.qty, item.unit);
  return sameUnit ? itemFor(food, item.qty, item.unit, item.said) : itemFor(food, item.grams, 'g', item.said);
}

const WEIGHTS: FoodUnit[] = ['g', 'oz', 'ml', 'fl_oz'];

// The few units the review card's unit chip steps through, always in the same order: the food's own
// (slice, cup, breast), then grams and ounces (ml and fl oz for drinks)
export function unitChoices(food: Food): FoodUnit[] {
  const all = unitsFor(food);
  const own = all.find((u) => !WEIGHTS.includes(u));
  return [...new Set([food.serving.unit, own, ...all.filter((u) => WEIGHTS.includes(u))])].filter((u): u is FoodUnit => !!u && all.includes(u));
}

// The unit after this one on the chip
export function nextUnit(food: Food, current?: FoodUnit): FoodUnit {
  const list = unitChoices(food);
  return list[(list.indexOf(current ?? food.serving.unit) + 1) % list.length];
}

// Totals for a list of items
export function sumMacros(items: { macros: Macros }[]): Macros {
  const t = items.reduce((s, { macros: m }) => ({ kcal: s.kcal + m.kcal, protein: s.protein + m.protein, carbs: s.carbs + m.carbs, fat: s.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { kcal: Math.round(t.kcal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) };
}

// "42 g protein · 520 kcal": protein first, the number a lifter acts on
export const macroLine = (m: Macros) => `${Math.round(m.protein)} g protein · ${Math.round(m.kcal).toLocaleString('en-US')} kcal`;
