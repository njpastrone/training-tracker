/// <reference types="node" />
// Builds data/foods.ts from the hand-picked list in scripts/foods/picks.ts and USDA FoodData Central.
//
// Regenerate:
//   1. Download and unzip into one folder (public domain, CC0):
//      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
//      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip
//      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2026-04-30.zip
//   2. node --import tsx scripts/foods/build.ts --data <folder>     (or set USDA_DIR instead of --data)
//      Add --verbose to list each food's USDA portions that weren't turned into a unit.
//   3. node --import tsx --test data/foods.test.mts
// The folder is searched recursively, so the zips' nested folders are fine. Same input, same output.
//
// Numbers per pick: macros per 100 g from the pick's `fdc` food; unit weights from the portions of
// `fdc` plus `portionsFrom`, normalized into FoodUnit keys by unitsOf() below, then the pick's own
// `units` overrides on top.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Food, FoodUnit, MassUnit } from '../../types/food';
import { singularWords } from '../../data/catalog';
import { PICKS, type Pick } from './picks';

type Dataset = 'sr' | 'fndds' | 'foundation';
type Unit = Exclude<FoodUnit, MassUnit>;
export interface Portion { text: string; amount: number; grams: number }
export interface UsdaFood { fdc: number; dataset: Dataset; description: string; group?: number; nutrients: Record<number, number>; portions: Portion[] }

const N = { kcal: 1008, kcalSpecific: 2048, kcalGeneral: 2047, protein: 1003, fat: 1004, carbs: 1005, carbsSum: 1050, fiber: 1079 };
const WANTED = new Set(Object.values(N));

// Minimal RFC 4180 parser: quoted fields, "" escapes, newlines inside quotes. Header row → object keys.
function readCsv(path: string): Record<string, string>[] {
  const s = readFileSync(path, 'utf8');
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Both CSV releases share a layout; `keep` limits which fdc ids are loaded (the build only needs its picks)
function loadCsvRelease(dir: string, dataset: Dataset, keep: (fdc: number) => boolean, out: Map<number, UsdaFood>) {
  const unitNames = new Map(readCsv(join(dir, 'measure_unit.csv')).map((r) => [r.id, r.name]));
  for (const r of readCsv(join(dir, 'food.csv'))) {
    const fdc = Number(r.fdc_id);
    if (dataset === 'foundation' && r.data_type !== 'foundation_food') continue; // skip lab sub-samples
    if (keep(fdc)) out.set(fdc, { fdc, dataset, description: r.description, group: Number(r.food_category_id), nutrients: {}, portions: [] });
  }
  for (const r of readCsv(join(dir, 'food_nutrient.csv'))) {
    const f = out.get(Number(r.fdc_id));
    const id = Number(r.nutrient_id);
    if (f && f.dataset === dataset && WANTED.has(id) && r.amount !== '') f.nutrients[id] = Number(r.amount);
  }
  const portions = readCsv(join(dir, 'food_portion.csv'));
  portions.sort((a, b) => Number(a.fdc_id) - Number(b.fdc_id) || Number(a.seq_num || 0) - Number(b.seq_num || 0) || Number(a.id) - Number(b.id));
  for (const r of portions) {
    const f = out.get(Number(r.fdc_id));
    if (!f || f.dataset !== dataset) continue;
    const unit = r.measure_unit_id === '9999' ? '' : unitNames.get(r.measure_unit_id) ?? '';
    const text = [unit, r.portion_description, r.modifier].filter(Boolean).join(', ');
    f.portions.push({ text, amount: Number(r.amount) || 1, grams: Number(r.gram_weight) });
  }
}

interface SurveyFood {
  fdcId: number; description: string;
  foodNutrients: { nutrient: { id: number }; amount?: number }[];
  foodPortions?: { portionDescription: string; gramWeight: number; sequenceNumber: number }[];
}

// "1 1/2 cups" → [1.5, "cups"]; "Quantity not specified" → [1, "Quantity not specified"]
function splitQty(s: string): [number, string] {
  const m = /^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+)|\/(\d+))?\s+(.*)$/.exec(s);
  if (!m) return [1, s];
  const whole = Number(m[1]);
  const qty = m[4] ? whole / Number(m[4]) : m[2] ? whole + Number(m[2]) / Number(m[3]) : whole;
  return [qty, m[5]];
}

export function loadUsda(dataDir: string, keep: (fdc: number) => boolean = () => true): Map<number, UsdaFood> {
  const files = (readdirSync(dataDir, { recursive: true }) as string[]).map((p) => join(dataDir, p));
  const release = (tag: string) => {
    const food = files.find((p) => basename(p) === 'food.csv' && p.includes(tag));
    if (!food) throw new Error(`no ${tag} food.csv under ${dataDir}`);
    return dirname(food);
  };
  const survey = files.find((p) => basename(p) === 'surveyDownload.json');
  if (!survey) throw new Error(`no surveyDownload.json under ${dataDir}`);

  const out = new Map<number, UsdaFood>();
  loadCsvRelease(release('sr_legacy'), 'sr', keep, out);
  loadCsvRelease(release('foundation'), 'foundation', keep, out);
  const foods = (JSON.parse(readFileSync(survey, 'utf8')) as { SurveyFoods: SurveyFood[] }).SurveyFoods;
  for (const s of foods) {
    if (!keep(s.fdcId)) continue;
    const nutrients: Record<number, number> = {};
    for (const n of s.foodNutrients) if (WANTED.has(n.nutrient.id) && n.amount != null) nutrients[n.nutrient.id] = n.amount;
    const portions = [...(s.foodPortions ?? [])].sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((p) => {
      const [amount, text] = splitQty(p.portionDescription);
      return { text, amount, grams: p.gramWeight };
    });
    out.set(s.fdcId, { fdc: s.fdcId, dataset: 'fndds', description: s.description, nutrients, portions });
  }
  return out;
}

// ---- Portion normalization: USDA wording → FoodUnit key ----
//
// A portion's text is cut into [size] head [rest]: "medium (7" to 7-7/8" long)" → size medium;
// "cup, chopped" → head cup, rest "chopped"; "large egg" and "potato, large" → size large + head.
// - A head in PORTION_WORDS (singular or plural) becomes that unit (cup, tbsp, slice, breast…).
// - A head in COUNT_WORDS (each, item, ear…) means one whole item: 'each'. So does a head in
//   NAMED_COUNT (egg, banana, almond, grape…), but only on a food whose description names it:
//   "1 cherry" is one cherry on cherries but a cherry tomato on "Tomatoes, raw", so it's ignored there.
// - A size with no head, or with a count/body-part head ("large egg", "small breast"), also gives the
//   size unit; "regular"/"standard" is the plain medium. Sizes on other heads ("large slice") only
//   rank that head lower. Odd sizes (baby, mini, thin…) count only on a food that is that size.
// - Mass portions (oz, lb) are skipped: mass units are universal. So are cooking yields from raw
//   weights, guideline amounts, inches and anything else in SKIP, and words in no list (logged with
//   --verbose).
//
// One unit key, several portions: take the plainest. Score 0 = the bare word, maybe with "NFS",
// "any size", "cooked", "whole" or a parenthetical ("cup (8 fl oz)"); 1 = chopped/diced/cubed, or a
// medium size word; 2 = any other qualifier (sliced, packed, shredded, mashed…); 3 = another size
// ("large slice"). Ties go to the preferred dataset — SR Legacy for volumes (measured cups and
// spoons), FNDDS for everything else (the "as eaten" sizes like "1 banana", "1 slice") — then USDA's
// own portion order.

const SKIP = /yield|guideline|not specified|inch|calorie|with sauce|with gravy|topping|\border\b|meal|pizza|sandwich(?! size)|crust|excluding refuse|with refuse|\bpeel\b|unpeeled|\bmeat only\b|\bcontents\b|\bdrained solids\b|\bsub\b/;
// Yields that are a real weight of the food as eaten, not of its raw or dry ingredient
const GOOD_YIELD = /\((yield after cooking|yield from [\d.]+ ?g raw[^)]*|yields \d+ cups? whipped)\)/g;

const PORTION_WORDS: Record<string, Unit> = {
  cup: 'cup', tbsp: 'tbsp', tablespoon: 'tbsp', tsp: 'tsp', teaspoon: 'tsp',
  'fl oz': 'fl_oz', ml: 'ml', milliliter: 'ml', liter: 'l', pint: 'pint', quart: 'quart', gallon: 'gallon',
  shot: 'shot', jigger: 'shot',
  slice: 'slice', piece: 'piece', scoop: 'scoop', serving: 'serving',
  bowl: 'bowl', can: 'can', bottle: 'bottle', glass: 'glass', packet: 'packet', bar: 'bar', stick: 'stick',
  clove: 'clove', strip: 'strip', link: 'link', patty: 'patty', patties: 'patty', fillet: 'fillet', filet: 'fillet',
  breast: 'breast', thigh: 'thigh', drumstick: 'drumstick', wing: 'wing', leaf: 'leaf', leaves: 'leaf', stalk: 'stalk', spear: 'spear',
  wedge: 'wedge', container: 'container', pat: 'pat', square: 'square', sheet: 'sheet',
};
const COUNT_WORDS = new Set(['each', 'item', 'whole', 'unit', 'fruit', 'ear', 'cob', 'head', 'bulb']);
const NAMED_COUNT = new Set(`egg banana apple orange peach pear plum nectarine kiwi kiwifruit tangerine clementine mandarin
  lemon lime grapefruit mango avocado fig date apricot prune raisin tomato potato sweetpotato pepper onion carrot beet leek
  parsnip radish mushroom cucumber zucchini squash olive cherry grape strawberry blueberry raspberry blackberry berry plantain
  almond peanut cashew pecan walnut pistachio hazelnut macadamia nut kernel sprout shrimp prawn sardine anchovy scallop clam
  oyster mussel crab lobster bagel muffin english tortilla pancake waffle cookie cracker biscuit doughnut donut roll bun
  croissant pita naan matzo matzoh crepe chapati chappatti roti wrapper pretzel cake chip puff rind frankfurter frank wiener
  sausage nugget meatball chop cutlet`.split(/\s+/));
const SIZES: [RegExp, Unit | null][] = [
  [/^(extra[- ]large|jumbo|xl)\b/, 'xl'], [/^large\b/, 'large'], [/^(medium|regular|standard)\b/, 'medium'],
  [/^small\b/, 'small'], [/^(thin|thick|mini|miniature|baby)\b/, null],
];
const BODY_PARTS = new Set<Unit>(['breast', 'thigh', 'drumstick', 'wing', 'fillet', 'patty', 'link']);
const PLAIN = new Set(['nfs', 'any', 'size', 'ns', 'as', 'to', 'cooked', 'raw', 'whole', 'regular', 'or', 'prepared', 'fluid']);
const CHOPPED = new Set(['chopped', 'diced', 'cubed', 'cubes', 'or']);
const VOLUME = new Set<Unit>(['cup', 'tbsp', 'tsp', 'fl_oz', 'ml', 'l', 'pint', 'quart', 'gallon', 'shot']);

export interface UnitCandidate { unit: Unit; score: number }

const portionWord = (w: string) => PORTION_WORDS[w] ?? PORTION_WORDS[w.replace(/s$/, '')] ?? PORTION_WORDS[w.replace(/es$/, '')];
const forms = (w: string) => [w, w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y')];
// Does the food's description name this item? ("cherries" names cherry; "Tomatoes, raw" doesn't)
const NUTS = /nut|seed|kernel|almond|cashew|pecan|pistachio|peanut|macadamia|hazelnut|filbert/i;
const names = (description: string, w: string) =>
  w === 'nut' || w === 'kernel' ? NUTS.test(description) : description.toLowerCase().includes(w.length > 4 ? w.slice(0, -1) : w);

// `description` is the USDA food's own, for the NAMED_COUNT and odd-size checks
export function unitsOf(text: string, description = ''): UnitCandidate[] {
  const lowered = text.toLowerCase().replace(GOOD_YIELD, '');
  if (SKIP.test(lowered)) return [];
  let t = lowered.replace(/\(.*?\)/g, ' ').replace(/[^a-z ,\/-]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(of |single |individual )/, '');
  if (/^(oz|ounces?|lbs?|pounds?|g|grams?|kg)\b/.test(t) && !/^fl oz/.test(t)) return []; // mass
  let size: Unit | null | undefined;
  let regular = false; // "regular slice", "medium or regular slice", "standard can": the plain size
  const readSize = (s: string) => {
    for (const [re, u] of SIZES) {
      const m = re.exec(s);
      if (!m) continue;
      if (u === null && description && !description.toLowerCase().includes(m[0])) return null; // "baby potato" on potatoes
      size = u;
      let rest = s.slice(m[0].length);
      const alt = /^( or [a-z\/-]+|\/[a-z\/-]+)/.exec(rest)?.[0] ?? '';
      if (/regular|standard/.test(m[0] + alt)) regular = true;
      return rest.slice(alt.length).replace(/^[ ,]+/, '').replace(/^size\b\s*/, '');
    }
    return s;
  };
  const afterSize = readSize(t);
  if (afterSize === null) return [];
  t = afterSize;
  const head = /^fl oz/.test(t) ? 'fl oz' : t.split(/[ ,\/]/)[0];
  let rest = t.slice(head.length).split(/[ ,\/]+/).filter(Boolean);
  if (size === undefined && rest.length) { // "potato, large (3" to 4-1/4" dia)"
    const r = readSize(rest.join(' '));
    if (r === null) return [];
    if (size !== undefined) rest = r.split(' ').filter(Boolean);
  }
  const plain = (w: string) => PLAIN.has(w);
  const other = rest[0] === 'or' && rest[1] ? portionWord(rest[1]) : undefined; // "can or bottle (12 fl oz)": both
  if (other) rest = rest.slice(2);
  const restScore = rest.every(plain) ? 0 : rest.every((w) => plain(w) || CHOPPED.has(w)) ? 1 : 2;
  // An odd size the description has ("baby carrot" on baby carrots) is that food's plain size
  const sizeScore = size === undefined || size === null || regular ? 0 : size === 'medium' ? 1 : 3;
  const out: UnitCandidate[] = [];
  const portion = portionWord(head);
  const count = !portion && (forms(head).some((w) => COUNT_WORDS.has(w)) || forms(head).some((w) => NAMED_COUNT.has(w) && names(description, w)));
  if (head === 'whole' && restScore > 0) return []; // "whole fish, any size": not one serving-sized item
  if (portion) out.push({ unit: portion, score: Math.max(restScore, sizeScore) });
  if (count) out.push({ unit: 'each', score: Math.max(restScore, sizeScore) });
  if (portion && other) out.push({ unit: other, score: Math.max(restScore, sizeScore) });
  if (size && (head === '' || count || (portion && BODY_PARTS.has(portion)))) out.push({ unit: size, score: restScore });
  return out;
}

const DATASET_RANK: Record<'volume' | 'other', Record<Dataset, number>> = {
  volume: { sr: 0, foundation: 1, fndds: 2 },
  other: { fndds: 0, sr: 1, foundation: 2 },
};

// Grams per unit for one pick, from all its USDA foods' portions; `unmatched` collects what was ignored
export function unitWeights(foods: UsdaFood[], unmatched: string[] = []) {
  const best = new Map<Unit, { key: number[]; grams: number }>();
  let order = 0;
  for (const f of foods) {
    for (const p of f.portions) {
      order++;
      // "oz (14 halves)", "oz (10-12 kernels)": one piece is the ounce shared out
      const per = /^oz \((?:about )?(\d+)(?:-(\d+))? [a-z ]+\)$/.exec(p.text.toLowerCase());
      const amount = per ? (Number(per[1]) + Number(per[2] ?? per[1])) / 2 : p.amount;
      const cands: UnitCandidate[] = per ? [{ unit: 'piece', score: 0 }] : unitsOf(p.text, f.description);
      if (!cands.length) { unmatched.push(`${f.dataset} "${p.text}" ${p.grams}g`); continue; }
      for (const c of cands) {
        const key = [c.score <= 1 ? 0 : c.score, DATASET_RANK[VOLUME.has(c.unit) ? 'volume' : 'other'][f.dataset], c.score, order];
        const prev = best.get(c.unit);
        if (!prev || cmp(key, prev.key) < 0) best.set(c.unit, { key, grams: p.grams / amount });
      }
    }
  }
  const units: Partial<Record<Unit, number>> = {};
  for (const [u, { grams }] of best) units[u] = grams;
  // "serving" (NLEA) only when USDA gives nothing better: it's a label size, not a way people talk
  if (Object.keys(units).length > 1) delete units.serving;
  // An apple is a medium apple: 'each' falls back to the medium size, also over an 'each' that only
  // came from a small or large one ("1 large egg" with no plain egg)
  if (units.medium != null && (units.each == null || best.get('each')!.key[0] >= 3)) units.each = units.medium;
  return units;
}
const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

// ---- Build ----

const UNIT_ORDER: Unit[] = ['each', 'small', 'medium', 'large', 'xl', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon',
  'slice', 'piece', 'scoop', 'handful', 'serving', 'bowl', 'plate', 'can', 'bottle', 'glass', 'packet', 'bar', 'stick', 'clove', 'strip',
  'link', 'patty', 'fillet', 'breast', 'thigh', 'drumstick', 'wing', 'leaf', 'stalk', 'spear', 'wedge', 'container', 'shot', 'pat', 'square', 'sheet'];

const r1 = (n: number) => Math.round(n * 10) / 10;

export function macrosOf(f: UsdaFood) {
  const n = f.nutrients;
  // Foundation foods may carry only Atwater energy and carbs by summation
  const kcal = n[N.kcal] ?? n[N.kcalSpecific] ?? n[N.kcalGeneral];
  const carbs = n[N.carbs] ?? n[N.carbsSum];
  const missing = [kcal == null && 'kcal', n[N.protein] == null && 'protein', n[N.fat] == null && 'fat', carbs == null && 'carbs'].filter(Boolean);
  return { missing, per100g: { kcal: r1(kcal ?? 0), protein: r1(n[N.protein] ?? 0), carbs: r1(carbs ?? 0), fat: r1(n[N.fat] ?? 0), fiber: r1(n[N.fiber] ?? 0) }, hasFiber: n[N.fiber] != null };
}

// One pick → its Food; problems go to `errors`, ignored USDA portions to `unmatched`
export function toFood(p: Pick, usda: Map<number, UsdaFood>, errors: string[], unmatched: string[] = []): Food | undefined {
  const main = usda.get(p.fdc);
  const extra = (p.portionsFrom ?? []).map((id) => usda.get(id));
  if (!main || extra.some((e) => !e)) {
    errors.push(`${p.id}: unknown fdc ${[p.fdc, ...(p.portionsFrom ?? [])].filter((id) => !usda.get(id)).join(', ')}`);
    return;
  }
  const { missing, per100g, hasFiber } = macrosOf(main);
  if (missing.length) errors.push(`${p.id}: ${main.description} has no ${missing.join(', ')}`);
  // Fiber missing means USDA didn't analyse it; only plausible for foods with ~no carbs
  if (!hasFiber && per100g.carbs > 2 && !p.noFiber) errors.push(`${p.id}: no fiber value but ${per100g.carbs} g carbs; pick another fdc or set noFiber`);
  const weights = { ...unitWeights([main, ...(extra as UsdaFood[])], unmatched), ...p.units };
  const units: Food['units'] = {};
  for (const u of UNIT_ORDER) if (weights[u] != null) units[u] = r1(weights[u]!);
  return {
    id: p.id, name: p.name, aliases: p.aliases, category: p.category, per100g, units, serving: p.serving,
    ...(p.state ? { state: p.state } : {}), fdc: p.fdc, source: main.description,
  };
}

// ---- Second tier: the rest of SR Legacy's whole foods, named and deduped automatically ----
//
// Which rows: SR Legacy food groups that are whole foods (GROUPS below; baked goods, sweets and
// beverages only for the staples matched by ONLY), minus branded rows (an ALL-CAPS word, or two
// Capitalized Words in a row as in "Pillsbury Golden Layer"), mixed dishes and preparations
// (EXCLUDE), offal and cuts nobody logs (EXCLUDE_MEAT), rows missing a macro (or missing fiber with
// carbs > 2 g), and every fdc id the core table already uses.
//
// Dedupe: a row's name is its description with the words that only tell near-duplicates apart
// removed (DROP: grade, trim level, bone-in/boneless, lean-only vs lean-and-fat, salt, sodium,
// fortification, frozen vs fresh, chopped/sliced/whole, drained vs not, "broilers or fryers"…),
// the cooking method folded into "(cooked)", raw into "(raw)" — "(dry)" for grains and legumes,
// which SR calls raw — and the three canned syrup strengths folded into "in syrup". Rows that end up
// with the same name (compared singularized) keep ONE, ranked by: plainest cooking method (roasted/
// broiled/grilled/baked, then boiled/steamed, braised/stewed, pan-fried, fried); then fewest of:
// select/prime grade, 1/4" trim, lean only (the cut as sold, trimmed to 0-1/8", wins), with salt,
// reduced sodium, fortified, frozen, added solution, USDA commodity; then fewest name parts; then the
// lowest fdc id. Names equal to a core name or alias are dropped: the core entry covers them.
//   "Beef, top sirloin, steak, separable lean and fat, trimmed to 1/8" fat, all grades, cooked, broiled"
//   → "Beef, top sirloin, steak (cooked)"

const GROUPS: Record<number, Food['category']> = {
  1: 'eggs_dairy', 2: 'other', 4: 'fats_oils', 5: 'meat_fish', 7: 'meat_fish', 9: 'fruit', 10: 'meat_fish', 11: 'vegetables',
  12: 'nuts_seeds', 13: 'meat_fish', 14: 'drinks', 15: 'meat_fish', 16: 'legumes', 17: 'meat_fish', 18: 'grains', 19: 'sweets_snacks', 20: 'grains',
};
const ONLY: Record<number, RegExp> = {
  18: /^(bread|rolls?|bagels?|english muffins?|muffins?|tortillas?|crackers?|pita|biscuits?|croissants?|taco shells?|tostada shells?|pancakes?|waffles?|matzo|bread crumbs|croutons|cornbread|naan|focaccia)\b/i,
  19: /^(sugars?|syrups?|honey|molasses|jams?|jellies|marmalade|sweeteners?|baking chocolate|cocoa|candies, (semisweet|milk|dark|white|sweet) chocolate|chocolate|ice creams?|sherbet|frozen yogurts?|gelatin)\b/i,
  14: /^(beverages, (coffee|tea|carbonated|water|almond|oat|rice|soy|coconut|sports|energy)|alcoholic beverage, (beer|wine|distilled|liqueur|rice)|water|tea|coffee|lemonade)/i,
};
const EXCLUDE = /babyfood|infant|toddler|fast food|restaurant|school lunch|sauce|gravy|breaded|batter|stuffed|stuffing|casserole|salad|sandwich|dinner|entree|pizza|soup|\bmix\b|prepared with|prepared-from-recipe|formula|meal replacement|commodity|\bpowder|cocktail|imitation|substitute|low calorie|aspartame|sucralose|dehydrated|stewed/i;
const EXCLUDE_MEAT = /\b(australian|new zealand|composite|lungs|spleen|pancreas|thymus|brain|mechanically separated|giblets|neck|back|skin only|feet|ears|chitterlings|leaf fat|backfat|separable fat|cracklings|salt pork|fatback|fried)\b/i;
const MEAT_GROUPS = new Set([5, 10, 13, 17]);
const isBrand = (d: string) => /\b[A-Z]{3,}\b/.test(d.replace(/\bUSDA\b/g, ''))
  || d.split(', ').some((part, i) => /\b[A-Z][a-z'’]+ [A-Z][a-z'’]+/.test(i ? part : part.replace(/^(New Zealand|Great Northern)\b/, '')));
const DROP = [
  /^(choice|select|prime|all grades)$/, /^trimmed to .*fat$/, /^separable lean (and fat|only)$/, /^broilers? or fryers$/, /^(all classes|from whole bird|fresh|frenched|denuded|frozen|unheated|raw or unheated|with added solution)$/,
  /^(enriched|unenriched|fluid|regular|commercial|commercially prepared|ready-to-eat|ready-to-serve|ready-to-drink|as purchased|all|year round average|imported|domestic|retail)$/,
  /^(with|without) (added )?salt( added)?$/, /salt added|salt not added|sodium/, /^with added\b/, /fortified/,
  /^(drained|drained solids|solids and liquids|drained without salt)$/, /^(chopped|sliced|diced|whole|shredded|pieces|halves|cubed|strips|chunks|grated|patty|crumbles|loaf)$/,
  /^(mature seeds|variety meats and by-products|includes skin)$/,
];
const COOKING = /^(?:(?:cooked|roasted|broiled|grilled|baked|boiled|steamed|microwaved|heated|braised|simmered|poached|pan-broiled|pan-browned|pan-fried|stir-fried|fried|dry heat|moist heat|or|and|in skin)\s*)+$/;
const METHOD_RANK: [RegExp, number][] = [[/fried/, 4], [/pan-|stir-/, 3], [/braised|simmered|poached|moist heat/, 2], [/boiled|steamed|microwaved|heated/, 1]];
const PENALTIES = [/\bselect\b/, /\bprime\b/, /1\/4" fat/, /with salt|salt added/, /sodium/, /fortified|with added (vitamin|calcium|ascorbic|nonfat)/, /\bfrozen\b/, /added solution/, /separable lean only/, /usda's food distribution/];
const RAW = /^(raw|uncooked|unprepared|dry)$/;

function autoName(f: UsdaFood) {
  const desc = f.description.replace(/""/g, '"').replace(/\s*\((includes foods for usda's food distribution program|n x 6\.25)\)/gi, '')
    .replace(/\b(boneless|bone-in)\b,?/gi, '').replace(/\s+separable lean (and fat|only)/gi, ', separable lean $1')
    .replace(/\b(extra )?(heavy|light|extra light|extra heavy) syrup( pack)?/gi, 'in syrup').replace(/\bjuice pack\b/gi, 'in juice').replace(/\bwater pack\b/gi, 'in water')
    .replace(/(\d+)% lean( meat)? \/ \d+% fat/gi, '$1% lean');
  let state: Food['state'];
  let method = 0;
  const parts: string[] = [];
  for (const raw of desc.split(/,\s*/)) {
    const p = raw.trim(), l = p.toLowerCase();
    if (!p) continue;
    if (COOKING.test(l)) { state = 'cooked'; method = Math.max(method, METHOD_RANK.find(([re]) => re.test(l))?.[1] ?? 0); continue; }
    if (RAW.test(l)) { state = f.group === 16 || f.group === 20 ? 'dry' : 'raw'; continue; }
    if (!DROP.some((re) => re.test(l))) parts.push(p);
  }
  const lower = f.description.toLowerCase();
  const rank = [method, PENALTIES.filter((re) => re.test(lower)).length, parts.length, f.fdc];
  return { name: parts.join(', ').replace(/^./, (c) => c.toUpperCase()) + (state ? ` (${state})` : ''), state, rank };
}

// What a name alone means: the first count/portion unit USDA gives, else a cup or spoon (not for
// meat: a cup of steak isn't how anyone eats it), else 100 g. Only portions of 2-400 g count as a
// serving: a whole turkey breast, a 30 oz can or one pine nut isn't one.
const SERVING_UNITS: Unit[] = ['each', 'medium', 'slice', 'piece', 'link', 'patty', 'fillet', 'breast', 'thigh', 'drumstick', 'wing', 'bar', 'stick', 'strip', 'container', 'can', 'bottle', 'packet', 'cup', 'fl_oz', 'tbsp', 'tsp'];

export function moreFoods(usda: Map<number, UsdaFood>, core: Food[], usedFdc: Set<number>): Food[] {
  const taken = new Set(core.flatMap((f) => [f.name, ...f.aliases].map(singularWords)));
  const best = new Map<string, { f: UsdaFood; name: string; state: Food['state']; rank: number[] }>();
  for (const f of usda.values()) {
    if (f.dataset !== 'sr' || !f.group || !GROUPS[f.group] || usedFdc.has(f.fdc)) continue;
    if ((ONLY[f.group] && !ONLY[f.group].test(f.description)) || EXCLUDE.test(f.description) || isBrand(f.description)) continue;
    if (MEAT_GROUPS.has(f.group) && EXCLUDE_MEAT.test(f.description)) continue;
    const m = macrosOf(f);
    if (m.missing.length || (!m.hasFiber && m.per100g.carbs > 2)) continue;
    const a = autoName(f);
    const key = singularWords(a.name);
    if (taken.has(key)) continue;
    const prev = best.get(key);
    if (!prev || cmp(a.rank, prev.rank) < 0) best.set(key, { f, ...a });
  }
  return [...best.values()].sort((a, b) => a.f.fdc - b.f.fdc).map(({ f, name, state }) => {
    const weights = unitWeights([f]);
    const units: Food['units'] = {};
    for (const u of UNIT_ORDER) if (weights[u] != null) units[u] = r1(weights[u]!);
    const meat = MEAT_GROUPS.has(f.group!) || f.group === 15 || f.group === 7;
    const unit = SERVING_UNITS.find((u) => units[u] != null && units[u]! >= 2 && units[u]! <= 400 && !(meat && VOLUME.has(u)));
    const category = f.group === 9 && /juice|nectar/i.test(f.description) ? 'drinks' : GROUPS[f.group!];
    return {
      id: `usda-${f.fdc}`, name, aliases: [], category, per100g: macrosOf(f).per100g, units,
      serving: unit ? { qty: 1, unit } : { qty: 100, unit: 'g' }, ...(state ? { state } : {}), fdc: f.fdc, source: f.description,
    };
  });
}

function build(dataDir: string, verbose: boolean) {
  const usda = loadUsda(dataDir);
  const errors: string[] = [];
  const foods: Food[] = [];
  for (const p of PICKS) {
    const unmatched: string[] = [];
    const food = toFood(p, usda, errors, unmatched);
    if (food) foods.push(food);
    if (verbose && unmatched.length) console.log(`${p.id}: ignored ${unmatched.join('; ')}`);
  }
  if (errors.length) throw new Error(`\n${errors.join('\n')}`);
  const more = moreFoods(usda, foods, new Set(PICKS.flatMap((p) => [p.fdc, ...(p.portionsFrom ?? [])])));
  // Each row goes through food(): a bare array literal of thousands of differently-shaped objects is
  // more than TypeScript will type ("union type too complex")
  const line = (f: Food) => `food(${JSON.stringify(f).replace(/"([a-z_][a-z0-9_]*)":/gi, '$1:')})`;
  const out = `// GENERATED by scripts/foods/build.ts from scripts/foods/picks.ts: edit those, then rerun the build.
// Nutrition per 100 g and portion weights: USDA FoodData Central (SR Legacy 2018-04, FNDDS survey foods
// 2024-10-31, Foundation Foods 2026-04-30), public domain (CC0).
import type { Food } from '../types/food';

const food = (f: Food) => f;

// The core table: hand-picked foods with hand-written names and aliases
export const FOODS: Food[] = [
${foods.map(line).join(',\n')}
];

// The long tail: the rest of SR Legacy's whole foods, named and deduped by the build (no aliases)
export const MORE_FOODS: Food[] = [
${more.map(line).join(',\n')}
];

export const foodById = new Map<string, Food>([...FOODS, ...MORE_FOODS].map((f) => [f.id, f]));
`;
  const target = join(dirname(fileURLToPath(import.meta.url)), '../../data/foods.ts');
  writeFileSync(target, out);
  console.log(`wrote ${foods.length} core + ${more.length} more foods to data/foods.ts (${(out.length / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--data');
  const dir = i > 0 ? process.argv[i + 1] : process.env.USDA_DIR;
  if (!dir) throw new Error('pass --data <folder with the unzipped USDA datasets> or set USDA_DIR');
  build(dir, process.argv.includes('--verbose'));
}
