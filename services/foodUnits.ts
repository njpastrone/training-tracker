// Food amounts: reads "1½ cups", "a handful of", "200g" out of what people type, and weighs any
// amount of a table food from its USDA portions (types/food.ts Food.units). Pure: foods are passed in.
import type { Food, FoodUnit, Macros, MassUnit, PortionUnit, SizeUnit, VolumeUnit } from '../types/food';
import { normalizeWords, singularWords } from '../data/catalog';

export type Amount = { qty?: number; unit?: FoodUnit; rest: string };
// How a weight was found: exact mass, the food's own volume/size/portion weights, its default
// serving, or a generic number for the unit or size (a handful of nuts ≈ 28 g)
export type Weighed = { grams: number; how: 'mass' | 'volume' | 'portion' | 'size' | 'serving' | 'generic' };

const CUP = 236.588; // ml in a US cup
const FL_OZ = CUP / 8;
const GRAMS: Record<MassUnit, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const ML: Record<VolumeUnit, number> = {
  ml: 1, l: 1000, tsp: CUP / 48, tbsp: CUP / 16, cup: CUP, fl_oz: FL_OZ, pint: CUP * 2, quart: CUP * 4, gallon: CUP * 16,
};
const SIZES: SizeUnit[] = ['each', 'small', 'medium', 'large', 'xl'];
// One item of a size against a medium one: rounded averages of USDA small/medium/large/extra large
// weights for banana, apple, egg, orange, onion, carrot and tomato
const SIZE: Record<SizeUnit, number> = { each: 1, small: 0.8, medium: 1, large: 1.3, xl: 1.45 };
// What one counted item is ("2 eggs", "a banana") when the serving isn't itself one item
const COUNT: FoodUnit[] = ['each', 'medium', 'large', 'small', 'xl', 'piece', 'breast', 'thigh', 'drumstick', 'wing',
  'fillet', 'patty', 'link', 'bar', 'slice', 'strip', 'stick', 'container', 'packet', 'can', 'bottle'];

export const isMass = (u: FoodUnit): u is MassUnit => u in GRAMS;
export const isVolume = (u: FoodUnit): u is VolumeUnit => u in ML;
const isSize = (u: FoodUnit): u is SizeUnit => SIZES.includes(u as SizeUnit);
const isPortion = (u: FoodUnit): u is PortionUnit => !isMass(u) && !isVolume(u) && !isSize(u);
// A unit USDA weighs for this food; USDA bacon comes in slices, so a strip is a slice
export const own = (food: Food, u: FoodUnit) => (isMass(u) ? undefined : food.units[u] ?? (u === 'strip' ? food.units.slice : undefined));
const r1 = (n: number) => Math.round(n * 10) / 10;
const text = (f: Food) => `${f.id} ${f.name}`.toLowerCase();

// Drinks, plus milks, juices, kefir and broth filed elsewhere (not milk chocolate or milk powder):
// their "oz" is fluid ounces, and with no volume data they weigh like water
const isLiquid = (f: Food) =>
  f.category === 'drinks' ||
  (f.category !== 'sweets_snacks' && f.state !== 'dry' && /milk|juice|kefir|broth/.test(text(f)) && !/powder|dried/.test(text(f)));

// ---------- Reading amounts ----------

const WORDS = new Map<string, FoodUnit>(Object.entries({
  g: 'g', gr: 'g', gram: 'g', gramme: 'g', kg: 'kg', kilo: 'kg', kilogram: 'kg', kilogramme: 'kg',
  oz: 'oz', ounce: 'oz', lb: 'lb', pound: 'lb',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml', cc: 'ml', l: 'l', liter: 'l', litre: 'l', ltr: 'l',
  t: 'tsp', tsp: 'tsp', teaspoon: 'tsp', teaspoonful: 'tsp', tbsp: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tblsp: 'tbsp', tablespoon: 'tbsp',
  tablespoonful: 'tbsp', spoon: 'tbsp', spoonful: 'tbsp',
  c: 'cup', cup: 'cup', mug: 'cup', 'fl oz': 'fl_oz', floz: 'fl_oz', 'fluid ounce': 'fl_oz', 'fluid oz': 'fl_oz',
  pt: 'pint', pint: 'pint', qt: 'quart', quart: 'quart', gal: 'gallon', gallon: 'gallon',
  each: 'each', ea: 'each', whole: 'each',
  sm: 'small', small: 'small', med: 'medium', medium: 'medium', lg: 'large', large: 'large',
  xl: 'xl', 'extra large': 'xl', 'x large': 'xl', jumbo: 'xl', huge: 'xl', giant: 'xl',
  slice: 'slice', piece: 'piece', pc: 'piece', scoop: 'scoop', handful: 'handful', serving: 'serving', portion: 'serving',
  bowl: 'bowl', plate: 'plate', can: 'can', tin: 'can', bottle: 'bottle', glass: 'glass', packet: 'packet', pack: 'packet', sachet: 'packet',
  bar: 'bar', stick: 'stick', clove: 'clove', strip: 'strip', rasher: 'strip', link: 'link', patty: 'patty',
  fillet: 'fillet', filet: 'fillet', breast: 'breast', thigh: 'thigh', drumstick: 'drumstick', wing: 'wing',
  leaf: 'leaf', leaves: 'leaf', stalk: 'stalk', spear: 'spear', wedge: 'wedge', container: 'container', tub: 'container',
  shot: 'shot', pat: 'pat', square: 'square', sheet: 'sheet',
} satisfies Record<string, FoodUnit>));

// Kitchen words that are a multiple of a unit: decilitres and centilitres (European labels and
// recipes), and conventions from the research scout's catalog: a dollop ≈ 2 tbsp, a splash ≈ 30 ml,
// a drizzle ≈ 2 tsp, a knob of butter ≈ 10 g
const SCALED = new Map<string, [FoodUnit, number]>([
  ['dl', ['ml', 100]], ['deciliter', ['ml', 100]], ['decilitre', ['ml', 100]], ['cl', ['ml', 10]],
  ['dollop', ['tbsp', 2]], ['splash', ['fl_oz', 1]], ['drizzle', ['tsp', 2]], ['knob', ['g', 10]],
]);

// Any spelling, plural or abbreviation of a unit: "grams", "Tbsp", "fl. oz.", "patties". A capital
// T is a tablespoon and a small t a teaspoon, as in recipes.
export function unitFromWord(word: string): FoodUnit | undefined {
  const w = word.trim();
  if (w === 'T' || w === 'T.') return 'tbsp';
  return WORDS.get(normalizeWords(w)) ?? WORDS.get(singularWords(w));
}

const GLYPHS = '½⅓⅔¼¾⅛⅜⅝⅞';
const FRAC: Record<string, number> = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 };
const NUMBERS = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const OF = '(?: of)?(?: an?| the)?'; // "half of an", "half the"
const word = (src: string, n: number): [RegExp, number] => [new RegExp(`^(?:${src})(?= |$)`, 'i'), n];
const WORD_QTY = [
  word('(?:a )?half(?: a| an)? dozen(?: of)?', 6),
  word('(?:a |one )?dozen(?: of)?', 12),
  word('(?:a )?(?:couple|pair)(?: of)?', 2),
  word('(?:a )?few(?: of)?|several(?: of)?', 3),
  word(`(?:a |one )?half${OF}`, 1 / 2),
  word(`(?:a |one )?quarter${OF}`, 1 / 4),
  word(`(?:a |one )?third${OF}`, 1 / 3),
  word(`(?:two|2) thirds${OF}`, 2 / 3),
  word(`three quarters?${OF}`, 3 / 4),
  word('an?', 1),
];
// Numbers and amount words that belong to a name: "3 Musketeers", "half and half", "whole milk"
const NAMES = /^(?:3 musketeers|100 grand|7 up|5 hour|half (?:and|&|n) half|a la|(?:a )?quarter pounder|whole (?:milk|wheat|grains?|foods?)|medium (?:rare|well))(?= |$)/i;
const FILLERS = /^(?:(?:some|like|about|around|roughly|maybe|approx|approximately|just|only)\.? )+/i;

type Read = { n: number; rest: string };
const after = (s: string, m: RegExpMatchArray) => s.slice(m[0].length).trimStart();
const stripFillers = (s: string) => s.replace(FILLERS, '');

// Spaces out what people glue together and drops brackets: "1½" → "1 ½", "200g" → "200 g",
// "2-3" → "2 to 3", "2x50g" → "2 x 50 g", "(200 g)" → "200 g". "7up" stays: "up" isn't a unit.
function tidy(s: string): string {
  return s
    .replace(/⁄/g, '/')
    .replace(/[()[\]{};:~≈]/g, ' ')
    .replace(/,(?!\d)/g, ' ')
    .replace(/(\D),/g, '$1 ')
    .replace(new RegExp(`([\\d${GLYPHS}])\\s*[-–—]\\s*(?=[\\d${GLYPHS}])`, 'g'), '$1 to ')
    .replace(/\s[-–—]+\s/g, ' ')
    .replace(new RegExp(`(\\d)(?=[${GLYPHS}])`, 'g'), '$1 ')
    .replace(new RegExp(`([${GLYPHS}])(?=\\S)`, 'g'), '$1 ')
    .replace(/(\d)\s*[x×*]\s*(?=[\d\s]|$)/gi, '$1 x ')
    .replace(/(\d)([a-z][a-z.]*)/gi, (m, d: string, w: string) => (unitFromWord(w) ? `${d} ${w}` : m))
    .replace(/\s+/g, ' ')
    .trim();
}

// "1/2" or "½"; never "80/20" (ground beef) or "96/4"
function readFraction(s: string): Read | null {
  const m = s.match(new RegExp(`^(?:(\\d+)/(\\d+)|([${GLYPHS}]))(?= |$)`));
  const n = m ? (m[3] ? FRAC[m[3]] : +m[1] / +m[2]) : 0;
  return m && n > 0 && n < 1 ? { n, rest: after(s, m) } : null;
}

// "2", "1.5", "1,5", ".5", "1 1/2", "1 ½"; never "2%" (2% milk) or "7up"
function readNumber(s: string): Read | null {
  const frac = readFraction(s);
  if (frac) return frac;
  const m = s.match(/^(\d+(?:[.,]\d+)?|\.\d+)(?= |$)/);
  if (!m || after(s, m).startsWith('%')) return null;
  const n = +m[1].replace(/,(?=\d{3}$)/, '').replace(',', '.');
  const mixed = Number.isInteger(n) ? readFraction(after(s, m)) : null;
  return mixed ? { n: n + mixed.n, rest: mixed.rest } : { n, rest: after(s, m) };
}

function readWords(s: string): Read | null {
  for (const [re, n] of WORD_QTY) {
    const m = s.match(re);
    if (m) return { n, rest: after(s, m) };
  }
  const m = s.match(/^[a-z]+(?= |$)/i);
  const i = m ? NUMBERS.indexOf(m[0].toLowerCase()) : -1;
  return m && i >= 0 ? { n: i + 1, rest: after(s, m) } : null;
}

const readBase = (s: string) => readNumber(s) ?? readWords(s);

function readUnit(s: string): { unit: FoodUnit; rest: string; times?: number } | null {
  const words = s.split(' ');
  const scaled = SCALED.get(singularWords(words[0] ?? ''));
  if (scaled) return { unit: scaled[0], rest: words.slice(1).join(' '), times: scaled[1] };
  for (const k of [2, 1]) {
    const unit = words.length >= k ? unitFromWord(words.slice(0, k).join(' ')) : undefined;
    if (unit) return { unit, rest: words.slice(k).join(' ') };
  }
  return null;
}

const isMeasure = (s: string) => {
  const u = readUnit(s)?.unit;
  return !!u && (isMass(u) || isVolume(u));
};

function readQty(s: string): { qty: number; rest: string } | null {
  if (NAMES.test(s)) return null;
  const base = readBase(s);
  if (!base) return null;
  let { n, rest } = base;
  // "one and a half", "2 and 1/4"
  const and = rest.match(/^and (?=\S)/i);
  const plus = and && Number.isInteger(n) ? readBase(after(rest, and)) : null;
  if (plus && plus.n < 1) ({ n, rest } = { n: n + plus.n, rest: plus.rest });
  // "2 to 3", "2 or 3" → 2.5; "1-1/2" (tidied to "1 to 1/2") is 1½
  const to = rest.match(/^(?:to|or) /i);
  const second = to ? readBase(after(rest, to)) : null;
  if (second && second.n > n) ({ n, rest } = { n: (n + second.n) / 2, rest: second.rest });
  else if (second && Number.isInteger(n) && second.n < 1) ({ n, rest } = { n: n + second.n, rest: second.rest });
  // "2 dozen"
  const dozen = rest.match(/^dozen(?: of)?(?= |$)/i);
  if (dozen) ({ n, rest } = { n: n * 12, rest: after(rest, dozen) });
  // "2 x 50 g", "2x", and one amount inside another: "a 12 oz steak", "two 50 g bars"
  const x = rest.match(/^x(?= |$)/i);
  if (x) rest = after(rest, x);
  const times = readNumber(rest);
  if (times && (x || isMeasure(times.rest))) ({ n, rest } = { n: n * times.n, rest: times.rest });
  return { qty: n, rest };
}

// A leading quantity: digits, decimals, fractions (1/2, 1 1/2, ½, 1½), ranges (2-3 → 2.5), words
// ("a", "one and a half", "a couple of", "half a dozen") and multipliers ("2 x 50g" → 100 + "g")
export function parseQuantity(text: string): { qty: number; rest: string } | null {
  return readQty(stripFillers(tidy(text)));
}

// Amount, unit and food words at the start. A portion word that ends the phrase is the food itself
// ("2 wings"); without a number only a size ("large fries") or "<unit> of" ("glass of milk") counts.
function lead(s: string, inTail = false): Amount | null {
  if (NAMES.test(s)) return null;
  const q = readQty(s);
  let qty = q?.qty;
  let rest = q ? q.rest : s;
  let unit: FoodUnit | undefined;
  const u = NAMES.test(rest) ? null : readUnit(rest);
  const take = u && (q
    ? inTail || !isPortion(u.unit) || u.rest !== ''
    : (isSize(u.unit) && u.unit !== 'each') || /^of(?: |$)/i.test(u.rest));
  if (u && take) {
    unit = u.unit;
    rest = u.rest;
    if (u.times) qty = (qty ?? 1) * u.times; // "1,5 dl" → 150 ml, "a knob" → 10 g
    const half = rest.match(/^and (?:a )?half(?= |$)/i); // "a cup and a half"
    if (half && qty !== undefined) ({ qty, rest } = { qty: qty + 0.5, rest: after(rest, half) });
  }
  if (qty === undefined && !unit) return null;
  const out: Amount = { rest: rest.replace(/^of(?: |$)/i, '') };
  if (qty !== undefined) out.qty = qty;
  if (unit) out.unit = unit;
  return out;
}

// An amount after the food: "chicken 200g", "chicken breast (200 g)", "eggs x2". A bare number
// after a name stays in it ("v 8", "eggs 2" is left for the caller).
function trail(s: string): Amount | null {
  const words = s.split(' ');
  for (let i = 1; i < words.length; i++) {
    const tail = stripFillers(words.slice(i).join(' '));
    const x = tail.match(/^[x×] ?(\d+)$|^(\d+) [x×]$/i);
    const a = x ? { qty: +(x[1] ?? x[2]), rest: '' } : lead(tail, true);
    if (a && a.qty !== undefined && !a.rest && (x || a.unit)) return { ...a, rest: words.slice(0, i).join(' ') };
  }
  return null;
}

// Splits one food phrase into amount, unit and food words: "1 1/2 cups cooked rice" →
// { qty: 1.5, unit: 'cup', rest: 'cooked rice' }; "a banana" → { qty: 1, rest: 'banana' } (a count);
// "rice" → { rest: 'rice' } (the default serving). "2 x 50g bars" is 100 g in total.
export function parseAmount(text: string): Amount {
  const s = stripFillers(tidy(text));
  return lead(s) ?? trail(s) ?? { rest: s };
}

// ---------- Weighing ----------

// Grams per ml from the food's own cup/tbsp/tsp/fl oz/ml weight; liquids without one weigh like water
function density(food: Food): number | undefined {
  const u = (['cup', 'tbsp', 'tsp', 'fl_oz', 'ml', 'l', 'pint', 'quart', 'gallon'] as const).find(v => food.units[v]);
  return u ? food.units[u]! / ML[u] : isLiquid(food) ? 1 : undefined;
}

const byVolume = (food: Food, ml: number, how: Weighed['how']): Weighed | null => {
  const d = density(food);
  return d ? { grams: ml * d, how } : null;
};

// The unit one counted item is: the serving's own item (eggs are "large", bananas "medium"), else
// each, a size, or a whole piece (a breast, a patty, a slice of cheese)
const countUnit = (food: Food) => [food.serving.unit, ...COUNT].find(u => COUNT.includes(u) && own(food, u));

function count(food: Food, inServing: boolean): Weighed | null {
  const u = countUnit(food);
  if (u) return { grams: own(food, u)!, how: isSize(u) ? 'size' : 'portion' };
  return inServing ? null : serving(food);
}

function serving(food: Food): Weighed | null {
  const one = perUnit(food, food.serving.unit, true);
  return one && { grams: food.serving.qty * one.grams, how: 'serving' };
}

// A size the food has no weight for, scaled from one it has, else from one whole item or serving
function sized(food: Food, unit: SizeUnit, inServing: boolean): Weighed | null {
  const have = (['medium', 'each', 'large', 'small', 'xl'] as const).find(u => food.units[u]);
  if (have) return { grams: (food.units[have]! * SIZE[unit]) / SIZE[have], how: 'size' };
  const base = count(food, inServing);
  return base && { grams: base.grams * SIZE[unit], how: 'generic' };
}

const kind = (f: Food) => {
  const t = text(f);
  return /beer|lager|stout|cider/.test(t) ? 'beer' : /wine|champagne|prosecco/.test(t) ? 'wine' : /espresso/.test(t) ? 'espresso' : undefined;
};

// Portions the food has no USDA weight for
function portion(food: Food, unit: PortionUnit, inServing: boolean): Weighed | null {
  const generic = (grams: number): Weighed => ({ grams, how: 'generic' });
  switch (unit) {
    case 'serving':
      return inServing ? null : serving(food);
    // 1 oz for nuts and snacks (the usual "1 oz handful"); ~¼ cup of berries or grapes; else ~1 oz
    case 'handful':
      return generic(food.category === 'nuts_seeds' || food.category === 'sweets_snacks' ? 28 : food.category === 'fruit' ? 40 : 30);
    // Protein powder scoops hold ~30 g (whey labels: 30-33 g); ice cream and the rest ½ cup
    case 'scoop':
      return (!/powder|protein|whey|casein|creatine|collagen/.test(text(food)) && byVolume(food, CUP / 2, 'generic')) || generic(30);
    // 1 oz: a USDA slice of bread (25-29 g) or of deli cheese and meat (21-28 g)
    case 'slice':
      return generic(28);
    // Convention: a cereal or soup bowl holds ~1½ cups, a dinner plate ~2 cups
    case 'bowl':
      return byVolume(food, CUP * 1.5, 'generic') ?? generic(300);
    case 'plate':
      return byVolume(food, CUP * 2, 'generic') ?? generic(400);
    // NIAAA standard drinks: 5 fl oz of wine, 12 of beer, 1.5 of spirits; an 8 fl oz glass of the
    // rest; a 1 fl oz espresso shot (USDA)
    case 'glass':
      return byVolume(food, (kind(food) === 'wine' ? 5 : kind(food) === 'beer' ? 12 : 8) * FL_OZ, 'generic');
    case 'shot':
      return byVolume(food, (kind(food) === 'espresso' ? 1 : 1.5) * FL_OZ, 'generic');
    // A 12 fl oz (355 ml) drink can; ~1½ cups drained from a 15 oz food can (USDA canned beans)
    case 'can':
      return byVolume(food, isLiquid(food) ? 12 * FL_OZ : CUP * 1.5, 'generic');
    // A 500 ml water or soda bottle, 12 fl oz of beer, 750 ml of wine
    case 'bottle':
      if (!isLiquid(food)) return count(food, inServing);
      return byVolume(food, kind(food) === 'beer' ? 12 * FL_OZ : kind(food) === 'wine' ? 750 : 500, 'generic');
    case 'pat':
      return generic(5); // USDA butter, 1 pat
    case 'clove':
      return generic(3); // USDA garlic, 1 clove
    case 'leaf': case 'stalk': case 'spear': case 'wedge': case 'square': case 'sheet':
      return null; // too different from food to food (a basil leaf vs a lettuce leaf)
    default:
      return count(food, inServing); // packet, bar, piece, breast, link…: one whole item
  }
}

// Grams in one of the unit; no unit is a count
function perUnit(food: Food | undefined, unit: FoodUnit | undefined, inServing = false): Weighed | null {
  if (unit === 'oz' && food && isLiquid(food)) unit = 'fl_oz'; // "8 oz of milk"
  if (unit && isMass(unit)) return { grams: GRAMS[unit], how: 'mass' };
  if (!food) return unit && isVolume(unit) ? { grams: ML[unit], how: 'volume' } : null; // water-like
  if (!unit || unit === 'each') return count(food, inServing);
  const grams = own(food, unit);
  if (grams) return { grams, how: isVolume(unit) ? 'volume' : isSize(unit) ? 'size' : 'portion' };
  if (isVolume(unit)) return byVolume(food, ML[unit], 'volume');
  if (isSize(unit)) return sized(food, unit, inServing);
  return portion(food, unit, inServing);
}

// Grams in an amount of a food. No qty is one of the unit; no qty and no unit is the food's serving;
// no unit is a count. Without a food only mass and (water-like) volume work. Null: can't tell.
export function toGrams(food: Food | undefined, qty: number | undefined, unit: FoodUnit | undefined): Weighed | null {
  const one = qty === undefined && unit === undefined ? (food ? serving(food) : null) : perUnit(food, unit);
  return one && { grams: r1((qty ?? 1) * one.grams), how: one.how };
}

export function macrosFor(food: Food, grams: number): Macros {
  const k = grams / 100;
  const p = food.per100g;
  return { kcal: Math.round(p.kcal * k), protein: r1(p.protein * k), carbs: r1(p.carbs * k), fat: r1(p.fat * k), fiber: r1(p.fiber * k) };
}

// ---------- Showing and switching ----------

const NAME: Partial<Record<FoodUnit, string>> = { fl_oz: 'fl oz', l: 'L', each: 'whole', xl: 'XL' };
const PLURAL: Partial<Record<FoodUnit, string>> = { glass: 'glasses', patty: 'patties', leaf: 'leaves' };
const SHOWN: [number, string][] = [[1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']];

// Whole grams and ml, metric decimals, else ½ ¼ ¾ ⅓ ⅔ when close or one decimal
function num(n: number, unit?: FoodUnit): string {
  if (unit === 'g' || unit === 'ml') return String(Math.round(n));
  if (unit === 'kg' || unit === 'l') return String(+n.toFixed(2));
  const whole = Math.floor(n);
  const glyph = SHOWN.find(([f]) => Math.abs(n - whole - f) < 0.02)?.[1];
  if (glyph) return `${whole || ''}${glyph}`;
  return String(n > 0 && n < 0.05 ? +n.toPrecision(1) : +n.toFixed(1)); // never "0 cups" for a pinch
}

// What the review card shows: "200 g", "1½ cups", "2 tbsp", "1 large", "3 slices". A count shows the
// item it was weighed as ("2 large" eggs); no amount shows the serving; "oz" of a drink is "fl oz".
export function amountLabel(qty: number | undefined, unit: FoodUnit | undefined, food?: Food): string {
  if (qty === undefined && unit === undefined) return food ? amountLabel(food.serving.qty, food.serving.unit, food) : '1 serving';
  const n = qty ?? 1;
  const u = unit === 'oz' && food && isLiquid(food) ? 'fl_oz' : unit ?? (food && (countUnit(food) ?? 'serving'));
  if (!u) return num(n);
  const plural = n > 1 && (isPortion(u) || u === 'cup' || u === 'pint' || u === 'quart' || u === 'gallon');
  return `${num(n, u)} ${plural ? PLURAL[u] ?? `${u}s` : NAME[u] ?? u}`;
}

// Units for the review card's switcher: the food's items, sizes and portions, then cup and tbsp when
// it has volume data, then g and oz (ml and fl oz for drinks)
export function unitsFor(food: Food): FoodUnit[] {
  const units = Object.keys(food.units) as FoodUnit[];
  const items = [...SIZES.filter(u => food.units[u]), ...units.filter(isPortion)];
  const volumes: FoodUnit[] = density(food) ? ['cup', 'tbsp', ...units.filter(isVolume)] : [];
  return [...new Set([...items, ...volumes, ...(isLiquid(food) ? ['ml', 'fl_oz'] as const : ['g', 'oz'] as const)])];
}

// Rounding steps per unit: whole grams, ½ oz, ¼ cups and lb, ½ spoons, ½ items
const STEP: Partial<Record<FoodUnit, number>> = {
  g: 1, ml: 1, kg: 0.01, l: 0.01, oz: 0.5, fl_oz: 0.5, lb: 0.25, cup: 0.25, pint: 0.25, quart: 0.25, gallon: 0.25, tsp: 0.5, tbsp: 0.5,
};

// The same amount in another unit, rounded to a friendly step (never below one step). A unit the
// food can't be weighed in keeps the number as is; unitsFor only offers ones it can.
export function convertQty(food: Food, qty: number, from: FoodUnit | undefined, to: FoodUnit): number {
  const total = toGrams(food, qty, from);
  const one = perUnit(food, to);
  if (!total || !one) return qty;
  if (!total.grams) return 0;
  const step = STEP[to] ?? 0.5;
  return Math.max(step, +(Math.round(total.grams / one.grams / step) * step).toFixed(2));
}
