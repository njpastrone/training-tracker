// Held-out food-log set, part 1 (everyday whole foods, real texting style). Never tune on it.
// Written blind: built without reading the app's food code, food tables or the existing gold sets' cases.
// How references were derived:
// - Every number comes from USDA FoodData Central (public domain): SR Legacy (2018-04), FNDDS 2021-2023
//   survey foods (2024-10-31), computed from the per-100 g kcal (SR 1008 / FNDDS 208), protein, carbs (by
//   difference) and fat of the cited FDC id. Each item's source gives the dataset, FDC id, description, grams
//   and how the grams were chosen (USDA portion label, stated weight, or a CONVENTION).
// - Cooked/as eaten for meat, fish, grains, pasta, rice and beans unless the text says raw/dry/uncooked.
//   Oats in cups or grams = dry; "oatmeal"/"porridge" = cooked. Eggs with no method = hard-boiled 50 g each
//   (SR 173424). A plural with no number ("eggs") = 2. Drink "oz" = fluid ounces.
// - Everyday counts and sizes use FNDDS portions ("1 banana" 126 g, "1 medium" apple 200 g, "1 medium" baked
//   potato 285 g, slice of toast 25 g); cups/tbsp use the cited food's own USDA portion. No amount = FNDDS
//   "Quantity not specified". Milk with no type = FNDDS "Milk, NFS"; "semi-skimmed" = SR 2% milk.
// - Conversions: 1 oz = 28.3495 g, 1 lb = 453.592 g, 1 fl oz = 29.5735 ml, US cup = 236.588 ml, UK pint =
//   568.26 ml, dl = 100 ml, cl = 10 ml. Volume to grams via the food's USDA cup or fl oz weight.
// - CONVENTIONs (not USDA data, marked in source): glass = 8 fl oz, bowl = 1.5 cups, big bowl of oatmeal = 2 cups,
//   splash = 30 ml, drizzle = 2 tsp, knob of butter = 10 g, handful of nuts = 1 oz, a few = 3, couple = 2,
//   "a little" / "a bit" = half a default serving, small piece of fish = 3 oz.
// Rounding: item kcal to integers, macros to 0.1 g; ref = sum of the rounded items.

import type { FoodCase } from './cases.ts';

export const cases: FoodCase[] = [
  // ---- slang ----
  {
    id: 'h1-slang-chx-rice-200-each', category: 'slang', tolerance: 'tight',
    input: 'chx n rice 200g each',
    ref: { kcal: 590, protein: 67.4, carbs: 56.3, fat: 7.7 },
    items: [
      { name: 'chicken breast, cooked', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.1, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 200 g: stated 200 g, cooked by convention" },
      { name: 'white rice, cooked', grams: 200, kcal: 260, protein: 5.4, carbs: 56.3, fat: 0.6, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 200 g: stated 200 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-slang-pb-toast-x2', category: 'slang', tolerance: 'normal',
    input: 'pb toast x2',
    ref: { kcal: 338, protein: 12.3, carbs: 34.2, fat: 18.4 },
    items: [
      { name: 'white toast', grams: 50, kcal: 147, protein: 5.2, carbs: 27.1, fat: 2, source: "USDA FNDDS 2707599 'Bread, white, toasted', 50 g: 2 x '1 medium or regular slice' 25 g" },
      { name: 'peanut butter', grams: 32, kcal: 191, protein: 7.1, carbs: 7.1, fat: 16.4, source: "USDA FNDDS 2707537 'Peanut butter', 32 g: 2 x 'Guideline amount per slice of bread/roll' 16 g" },
    ],
    note: 'pb = peanut butter; x2 = two slices, each spread',
  },
  {
    id: 'h1-slang-2-scoops-whey-almond-milk', category: 'slang', tolerance: 'normal',
    input: '2 scoops whey w almond milk',
    ref: { kcal: 232, protein: 41.9, carbs: 7, fat: 3.8 },
    items: [
      { name: 'whey protein powder', grams: 52, kcal: 183, protein: 40.6, carbs: 3.3, fat: 0.8, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 52 g: 2 x '1 scoop, NFS' 26 g" },
      { name: 'almond milk', grams: 244, kcal: 49, protein: 1.3, carbs: 3.7, fat: 3, source: "USDA FNDDS 2705410 'Almond milk, NFS', 244 g: no amount: 'Quantity not specified' 244 g (1 cup)" },
    ],
  },
  {
    id: 'h1-slang-oats-pb-nana', category: 'slang', tolerance: 'normal',
    input: '1/2 c oats w 1 tbsp pb & a nana',
    ref: { kcal: 371, protein: 9.8, carbs: 59.6, fat: 11.2 },
    items: [
      { name: 'rolled oats, dry', grams: 40.5, kcal: 153, protein: 5.3, carbs: 27.4, fat: 2.6, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 40.5 g: 0.5 x '1 cup' 81 g (oats in cups = dry)" },
      { name: 'peanut butter', grams: 16, kcal: 96, protein: 3.6, carbs: 3.6, fat: 8.2, source: "USDA FNDDS 2707537 'Peanut butter', 16 g: '1 tablespoon' 16 g" },
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
    ],
    note: 'nana = banana, c = cup',
  },
  {
    id: 'h1-slang-greek-yog-bluebs', category: 'slang', tolerance: 'normal',
    input: 'greek yog 170g + bluebs',
    ref: { kcal: 162, protein: 17.8, carbs: 17.1, fat: 2.5 },
    items: [
      { name: 'greek yogurt, plain', grams: 170, kcal: 114, protein: 17.3, carbs: 6.1, fat: 2.3, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 170 g: stated 170 g" },
      { name: 'blueberries', grams: 75, kcal: 48, protein: 0.5, carbs: 11, fat: 0.2, source: "USDA FNDDS 2709275 'Blueberries, raw', 75 g: no amount: 'Quantity not specified' 75 g" },
    ],
  },
  {
    id: 'h1-slang-egg-whites-x6', category: 'slang', tolerance: 'tight',
    input: 'egg whites x6',
    ref: { kcal: 103, protein: 21.6, carbs: 1.4, fat: 0.3 },
    items: [
      { name: 'egg whites', grams: 198, kcal: 103, protein: 21.6, carbs: 1.4, fat: 0.3, source: "USDA SR Legacy 172183 'Egg, white, raw, fresh', 198 g: 6 x '1 large' 33 g" },
    ],
  },
  {
    id: 'h1-slang-bagel-w-cc', category: 'slang', tolerance: 'normal',
    input: 'bagel w cc',
    ref: { kcal: 380, protein: 12.8, carbs: 56.4, fat: 11.5 },
    items: [
      { name: 'plain bagel', grams: 105, kcal: 277, protein: 11.1, carbs: 55, fat: 1.4, source: "USDA FNDDS 2707684 'Bagel', 105 g: '1 regular' 105 g (no size given)" },
      { name: 'cream cheese', grams: 30, kcal: 103, protein: 1.7, carbs: 1.4, fat: 10.1, source: "USDA FNDDS 2705760 'Cream cheese, regular, plain', 30 g: no amount: 'Quantity not specified' 30 g" },
    ],
    note: 'cc = cream cheese',
  },
  {
    id: 'h1-slang-pwo-shake', category: 'slang', tolerance: 'normal',
    input: 'pull day done. pwo shake: 1 scoop whey, 1 nana, 12oz skim',
    ref: { kcal: 344, protein: 33.8, carbs: 48.2, fat: 1.5 },
    items: [
      { name: 'whey protein powder', grams: 26, kcal: 92, protein: 20.3, carbs: 1.6, fat: 0.4, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 26 g: 1 x '1 scoop, NFS' 26 g" },
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'skim milk', grams: 370.8, kcal: 130, protein: 12.6, carbs: 18, fat: 0.7, source: "USDA SR Legacy 169868 'Milk, fluid, nonfat, calcium fortified (fat free or skim)', 370.8 g: 12 fl oz x '1 fl oz' 30.9 g (drink oz = fluid oz)" },
    ],
    workout: ['pull day'],
    note: 'pwo = post-workout; skim = skim milk',
  },
  {
    id: 'h1-slang-thighs-sweet-pot', category: 'slang', tolerance: 'normal',
    input: '6oz chx thighs + a sweet pot',
    ref: { kcal: 427, protein: 44.6, carbs: 27, fat: 14.5 },
    items: [
      { name: 'chicken thigh, cooked', grams: 170.1, kcal: 304, protein: 42.1, carbs: 0, fat: 13.9, source: "USDA SR Legacy 172388 'Chicken, broilers or fryers, thigh, meat only, cooked, roasted', 170.1 g: 6 oz = 170.1 g, cooked by convention" },
      { name: 'sweet potato, baked', grams: 150, kcal: 123, protein: 2.5, carbs: 27, fat: 0.6, source: "USDA FNDDS 2709699 'Sweet potato, baked, no added fat', 150 g: '1 medium' 150 g (no size given)" },
    ],
  },
  {
    id: 'h1-slang-ground-turk-jasmine', category: 'slang', tolerance: 'normal',
    input: '8oz 93/7 ground turk n 1c jasmine rice',
    ref: { kcal: 688, protein: 65.8, carbs: 44.5, fat: 26.7 },
    items: [
      { name: 'ground turkey 93% lean, cooked', grams: 226.8, kcal: 483, protein: 61.5, carbs: 0, fat: 26.3, source: "USDA SR Legacy 172851 'Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles', 226.8 g: 8 oz = 226.8 g, cooked by convention" },
      { name: 'white rice, cooked', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 158 g: '1 cup' 158 g (jasmine = white long-grain rice, cooked)" },
    ],
  },
  {
    id: 'h1-slang-cottage-chz-pineapple', category: 'slang', tolerance: 'normal',
    input: '1c cottage chz + pineapple chunks',
    ref: { kcal: 222, protein: 23.5, carbs: 20.8, fat: 5 },
    items: [
      { name: 'cottage cheese', grams: 210, kcal: 172, protein: 23.1, carbs: 9.1, fat: 4.8, source: "USDA FNDDS 2705747 'Cheese, cottage, NFS', 210 g: '1 cup' 210 g" },
      { name: 'pineapple', grams: 83, kcal: 50, protein: 0.4, carbs: 11.7, fat: 0.2, source: "USDA FNDDS 2709260 'Pineapple, raw', 83 g: no amount: 'Quantity not specified' 83 g" },
    ],
  },
  {
    id: 'h1-slang-avo-toast-eggs', category: 'slang', tolerance: 'normal',
    input: 'half an avo on toast + eggs',
    ref: { kcal: 342, protein: 16.5, carbs: 20.5, fat: 22.1 },
    items: [
      { name: 'avocado', grams: 68, kcal: 114, protein: 1.3, carbs: 5.9, fat: 10.5, source: "USDA SR Legacy 171706 'Avocados, raw, California', 68 g: 0.5 x '1 fruit, without skin and seed' 136 g (Hass)" },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g (no count: 1 slice)" },
      { name: 'egg, hard-boiled', grams: 100, kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 100 g: 2 x '1 large' 50 g (no cooking method given: hard-boiled by convention); plural with no number = 2" },
    ],
  },
  {
    id: 'h1-slang-proats', category: 'slang', tolerance: 'normal',
    input: 'proats - 50g oats + 1 scoop whey + water',
    ref: { kcal: 282, protein: 26.9, carbs: 35.5, fat: 3.7 },
    items: [
      { name: 'rolled oats, dry', grams: 50, kcal: 190, protein: 6.6, carbs: 33.9, fat: 3.3, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 50 g: stated 50 g (oats in grams = dry)" },
      { name: 'whey protein powder', grams: 26, kcal: 92, protein: 20.3, carbs: 1.6, fat: 0.4, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 26 g: 1 x '1 scoop, NFS' 26 g" },
    ],
    note: 'proats = protein oats; water has no macros',
  },
  {
    id: 'h1-slang-steak-n-eggs', category: 'slang', tolerance: 'normal',
    input: 'steak n eggs. 6oz sirloin 3 eggs',
    ref: { kcal: 640, protein: 65, carbs: 1.7, fat: 39.7 },
    items: [
      { name: 'sirloin steak, cooked', grams: 170.1, kcal: 407, protein: 46.1, carbs: 0, fat: 23.8, source: "USDA FNDDS 2705832 'Beef, steak, sirloin, NS as to fat eaten', 170.1 g: 6 oz = 170.1 g, cooked by convention" },
      { name: 'egg, hard-boiled', grams: 150, kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 150 g: 3 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
    ],
  },
  {
    id: 'h1-slang-rice-cakes-pb', category: 'slang', tolerance: 'loose',
    input: '3 rice cakes w pb on em',
    ref: { kcal: 295, protein: 9.4, carbs: 29, fat: 17.3 },
    items: [
      { name: 'rice cakes', grams: 27, kcal: 104, protein: 2.3, carbs: 21.9, fat: 0.9, source: "USDA SR Legacy 169679 'Snacks, rice cakes, brown rice, corn', 27 g: 3 x '1 cake' 9 g" },
      { name: 'peanut butter', grams: 32, kcal: 191, protein: 7.1, carbs: 7.1, fat: 16.4, source: "USDA FNDDS 2707537 'Peanut butter', 32 g: no amount: 'Quantity not specified' 32 g" },
    ],
  },
  // ---- typo ----
  {
    id: 'h1-typo-brocolli-chiken', category: 'typo', tolerance: 'normal',
    input: 'brocolli and chiken breast 6oz',
    ref: { kcal: 313, protein: 54.9, carbs: 5.1, fat: 6.4 },
    items: [
      { name: 'chicken breast, cooked', grams: 170.1, kcal: 281, protein: 52.8, carbs: 0, fat: 6.1, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 170.1 g: 6 oz = 170.1 g, cooked by convention" },
      { name: 'broccoli, cooked', grams: 78, kcal: 32, protein: 2.1, carbs: 5.1, fat: 0.3, source: "USDA FNDDS 2709645 'Broccoli, fresh, cooked, no added fat', 78 g: no amount: 'Quantity not specified' 78 g" },
    ],
  },
  {
    id: 'h1-typo-bananna-glass-milk', category: 'typo', tolerance: 'normal',
    input: 'bananna and a glass of milk',
    ref: { kcal: 249, protein: 9, carbs: 40.4, fat: 5.6 },
    items: [
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'milk', grams: 244, kcal: 127, protein: 8.1, carbs: 11.8, fat: 5.2, source: "USDA FNDDS 2705384 'Milk, NFS', 244 g: glass = 8 fl oz (CONVENTION): '1 cup' 244 g; milk type unstated = 'Milk, NFS'" },
    ],
  },
  {
    id: 'h1-typo-yoghurt-honney', category: 'typo', tolerance: 'normal',
    input: 'plain yoghurt 200g with a tsp of honney',
    ref: { kcal: 176, protein: 7.6, carbs: 16.6, fat: 9 },
    items: [
      { name: 'plain yogurt, whole milk', grams: 200, kcal: 156, protein: 7.6, carbs: 11.1, fat: 9, source: "USDA FNDDS 2705418 'Yogurt, whole milk, plain', 200 g: stated 200 g" },
      { name: 'honey', grams: 6.7, kcal: 20, protein: 0, carbs: 5.5, fat: 0, source: "USDA FNDDS 2710281 'Honey', 6.7 g: 1 tsp = 1/3 x '1 tablespoon' 20 g" },
    ],
  },
  {
    id: 'h1-typo-tomatos-mozarella', category: 'typo', tolerance: 'normal',
    input: '2 tomatos and 100g mozarella w a drizzle of olive oil',
    ref: { kcal: 426, protein: 25.8, carbs: 14.5, fat: 30.2 },
    items: [
      { name: 'tomatoes', grams: 250, kcal: 50, protein: 2.1, carbs: 10.1, fat: 0.8, source: "USDA FNDDS 2709719 'Tomatoes, raw', 250 g: 2 x '1 whole' 125 g" },
      { name: 'mozzarella', grams: 100, kcal: 296, protein: 23.7, carbs: 4.4, fat: 20.4, source: "USDA FNDDS 2705722 'Cheese, Mozzarella, NFS', 100 g: stated 100 g" },
      { name: 'olive oil', grams: 9, kcal: 80, protein: 0, carbs: 0, fat: 9, source: "USDA SR Legacy 171413 'Oil, olive, salad or cooking', 9 g: drizzle = 2 tsp (CONVENTION) x '1 tsp' 4.5 g" },
    ],
  },
  {
    id: 'h1-typo-salmom-asparagas', category: 'typo', tolerance: 'normal',
    input: 'salmom 150g with asparagas',
    ref: { kcal: 328, protein: 35.3, carbs: 3.7, fat: 18.6 },
    items: [
      { name: 'salmon, cooked', grams: 150, kcal: 309, protein: 33.2, carbs: 0, fat: 18.5, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 150 g: stated 150 g, cooked by convention" },
      { name: 'asparagus, cooked', grams: 90, kcal: 19, protein: 2.1, carbs: 3.7, fat: 0.1, source: "USDA FNDDS 2709834 'Asparagus, fresh, cooked, no added fat', 90 g: no amount: 'Quantity not specified' 90 g" },
    ],
  },
  {
    id: 'h1-typo-scrambeld-peice-toast', category: 'typo', tolerance: 'normal',
    input: 'two scrambeld eggs and a peice of toast',
    ref: { kcal: 277, protein: 15.4, carbs: 14.5, fat: 17.5 },
    items: [
      { name: 'scrambled eggs', grams: 110, kcal: 204, protein: 12.8, carbs: 1, fat: 16.5, source: "USDA FNDDS 2707198 'Egg omelet or scrambled egg, NS as to fat', 110 g: 2 x '1 egg' 55 g" },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g" },
    ],
  },
  {
    id: 'h1-typo-sweet-potatoe-chikn', category: 'typo', tolerance: 'tight',
    input: 'sweet potatoe 200g and grilled chikn 200g',
    ref: { kcal: 516, protein: 62.5, carbs: 36, fat: 11.7 },
    items: [
      { name: 'sweet potato, baked', grams: 200, kcal: 164, protein: 3.3, carbs: 36, fat: 0.8, source: "USDA FNDDS 2709699 'Sweet potato, baked, no added fat', 200 g: stated 200 g, cooked by convention" },
      { name: 'grilled chicken breast', grams: 200, kcal: 352, protein: 59.2, carbs: 0, fat: 10.9, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 200 g: stated 200 g; grilled, no sauce" },
    ],
  },
  {
    id: 'h1-typo-avacado-boild-egs', category: 'typo', tolerance: 'normal',
    input: 'half an avacado and 3 boild egs',
    ref: { kcal: 347, protein: 20.2, carbs: 7.6, fat: 26.4 },
    items: [
      { name: 'avocado', grams: 68, kcal: 114, protein: 1.3, carbs: 5.9, fat: 10.5, source: "USDA SR Legacy 171706 'Avocados, raw, California', 68 g: 0.5 x '1 fruit, without skin and seed' 136 g (Hass)" },
      { name: 'egg, hard-boiled', grams: 150, kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 150 g: 3 x '1 large' 50 g" },
    ],
  },
  {
    id: 'h1-typo-brown-rize-beens', category: 'typo', tolerance: 'normal',
    input: 'a cup of brown rize and 1/2 cup black beens',
    ref: { kcal: 362, protein: 13.1, carbs: 72.1, fat: 2.5 },
    items: [
      { name: 'brown rice, cooked', grams: 202, kcal: 248, protein: 5.5, carbs: 51.7, fat: 2, source: "USDA SR Legacy 169704 'Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)', 202 g: '1 cup' 202 g, cooked by convention" },
      { name: 'black beans, cooked', grams: 86, kcal: 114, protein: 7.6, carbs: 20.4, fat: 0.5, source: "USDA SR Legacy 173735 'Beans, black, mature seeds, cooked, boiled, without salt', 86 g: 0.5 x '1 cup' 172 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-typo-peanut-buter-bred', category: 'typo', tolerance: 'normal',
    input: '2 tbs peanut buter on 2 slices whole wheat bred',
    ref: { kcal: 374, protein: 16, carbs: 38.1, fat: 19 },
    items: [
      { name: 'peanut butter', grams: 32, kcal: 191, protein: 7.1, carbs: 7.1, fat: 16.4, source: "USDA FNDDS 2707537 'Peanut butter', 32 g: 2 x '1 tablespoon' 16 g" },
      { name: 'whole wheat bread', grams: 72, kcal: 183, protein: 8.9, carbs: 31, fat: 2.6, source: "USDA FNDDS 2707709 'Bread, whole wheat', 72 g: 2 x '1 medium or regular slice' 36 g" },
    ],
  },
  {
    id: 'h1-typo-oatmel-walnutes', category: 'typo', tolerance: 'normal',
    input: 'oatmel 1 cup w/ 1oz walnutes',
    ref: { kcal: 351, protein: 10.2, carbs: 32, fat: 22.1 },
    items: [
      { name: 'oatmeal, cooked', grams: 234, kcal: 166, protein: 5.9, carbs: 28.1, fat: 3.6, source: "USDA SR Legacy 173905 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt', 234 g: '1 cup' 234 g (oatmeal = cooked)" },
      { name: 'walnuts', grams: 28.3, kcal: 185, protein: 4.3, carbs: 3.9, fat: 18.5, source: "USDA SR Legacy 170187 'Nuts, walnuts, english', 28.3 g: 1 oz = 28.35 g" },
    ],
  },
  {
    id: 'h1-typo-strawberrys-greek-yoghurt', category: 'typo', tolerance: 'normal',
    input: 'a cup of strawberrys and a greek yoghurt',
    ref: { kcal: 155, protein: 16.3, carbs: 17.3, fat: 2.3 },
    items: [
      { name: 'strawberries', grams: 150, kcal: 54, protein: 1, carbs: 11.9, fat: 0.3, source: "USDA FNDDS 2709283 'Strawberries, raw', 150 g: '1 cup' 150 g" },
      { name: 'greek yogurt, plain', grams: 150, kcal: 101, protein: 15.3, carbs: 5.4, fat: 2, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 150 g: a yogurt = '1 container, NFS' 150 g" },
    ],
  },
  // ---- voice ----
  {
    id: 'h1-voice-too-eggs-and-toast', category: 'voice', tolerance: 'normal',
    input: 'too eggs and toast',
    ref: { kcal: 228, protein: 15.2, carbs: 14.6, fat: 11.6 },
    items: [
      { name: 'egg, hard-boiled', grams: 100, kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, source: 'USDA SR Legacy 173424 \'Egg, whole, cooked, hard-boiled\', 100 g: 2 x \'1 large\' 50 g (no cooking method given: hard-boiled by convention); "too" = two' },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g (no count: 1 slice)" },
    ],
  },
  {
    id: 'h1-voice-bowl-of-serial', category: 'voice', tolerance: 'loose',
    input: 'a bowl of serial with milk',
    ref: { kcal: 326, protein: 12.2, carbs: 52.6, fat: 7.3 },
    items: [
      { name: 'breakfast cereal', grams: 52.5, kcal: 199, protein: 4.1, carbs: 40.8, fat: 2.1, source: "USDA FNDDS 2708445 'Cereal, ready-to-eat, NFS', 52.5 g: bowl = 1.5 cups (CONVENTION) x '1 cup' 35 g ('Cereal, ready-to-eat, NFS')" },
      { name: 'milk', grams: 244, kcal: 127, protein: 8.1, carbs: 11.8, fat: 5.2, source: "USDA FNDDS 2705384 'Milk, NFS', 244 g: milk on a bowl of cereal = 1 cup (CONVENTION): '1 cup' 244 g, 'Milk, NFS'" },
    ],
    note: '"serial" = cereal',
  },
  {
    id: 'h1-voice-um-like-three-eggs', category: 'voice', tolerance: 'normal',
    input: 'for breakfast I had um like three eggs and uh a piece of toast',
    ref: { kcal: 306, protein: 21.5, carbs: 15.2, fat: 16.9 },
    items: [
      { name: 'egg, hard-boiled', grams: 150, kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 150 g: 3 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g" },
    ],
  },
  {
    id: 'h1-voice-pinot-butter-jelly', category: 'voice', tolerance: 'normal',
    input: 'pinot butter and jelly sandwich on two slices of white bread',
    ref: { kcal: 394, protein: 12.4, carbs: 48.7, fat: 18.4 },
    items: [
      { name: 'white bread', grams: 56, kcal: 150, protein: 5.3, carbs: 27.6, fat: 2, source: "USDA FNDDS 2707598 'Bread, white', 56 g: 2 x '1 medium or regular slice' 28 g" },
      { name: 'peanut butter', grams: 32, kcal: 191, protein: 7.1, carbs: 7.1, fat: 16.4, source: "USDA FNDDS 2707537 'Peanut butter', 32 g: 'Guideline amount per sandwich' 32 g" },
      { name: 'jelly', grams: 20, kcal: 53, protein: 0, carbs: 14, fat: 0, source: "USDA FNDDS 2710300 'Jelly', 20 g: no amount: 'Quantity not specified' 20 g (1 tbsp)" },
    ],
    note: '"pinot butter" = peanut butter',
  },
  {
    id: 'h1-voice-greek-honey-granola-i-think', category: 'voice', tolerance: 'loose',
    input: 'Greek yogurt with honey and like a quarter cup of granola I think',
    ref: { kcal: 238, protein: 18, carbs: 29.7, fat: 5.6 },
    items: [
      { name: 'greek yogurt, plain', grams: 150, kcal: 101, protein: 15.3, carbs: 5.4, fat: 2, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 150 g: no amount: 'Quantity not specified' 150 g" },
      { name: 'honey', grams: 7, kcal: 21, protein: 0, carbs: 5.8, fat: 0, source: "USDA FNDDS 2710281 'Honey', 7 g: no amount: 'Quantity not specified' 7 g" },
      { name: 'granola', grams: 27.5, kcal: 116, protein: 2.7, carbs: 18.5, fat: 3.6, source: "USDA FNDDS 2708461 'Cereal, granola', 27.5 g: 0.25 x '1 cup' 110 g" },
    ],
  },
  {
    id: 'h1-voice-chicken-breast-cup-rice-some-broccoli', category: 'voice', tolerance: 'loose',
    input: 'I ate a chicken breast with like a cup of rice and some broccoli',
    ref: { kcal: 448, protein: 41.9, carbs: 49.6, fat: 7.2 },
    items: [
      { name: 'grilled chicken breast', grams: 120, kcal: 211, protein: 35.5, carbs: 0, fat: 6.5, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 120 g: one breast, no size: '1 medium breast' 120 g" },
      { name: 'white rice, cooked', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 158 g: '1 cup' 158 g, cooked" },
      { name: 'broccoli, cooked', grams: 78, kcal: 32, protein: 2.1, carbs: 5.1, fat: 0.3, source: 'USDA FNDDS 2709645 \'Broccoli, fresh, cooked, no added fat\', 78 g: "some": \'Quantity not specified\' 78 g' },
    ],
  },
  {
    id: 'h1-voice-two-hundred-grams-one-fifty', category: 'voice', tolerance: 'tight',
    input: 'two hundred grams of chicken and one fifty of rice',
    ref: { kcal: 525, protein: 66, carbs: 42.3, fat: 7.5 },
    items: [
      { name: 'chicken breast, cooked', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.1, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 200 g: stated 200 g, cooked by convention; chicken = breast" },
      { name: 'white rice, cooked', grams: 150, kcal: 195, protein: 4, carbs: 42.3, fat: 0.4, source: 'USDA SR Legacy 168878 \'Rice, white, long-grain, regular, enriched, cooked\', 150 g: "one fifty" = 150 g, cooked by convention' },
    ],
  },
  {
    id: 'h1-voice-way-protein-after-bench', category: 'voice', tolerance: 'normal',
    input: 'Workout was bench 3 sets of 8 at 185 then I had a shake with two scoops of way protein and water',
    ref: { kcal: 183, protein: 40.6, carbs: 3.3, fat: 0.8 },
    items: [
      { name: 'whey protein powder', grams: 52, kcal: 183, protein: 40.6, carbs: 3.3, fat: 0.8, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 52 g: 2 x '1 scoop, NFS' 26 g" },
    ],
    workout: ['bench press 3x8 @185'],
    note: '"way protein" = whey protein',
  },
  {
    id: 'h1-voice-apple-some-all-minds', category: 'voice', tolerance: 'loose',
    input: 'I had a apple and some all minds',
    ref: { kcal: 289, protein: 6.2, carbs: 35.5, fat: 15 },
    items: [
      { name: 'apple', grams: 200, kcal: 122, protein: 0.3, carbs: 29.6, fat: 0.3, source: "USDA FNDDS 2709215 'Apple, raw', 200 g: 1 x '1 medium' 200 g (no size given)" },
      { name: 'almonds', grams: 28, kcal: 167, protein: 5.9, carbs: 5.9, fat: 14.7, source: 'USDA FNDDS 2707485 \'Almonds, NFS\', 28 g: "some": \'Quantity not specified\' 28 g' },
    ],
    note: '"all minds" = almonds',
  },
  {
    id: 'h1-voice-eight-ounce-stake-potato', category: 'voice', tolerance: 'loose',
    input: 'eight ounce stake and a baked potato with butter',
    ref: { kcal: 888, protein: 68.4, carbs: 59.9, fat: 41.2 },
    items: [
      { name: 'steak, cooked', grams: 226.8, kcal: 519, protein: 61.2, carbs: 0, fat: 29.3, source: "USDA FNDDS 2705824 'Beef, steak, NFS', 226.8 g: 8 oz = 226.8 g, cooked by convention" },
      { name: 'baked potato', grams: 285, kcal: 265, protein: 7.1, carbs: 59.9, fat: 0.4, source: "USDA FNDDS 2709524 'Potato, baked, peel eaten', 285 g: '1 medium' 285 g (no size given)" },
      { name: 'butter', grams: 14, kcal: 104, protein: 0.1, carbs: 0, fat: 11.5, source: "USDA FNDDS 2710154 'Butter, NFS', 14 g: no amount: 'Quantity not specified' 14 g" },
    ],
    note: '"stake" = steak',
  },
  {
    id: 'h1-voice-cup-oat-meal-table-spoon-honey', category: 'voice', tolerance: 'normal',
    input: 'a cup of oat meal with a table spoon of honey',
    ref: { kcal: 227, protein: 6, carbs: 44.6, fat: 3.6 },
    items: [
      { name: 'oatmeal, cooked', grams: 234, kcal: 166, protein: 5.9, carbs: 28.1, fat: 3.6, source: "USDA SR Legacy 173905 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt', 234 g: '1 cup' 234 g (oatmeal = cooked)" },
      { name: 'honey', grams: 20, kcal: 61, protein: 0.1, carbs: 16.5, fat: 0, source: "USDA FNDDS 2710281 'Honey', 20 g: '1 tablespoon' 20 g" },
    ],
  },
  {
    id: 'h1-voice-four-egg-whites-one-hole-egg', category: 'voice', tolerance: 'tight',
    input: 'four egg whites and one hole egg',
    ref: { kcal: 147, protein: 20.7, carbs: 1.6, fat: 5.5 },
    items: [
      { name: 'egg whites', grams: 132, kcal: 69, protein: 14.4, carbs: 1, fat: 0.2, source: "USDA SR Legacy 172183 'Egg, white, raw, fresh', 132 g: 4 x '1 large' 33 g" },
      { name: 'egg, hard-boiled', grams: 50, kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 50 g: 1 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
    ],
    note: '"hole" = whole',
  },
  {
    id: 'h1-voice-salmon-keen-wah', category: 'voice', tolerance: 'loose',
    input: 'salmon fillet with uh keen wah half a cup and some asparagus',
    ref: { kcal: 418, protein: 37.1, carbs: 23.4, fat: 19.2 },
    items: [
      { name: 'salmon, cooked', grams: 140, kcal: 288, protein: 30.9, carbs: 0, fat: 17.3, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 140 g: one fillet = 140 g (FNDDS 2706286 '1 small/regular fillet'); nutrients without added fat" },
      { name: 'quinoa, cooked', grams: 92.5, kcal: 111, protein: 4.1, carbs: 19.7, fat: 1.8, source: "USDA SR Legacy 168917 'Quinoa, cooked', 92.5 g: 0.5 x '1 cup' 185 g, cooked by convention" },
      { name: 'asparagus, cooked', grams: 90, kcal: 19, protein: 2.1, carbs: 3.7, fat: 0.1, source: 'USDA FNDDS 2709834 \'Asparagus, fresh, cooked, no added fat\', 90 g: "some": \'Quantity not specified\' 90 g' },
    ],
    note: '"keen wah" = quinoa',
  },
  {
    id: 'h1-voice-shake-two-scoops-whole-milk', category: 'voice', tolerance: 'normal',
    input: 'protein shake with two scoops and a cup of whole milk',
    ref: { kcal: 332, protein: 48.3, carbs: 15, fat: 8.7 },
    items: [
      { name: 'whey protein powder', grams: 52, kcal: 183, protein: 40.6, carbs: 3.3, fat: 0.8, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 52 g: 2 x '1 scoop, NFS' 26 g" },
      { name: 'whole milk', grams: 244, kcal: 149, protein: 7.7, carbs: 11.7, fat: 7.9, source: "USDA SR Legacy 171265 'Milk, whole, 3.25% milkfat, with added vitamin D', 244 g: '1 cup' 244 g" },
    ],
  },
  {
    id: 'h1-voice-banana-and-a-half-coffee-milk', category: 'voice', tolerance: 'normal',
    input: 'I had a banana and a half and uh a coffee with milk',
    ref: { kcal: 203, protein: 2.8, carbs: 44.3, fat: 1.2 },
    items: [
      { name: 'banana', grams: 189, kcal: 183, protein: 1.4, carbs: 42.9, fat: 0.5, source: "USDA FNDDS 2709224 'Banana, raw', 189 g: 1.5 x '1 banana' 126 g" },
      { name: 'coffee, brewed', grams: 360, kcal: 4, protein: 0.4, carbs: 0, fat: 0.1, source: "USDA FNDDS 2710375 'Coffee, brewed', 360 g: no size: 'Quantity not specified' 360 g (12 fl oz)" },
      { name: 'milk', grams: 30, kcal: 16, protein: 1, carbs: 1.4, fat: 0.6, source: "USDA FNDDS 2705384 'Milk, NFS', 30 g: milk in coffee: 'Guideline amount per fl oz of beverage' 2.5 g x 12 fl oz" },
    ],
  },
  // ---- runon ----
  {
    id: 'h1-runon-three-meals-vague', category: 'runon', tolerance: 'loose',
    input: 'bfast 3 eggs + 1 cup oatmeal, lunch was chicken and rice and broccoli, dinner salmon w a baked potato',
    ref: { kcal: 1352, protein: 103.7, carbs: 129, fat: 44.3 },
    items: [
      { name: 'egg, hard-boiled', grams: 150, kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 150 g: 3 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
      { name: 'oatmeal, cooked', grams: 234, kcal: 166, protein: 5.9, carbs: 28.1, fat: 3.6, source: "USDA SR Legacy 173905 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt', 234 g: '1 cup' 234 g" },
      { name: 'grilled chicken breast', grams: 120, kcal: 211, protein: 35.5, carbs: 0, fat: 6.5, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 120 g: no amount: 'Quantity not specified' 120 g" },
      { name: 'white rice, cooked', grams: 122, kcal: 157, protein: 3.3, carbs: 34.2, fat: 0.3, source: "USDA FNDDS 2708403 'Rice, white, cooked, NS as to fat', 122 g: no amount: 'Quantity not specified' 122 g" },
      { name: 'broccoli, cooked', grams: 78, kcal: 32, protein: 2.1, carbs: 5.1, fat: 0.3, source: "USDA FNDDS 2709645 'Broccoli, fresh, cooked, no added fat', 78 g: no amount: 'Quantity not specified' 78 g" },
      { name: 'salmon, cooked', grams: 140, kcal: 288, protein: 30.9, carbs: 0, fat: 17.3, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 140 g: no amount: one fillet = 140 g (FNDDS 2706286 '1 small/regular fillet' and 'Quantity not specified')" },
      { name: 'baked potato', grams: 285, kcal: 265, protein: 7.1, carbs: 59.9, fat: 0.4, source: "USDA FNDDS 2709524 'Potato, baked, peel eaten', 285 g: '1 medium' 285 g (no size given)" },
    ],
  },
  {
    id: 'h1-runon-banana-turkey-sandwich-apple', category: 'runon', tolerance: 'normal',
    input: 'banana at 10 then turkey sandwich w 2 slices wheat bread 3 slices turkey 1 slice cheddar and mustard, apple around 3',
    ref: { kcal: 605, protein: 27.6, carbs: 91.8, fat: 13.8 },
    items: [
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'whole wheat bread', grams: 72, kcal: 183, protein: 8.9, carbs: 31, fat: 2.6, source: "USDA FNDDS 2707709 'Bread, whole wheat', 72 g: 2 x '1 medium or regular slice' 36 g" },
      { name: 'deli turkey', grams: 84, kcal: 89, protein: 12.4, carbs: 1.8, fat: 3.2, source: "USDA FNDDS 2706215 'Turkey, prepackaged or deli, luncheon meat', 84 g: 3 x '1 slice, NFS' 28 g" },
      { name: 'cheddar', grams: 21, kcal: 86, protein: 4.9, carbs: 0.5, fat: 7.1, source: "USDA FNDDS 2705709 'Cheese, Cheddar', 21 g: '1 slice' 21 g" },
      { name: 'mustard', grams: 5, kcal: 3, protein: 0.2, carbs: 0.3, fat: 0.2, source: "USDA FNDDS 2710085 'Mustard', 5 g: 'Guideline amount on regular sandwich' 5 g" },
      { name: 'apple', grams: 200, kcal: 122, protein: 0.3, carbs: 29.6, fat: 0.3, source: "USDA FNDDS 2709215 'Apple, raw', 200 g: 1 x '1 medium' 200 g (no size given)" },
    ],
  },
  {
    id: 'h1-runon-legs-then-rice-chicken', category: 'runon', tolerance: 'normal',
    input: 'legs today squats 5x5 at 225 rdls 3x10 135 then ate 2 cups rice and 8 oz chicken after',
    ref: { kcal: 785, protein: 78.9, carbs: 89, fat: 9 },
    items: [
      { name: 'white rice, cooked', grams: 316, kcal: 411, protein: 8.5, carbs: 89, fat: 0.9, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 316 g: 2 x '1 cup' 158 g, cooked" },
      { name: 'chicken breast, cooked', grams: 226.8, kcal: 374, protein: 70.4, carbs: 0, fat: 8.1, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 226.8 g: 8 oz = 226.8 g, cooked by convention; chicken = breast" },
    ],
    workout: ['squat 5x5 @225', 'romanian deadlift 3x10 @135'],
  },
  {
    id: 'h1-runon-coffee-fried-eggs-cashews', category: 'runon', tolerance: 'loose',
    input: 'coffee w a splash of whole milk then 2 fried eggs on toast then later an apple and a handful of cashews',
    ref: { kcal: 585, protein: 21.4, carbs: 54.9, fat: 32 },
    items: [
      { name: 'coffee, brewed', grams: 360, kcal: 4, protein: 0.4, carbs: 0, fat: 0.1, source: "USDA FNDDS 2710375 'Coffee, brewed', 360 g: no size: 'Quantity not specified' 360 g" },
      { name: 'whole milk', grams: 30.9, kcal: 19, protein: 1, carbs: 1.5, fat: 1, source: "USDA SR Legacy 171265 'Milk, whole, 3.25% milkfat, with added vitamin D', 30.9 g: splash = 30 ml (CONVENTION) x 244 g/236.6 ml" },
      { name: 'fried eggs', grams: 110, kcal: 204, protein: 12.8, carbs: 1, fat: 16.5, source: "USDA FNDDS 2707155 'Egg, whole, fried, NS as to fat', 110 g: 2 x '1 egg' 55 g" },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g (no count: 1 slice)" },
      { name: 'apple', grams: 200, kcal: 122, protein: 0.3, carbs: 29.6, fat: 0.3, source: "USDA FNDDS 2709215 'Apple, raw', 200 g: 1 x '1 medium' 200 g (no size given)" },
      { name: 'cashews', grams: 28.4, kcal: 163, protein: 4.3, carbs: 9.3, fat: 13.1, source: "USDA SR Legacy 170571 'Nuts, cashew nuts, dry roasted, without salt added', 28.4 g: handful of nuts = 1 oz (CONVENTION) 28.35 g" },
    ],
  },
  {
    id: 'h1-runon-ate-a-lot-today', category: 'runon', tolerance: 'normal',
    input: 'ate a lot today. 4 eggs 2 slices toast. 300g chicken 250g rice. greek yogurt 200g. 2 bananas',
    ref: { kcal: 1655, protein: 152.5, carbs: 164.1, fat: 38 },
    items: [
      { name: 'egg, hard-boiled', grams: 200, kcal: 310, protein: 25.2, carbs: 2.2, fat: 21.2, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 200 g: 4 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
      { name: 'white toast', grams: 50, kcal: 147, protein: 5.2, carbs: 27.1, fat: 2, source: "USDA FNDDS 2707599 'Bread, white, toasted', 50 g: 2 x '1 medium or regular slice' 25 g" },
      { name: 'chicken breast, cooked', grams: 300, kcal: 495, protein: 93.1, carbs: 0, fat: 10.7, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 300 g: stated 300 g, cooked by convention" },
      { name: 'white rice, cooked', grams: 250, kcal: 325, protein: 6.7, carbs: 70.4, fat: 0.7, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 250 g: stated 250 g, cooked by convention" },
      { name: 'greek yogurt, plain', grams: 200, kcal: 134, protein: 20.4, carbs: 7.2, fat: 2.7, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 200 g: stated 200 g" },
      { name: 'banana', grams: 252, kcal: 244, protein: 1.9, carbs: 57.2, fat: 0.7, source: "USDA FNDDS 2709224 'Banana, raw', 252 g: 2 x '1 banana' 126 g" },
    ],
  },
  {
    id: 'h1-runon-snacks-apple-string-cheese-almonds', category: 'runon', tolerance: 'normal',
    input: 'snacks today were an apple a string cheese and like 20 almonds',
    ref: { kcal: 350, protein: 12, carbs: 35.9, fat: 18.7 },
    items: [
      { name: 'apple', grams: 200, kcal: 122, protein: 0.3, carbs: 29.6, fat: 0.3, source: "USDA FNDDS 2709215 'Apple, raw', 200 g: 1 x '1 medium' 200 g (no size given)" },
      { name: 'string cheese', grams: 28.4, kcal: 84, protein: 6.7, carbs: 1.3, fat: 5.8, source: "USDA FNDDS 2705723 'Cheese, Mozzarella, part skim', 28.4 g: '1 stick' 28.35 g" },
      { name: 'almonds', grams: 24, kcal: 144, protein: 5, carbs: 5, fat: 12.6, source: "USDA FNDDS 2707485 'Almonds, NFS', 24 g: 20 x '1 nut' 1.2 g" },
    ],
  },
  {
    id: 'h1-runon-lunch-dinner-slash', category: 'runon', tolerance: 'normal',
    input: 'lunch: 1 cup quinoa, 1/2 cup black beans, 1/2 avocado, 2 tbsp salsa / dinner: 6 oz shrimp + 1 cup green beans',
    ref: { kcal: 687, protein: 61.2, carbs: 79.2, fat: 15.6 },
    items: [
      { name: 'quinoa, cooked', grams: 185, kcal: 222, protein: 8.1, carbs: 39.4, fat: 3.6, source: "USDA SR Legacy 168917 'Quinoa, cooked', 185 g: '1 cup' 185 g, cooked by convention" },
      { name: 'black beans, cooked', grams: 86, kcal: 114, protein: 7.6, carbs: 20.4, fat: 0.5, source: "USDA SR Legacy 173735 'Beans, black, mature seeds, cooked, boiled, without salt', 86 g: 0.5 x '1 cup' 172 g" },
      { name: 'avocado', grams: 68, kcal: 114, protein: 1.3, carbs: 5.9, fat: 10.5, source: "USDA SR Legacy 171706 'Avocados, raw, California', 68 g: 0.5 x '1 fruit, without skin and seed' 136 g (Hass)" },
      { name: 'salsa', grams: 36, kcal: 10, protein: 0.5, carbs: 2.4, fat: 0.1, source: "USDA SR Legacy 174524 'Sauce, salsa, ready-to-serve', 36 g: '2 tbsp' 36 g" },
      { name: 'shrimp, cooked', grams: 170.1, kcal: 168, protein: 40.8, carbs: 0.3, fat: 0.5, source: "USDA SR Legacy 175180 'Crustaceans, shrimp, cooked', 170.1 g: 6 oz = 170.1 g, cooked by convention" },
      { name: 'green beans, cooked', grams: 140, kcal: 59, protein: 2.9, carbs: 10.8, fat: 0.4, source: "USDA FNDDS 2709852 'Green beans, fresh, cooked, no added fat', 140 g: '1 cup' 140 g" },
    ],
  },
  {
    id: 'h1-runon-chest-day-shake-pasta', category: 'runon', tolerance: 'normal',
    input: 'chest day bench 4x6 incline db 3x10 flyes 3x12. post workout 2 scoops whey in water and a banana, later 2 cups pasta w 4 oz ground beef',
    ref: { kcal: 993, protein: 84.9, carbs: 108.4, fat: 22.6 },
    items: [
      { name: 'whey protein powder', grams: 52, kcal: 183, protein: 40.6, carbs: 3.3, fat: 0.8, source: "USDA FNDDS 2710742 'Nutritional powder mix, whey based, NFS', 52 g: 2 x '1 scoop, NFS' 26 g" },
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'pasta, cooked', grams: 248, kcal: 392, protein: 14.4, carbs: 76.5, fat: 2.3, source: "USDA SR Legacy 169737 'Pasta, cooked, enriched, without added salt', 248 g: 2 x '1 cup spaghetti not packed' 124 g, cooked by convention" },
      { name: 'ground beef, cooked', grams: 113.4, kcal: 296, protein: 29, carbs: 0, fat: 19.1, source: "USDA FNDDS 2705854 'Beef, ground', 113.4 g: 4 oz = 113.4 g, cooked by convention; leanness unstated = 'Beef, ground'" },
    ],
    workout: ['bench press 4x6', 'incline dumbbell press 3x10', 'flyes 3x12'],
  },
  {
    id: 'h1-runon-oats-milk-ricecakes-salmon', category: 'runon', tolerance: 'normal',
    input: 'morning oats 80g with 250ml milk then rice cakes x3 then 200g salmon 1 cup rice',
    ref: { kcal: 1158, protein: 69.9, carbs: 133.1, fat: 36.7 },
    items: [
      { name: 'rolled oats, dry', grams: 80, kcal: 303, protein: 10.5, carbs: 54.2, fat: 5.2, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 80 g: stated 80 g (oats in grams = dry)" },
      { name: 'milk', grams: 257.8, kcal: 134, protein: 8.6, carbs: 12.5, fat: 5.5, source: "USDA FNDDS 2705384 'Milk, NFS', 257.8 g: 250 ml x 244 g/236.6 ml; milk type unstated = 'Milk, NFS'" },
      { name: 'rice cakes', grams: 27, kcal: 104, protein: 2.3, carbs: 21.9, fat: 0.9, source: "USDA SR Legacy 169679 'Snacks, rice cakes, brown rice, corn', 27 g: 3 x '1 cake' 9 g" },
      { name: 'salmon, cooked', grams: 200, kcal: 412, protein: 44.2, carbs: 0, fat: 24.7, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 200 g: stated 200 g, cooked by convention" },
      { name: 'white rice, cooked', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 158 g: '1 cup' 158 g, cooked" },
    ],
  },
  {
    id: 'h1-runon-nothing-til-2-then', category: 'runon', tolerance: 'normal',
    input: 'had nothing til 2 then a chicken breast and a big sweet potato then a pear before bed',
    ref: { kcal: 510, protein: 40.1, carbs: 69.7, fat: 7.7 },
    items: [
      { name: 'grilled chicken breast', grams: 120, kcal: 211, protein: 35.5, carbs: 0, fat: 6.5, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 120 g: one breast, no size: '1 medium breast' 120 g" },
      { name: 'sweet potato, baked', grams: 235, kcal: 193, protein: 3.9, carbs: 42.3, fat: 0.9, source: "USDA FNDDS 2709699 'Sweet potato, baked, no added fat', 235 g: big = '1 large' 235 g" },
      { name: 'pear', grams: 180, kcal: 106, protein: 0.7, carbs: 27.4, fat: 0.3, source: "USDA FNDDS 2709254 'Pear, raw', 180 g: '1 fruit' 180 g" },
    ],
  },
  // ---- vague ----
  {
    id: 'h1-vague-some-rice-with-chicken', category: 'vague', tolerance: 'loose',
    input: 'some rice with chicken',
    ref: { kcal: 368, protein: 38.8, carbs: 34.2, fat: 6.8 },
    items: [
      { name: 'white rice, cooked', grams: 122, kcal: 157, protein: 3.3, carbs: 34.2, fat: 0.3, source: 'USDA FNDDS 2708403 \'Rice, white, cooked, NS as to fat\', 122 g: "some": \'Quantity not specified\' 122 g' },
      { name: 'grilled chicken breast', grams: 120, kcal: 211, protein: 35.5, carbs: 0, fat: 6.5, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 120 g: no amount: 'Quantity not specified' 120 g" },
    ],
  },
  {
    id: 'h1-vague-spinach-little-olive-oil', category: 'vague', tolerance: 'loose',
    input: 'spinach sauteed in a little olive oil',
    ref: { kcal: 90, protein: 3.1, carbs: 2.8, fat: 7.4 },
    items: [
      { name: 'spinach, cooked', grams: 90, kcal: 30, protein: 3.1, carbs: 2.8, fat: 0.6, source: "USDA FNDDS 2709615 'Spinach, fresh, cooked, no added fat', 90 g: no amount: 'Quantity not specified' 90 g (no-fat entry; the oil is its own item)" },
      { name: 'olive oil', grams: 6.8, kcal: 60, protein: 0, carbs: 0, fat: 6.8, source: 'USDA SR Legacy 171413 \'Oil, olive, salad or cooking\', 6.8 g: "a little" = 0.5 x 1 tbsp (CONVENTION) x \'1 tablespoon\' 13.5 g' },
    ],
  },
  {
    id: 'h1-vague-big-bowl-oatmeal', category: 'vague', tolerance: 'loose',
    input: 'a big bowl of oatmeal',
    ref: { kcal: 332, protein: 11.9, carbs: 56.2, fat: 7.1 },
    items: [
      { name: 'oatmeal, cooked', grams: 468, kcal: 332, protein: 11.9, carbs: 56.2, fat: 7.1, source: "USDA SR Legacy 173905 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt', 468 g: big bowl = 2 cups (CONVENTION: bowl 1.5 cups x big 1.3) x '1 cup' 234 g" },
    ],
  },
  {
    id: 'h1-vague-few-strawberries-some-greek', category: 'vague', tolerance: 'loose',
    input: 'a few strawberries and some greek yogurt',
    ref: { kcal: 120, protein: 15.6, carbs: 9.7, fat: 2.1 },
    items: [
      { name: 'strawberries', grams: 54, kcal: 19, protein: 0.3, carbs: 4.3, fat: 0.1, source: "USDA FNDDS 2709283 'Strawberries, raw', 54 g: a few = 3 (CONVENTION) x '1 fruit' 18 g" },
      { name: 'greek yogurt, plain', grams: 150, kcal: 101, protein: 15.3, carbs: 5.4, fat: 2, source: 'USDA FNDDS 2705421 \'Yogurt, Greek, NS as to type of milk, plain\', 150 g: "some": \'Quantity not specified\' 150 g' },
    ],
  },
  {
    id: 'h1-vague-handful-almonds-orange', category: 'vague', tolerance: 'loose',
    input: 'a handful of almonds and an orange',
    ref: { kcal: 244, protein: 7.3, carbs: 24.1, fat: 14.9 },
    items: [
      { name: 'almonds', grams: 28, kcal: 167, protein: 5.9, carbs: 5.9, fat: 14.7, source: "USDA FNDDS 2707485 'Almonds, NFS', 28 g: handful of nuts = 1 oz (CONVENTION) = 'Quantity not specified' 28 g" },
      { name: 'orange', grams: 154, kcal: 77, protein: 1.4, carbs: 18.2, fat: 0.2, source: "USDA FNDDS 2709171 'Orange, raw', 154 g: '1 fruit' 154 g" },
    ],
  },
  {
    id: 'h1-vague-coffee-splash-milk', category: 'vague', tolerance: 'loose',
    input: 'coffee with a splash of milk',
    ref: { kcal: 20, protein: 1.4, carbs: 1.5, fat: 0.8 },
    items: [
      { name: 'coffee, brewed', grams: 360, kcal: 4, protein: 0.4, carbs: 0, fat: 0.1, source: "USDA FNDDS 2710375 'Coffee, brewed', 360 g: no size: 'Quantity not specified' 360 g" },
      { name: 'milk', grams: 30.9, kcal: 16, protein: 1, carbs: 1.5, fat: 0.7, source: "USDA FNDDS 2705384 'Milk, NFS', 30.9 g: splash = 30 ml (CONVENTION) x 244 g/236.6 ml; 'Milk, NFS'" },
    ],
  },
  {
    id: 'h1-vague-couple-slices-cheddar-apple', category: 'vague', tolerance: 'loose',
    input: 'a couple slices of cheddar and an apple',
    ref: { kcal: 294, protein: 10.1, carbs: 30.6, fat: 14.6 },
    items: [
      { name: 'cheddar', grams: 42, kcal: 172, protein: 9.8, carbs: 1, fat: 14.3, source: "USDA FNDDS 2705709 'Cheese, Cheddar', 42 g: couple = 2 (CONVENTION) x '1 slice' 21 g" },
      { name: 'apple', grams: 200, kcal: 122, protein: 0.3, carbs: 29.6, fat: 0.3, source: "USDA FNDDS 2709215 'Apple, raw', 200 g: 1 x '1 medium' 200 g (no size given)" },
    ],
  },
  {
    id: 'h1-vague-plain-yogurt-drizzle-honey', category: 'vague', tolerance: 'loose',
    input: 'plain yogurt with a drizzle of honey',
    ref: { kcal: 174, protein: 6.5, carbs: 20.5, fat: 7.6 },
    items: [
      { name: 'plain yogurt, whole milk', grams: 170, kcal: 133, protein: 6.5, carbs: 9.5, fat: 7.6, source: "USDA FNDDS 2705418 'Yogurt, whole milk, plain', 170 g: no amount: 'Quantity not specified' 170 g" },
      { name: 'honey', grams: 13.3, kcal: 41, protein: 0, carbs: 11, fat: 0, source: "USDA FNDDS 2710281 'Honey', 13.3 g: drizzle = 2 tsp (CONVENTION) = 2/3 x '1 tablespoon' 20 g" },
    ],
  },
  {
    id: 'h1-vague-banana-bit-of-pb', category: 'vague', tolerance: 'loose',
    input: 'a banana with a bit of peanut butter',
    ref: { kcal: 218, protein: 4.5, carbs: 32.2, fat: 8.6 },
    items: [
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'peanut butter', grams: 16, kcal: 96, protein: 3.6, carbs: 3.6, fat: 8.2, source: 'USDA FNDDS 2707537 \'Peanut butter\', 16 g: "a bit" = 0.5 (CONVENTION) x \'Quantity not specified\' 32 g' },
    ],
  },
  {
    id: 'h1-vague-bowl-rice-some-black-beans', category: 'vague', tolerance: 'loose',
    input: 'a bowl of rice and some black beans',
    ref: { kcal: 429, protein: 14.6, carbs: 88.6, fat: 1.2 },
    items: [
      { name: 'white rice, cooked', grams: 237, kcal: 308, protein: 6.4, carbs: 66.8, fat: 0.7, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 237 g: bowl = 1.5 cups (CONVENTION) x '1 cup' 158 g" },
      { name: 'black beans, cooked', grams: 92, kcal: 121, protein: 8.2, carbs: 21.8, fat: 0.5, source: 'USDA SR Legacy 173735 \'Beans, black, mature seeds, cooked, boiled, without salt\', 92 g: "some": 92 g = FNDDS 2707359 \'Black beans, NFS\' \'Quantity not specified\'; boiled, no fat' },
    ],
  },
  {
    id: 'h1-vague-some-grapes-cheese-stick', category: 'vague', tolerance: 'loose',
    input: 'snacked on some grapes and a cheese stick',
    ref: { kcal: 146, protein: 7.4, carbs: 15.9, fat: 6 },
    items: [
      { name: 'grapes', grams: 75, kcal: 62, protein: 0.7, carbs: 14.6, fat: 0.2, source: 'USDA FNDDS 2709237 \'Grapes, raw\', 75 g: "some": \'Quantity not specified\' 75 g' },
      { name: 'string cheese', grams: 28.4, kcal: 84, protein: 6.7, carbs: 1.3, fat: 5.8, source: "USDA FNDDS 2705723 'Cheese, Mozzarella, part skim', 28.4 g: '1 stick' 28.35 g" },
    ],
  },
  {
    id: 'h1-vague-small-piece-salmon-few-spears', category: 'vague', tolerance: 'loose',
    input: 'a small piece of salmon and a few asparagus spears',
    ref: { kcal: 185, protein: 19.9, carbs: 2, fat: 10.6 },
    items: [
      { name: 'salmon, cooked', grams: 85, kcal: 175, protein: 18.8, carbs: 0, fat: 10.5, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 85 g: small piece = '3 oz' 85 g (CONVENTION; FDA RACC fish 85 g)" },
      { name: 'asparagus, cooked', grams: 48, kcal: 10, protein: 1.1, carbs: 2, fat: 0.1, source: "USDA FNDDS 2709834 'Asparagus, fresh, cooked, no added fat', 48 g: a few = 3 (CONVENTION) x '1 spear' 16 g" },
    ],
  },
  // ---- correction ----
  {
    id: 'h1-corr-ran-then-eggs-wait-3', category: 'correction', tolerance: 'tight',
    input: 'ran 5k this morning then 2 eggs, wait no 3',
    ref: { kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9 },
    items: [
      { name: 'egg, hard-boiled', grams: 150, kcal: 233, protein: 18.9, carbs: 1.7, fat: 15.9, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 150 g: 3 x '1 large' 50 g (no cooking method given: hard-boiled by convention); corrected from 2 to 3" },
    ],
    workout: ['5k run'],
  },
  {
    id: 'h1-corr-rice-more-like-1-5-cups', category: 'correction', tolerance: 'normal',
    input: 'a cup of rice w my chicken, actually more like 1.5 cups. chicken was 6oz',
    ref: { kcal: 589, protein: 59.2, carbs: 66.8, fat: 6.8 },
    items: [
      { name: 'white rice, cooked', grams: 237, kcal: 308, protein: 6.4, carbs: 66.8, fat: 0.7, source: "USDA SR Legacy 168878 'Rice, white, long-grain, regular, enriched, cooked', 237 g: corrected to 1.5 x '1 cup' 158 g" },
      { name: 'chicken breast, cooked', grams: 170.1, kcal: 281, protein: 52.8, carbs: 0, fat: 6.1, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 170.1 g: 6 oz = 170.1 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-corr-chicken-200-sorry-250', category: 'correction', tolerance: 'tight',
    input: 'chicken breast 200g sorry 250g',
    ref: { kcal: 413, protein: 77.6, carbs: 0, fat: 8.9 },
    items: [
      { name: 'chicken breast, cooked', grams: 250, kcal: 413, protein: 77.6, carbs: 0, fat: 8.9, source: "USDA SR Legacy 171477 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 250 g: corrected to 250 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-corr-pear-not-apple', category: 'correction', tolerance: 'normal',
    input: 'had a banana and an apple. no wait it was a pear not an apple',
    ref: { kcal: 228, protein: 1.6, carbs: 56, fat: 0.7 },
    items: [
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'pear', grams: 180, kcal: 106, protein: 0.7, carbs: 27.4, fat: 0.3, source: "USDA FNDDS 2709254 'Pear, raw', 180 g: '1 fruit' 180 g (replaces the apple)" },
    ],
  },
  {
    id: 'h1-corr-toast-only-2-slices', category: 'correction', tolerance: 'normal',
    input: '3 slices of toast with butter.. actually only 2 slices',
    ref: { kcal: 251, protein: 5.3, carbs: 27.1, fat: 13.5 },
    items: [
      { name: 'white toast', grams: 50, kcal: 147, protein: 5.2, carbs: 27.1, fat: 2, source: "USDA FNDDS 2707599 'Bread, white, toasted', 50 g: 2 x '1 medium or regular slice' 25 g (corrected from 3)" },
      { name: 'butter', grams: 14, kcal: 104, protein: 0.1, carbs: 0, fat: 11.5, source: "USDA FNDDS 2710154 'Butter, NFS', 14 g: 2 x 'Guideline amount per slice of bread/roll' 7 g" },
    ],
  },
  {
    id: 'h1-corr-honey-make-that-1-tbsp', category: 'correction', tolerance: 'normal',
    input: 'oatmeal 1 cup with 2 tbsp honey, make that 1 tbsp',
    ref: { kcal: 227, protein: 6, carbs: 44.6, fat: 3.6 },
    items: [
      { name: 'oatmeal, cooked', grams: 234, kcal: 166, protein: 5.9, carbs: 28.1, fat: 3.6, source: "USDA SR Legacy 173905 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt', 234 g: '1 cup' 234 g" },
      { name: 'honey', grams: 20, kcal: 61, protein: 0.1, carbs: 16.5, fat: 0, source: "USDA FNDDS 2710281 'Honey', 20 g: corrected to '1 tablespoon' 20 g" },
    ],
  },
  {
    id: 'h1-corr-salmon-typo-meant-8oz', category: 'correction', tolerance: 'normal',
    input: '6oz salmon - typo, meant 8oz',
    ref: { kcal: 467, protein: 50.1, carbs: 0, fat: 28 },
    items: [
      { name: 'salmon, cooked', grams: 226.8, kcal: 467, protein: 50.1, carbs: 0, fat: 28, source: "USDA SR Legacy 175168 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 226.8 g: corrected to 8 oz = 226.8 g, cooked by convention" },
    ],
    note: 'normal, not tight: salmon type unstated; reference is farmed Atlantic cooked without added fat',
  },
  {
    id: 'h1-corr-whole-milk-no-300', category: 'correction', tolerance: 'tight',
    input: '200ml whole milk, no 300',
    ref: { kcal: 189, protein: 9.7, carbs: 14.9, fat: 10.1 },
    items: [
      { name: 'whole milk', grams: 309.4, kcal: 189, protein: 9.7, carbs: 14.9, fat: 10.1, source: "USDA SR Legacy 171265 'Milk, whole, 3.25% milkfat, with added vitamin D', 309.4 g: corrected to 300 ml x 244 g/236.6 ml" },
    ],
  },
  {
    id: 'h1-corr-skip-the-toast', category: 'correction', tolerance: 'tight',
    input: '2 boiled eggs and toast. actually skip the toast, didnt eat it',
    ref: { kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
    items: [
      { name: 'egg, hard-boiled', grams: 100, kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 100 g: 2 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
    ],
    note: 'the toast is retracted',
  },
  {
    id: 'h1-corr-scratch-breakfast', category: 'correction', tolerance: 'tight',
    input: 'had 2 eggs for breakfast. scratch that, i skipped breakfast today',
    ref: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    items: [],
    note: 'the only food is retracted: nothing should be logged',
  },
  // ---- units ----
  {
    id: 'h1-units-third-cup-oats-almond-milk', category: 'units', tolerance: 'normal',
    input: '1/3 cup oats with a cup of unsweetened almond milk',
    ref: { kcal: 139, protein: 4.9, carbs: 19.1, fat: 4.8 },
    items: [
      { name: 'rolled oats, dry', grams: 27, kcal: 102, protein: 3.6, carbs: 18.3, fat: 1.8, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 27 g: '0.33 cup' 27 g (oats in cups = dry)" },
      { name: 'almond milk, unsweetened', grams: 244, kcal: 37, protein: 1.3, carbs: 0.8, fat: 3, source: "USDA FNDDS 2705409 'Almond milk, unsweetened', 244 g: '1 cup' 244 g" },
    ],
  },
  {
    id: 'h1-units-one-and-a-half-cups-black-beans', category: 'units', tolerance: 'normal',
    input: 'one and a half cups of black beans',
    ref: { kcal: 341, protein: 22.9, carbs: 61.2, fat: 1.4 },
    items: [
      { name: 'black beans, cooked', grams: 258, kcal: 341, protein: 22.9, carbs: 61.2, fat: 1.4, source: "USDA SR Legacy 173735 'Beans, black, mature seeds, cooked, boiled, without salt', 258 g: 1.5 x '1 cup' 172 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-units-250-g-cottage-cheese', category: 'units', tolerance: 'normal',
    input: '250 g cottage cheese',
    ref: { kcal: 205, protein: 27.5, carbs: 10.8, fat: 5.8 },
    items: [
      { name: 'cottage cheese', grams: 250, kcal: 205, protein: 27.5, carbs: 10.8, fat: 5.8, source: "USDA FNDDS 2705747 'Cheese, cottage, NFS', 250 g: stated 250 g" },
    ],
    note: 'normal, not tight: fat level unstated (USDA 72-98 kcal/100 g); reference is FNDDS Cottage cheese, NFS',
  },
  {
    id: 'h1-units-8-oz-sirloin', category: 'units', tolerance: 'normal',
    input: '8 oz sirloin',
    ref: { kcal: 542, protein: 61.5, carbs: 0, fat: 31.8 },
    items: [
      { name: 'sirloin steak, cooked', grams: 226.8, kcal: 542, protein: 61.5, carbs: 0, fat: 31.8, source: "USDA FNDDS 2705832 'Beef, steak, sirloin, NS as to fat eaten', 226.8 g: 8 oz = 226.8 g, cooked by convention; fat eaten not stated" },
    ],
    note: 'normal, not tight: lean-only sirloin (SR 173118, 187 kcal/100 g) vs fat eaten (239) is the main uncertainty',
  },
  {
    id: 'h1-units-half-pound-shrimp', category: 'units', tolerance: 'normal',
    input: 'half a pound of shrimp',
    ref: { kcal: 225, protein: 54.4, carbs: 0.5, fat: 0.6 },
    items: [
      { name: 'shrimp, cooked', grams: 226.8, kcal: 225, protein: 54.4, carbs: 0.5, fat: 0.6, source: "USDA SR Legacy 175180 'Crustaceans, shrimp, cooked', 226.8 g: half a pound = 226.8 g, cooked by convention" },
    ],
    note: 'normal, not tight: USDA cooked shrimp ranges 99 (SR 175180) to 119 kcal/100 g (SR 171971, moist heat)',
  },
  {
    id: 'h1-units-2-tbsp-almond-butter-english-muffin', category: 'units', tolerance: 'normal',
    input: '2 tbsp almond butter on an english muffin',
    ref: { kcal: 330, protein: 11.1, carbs: 32.2, fat: 18.8 },
    items: [
      { name: 'almond butter', grams: 32, kcal: 196, protein: 6.7, carbs: 6, fat: 17.8, source: "USDA SR Legacy 168588 'Nuts, almond butter, plain, without salt added', 32 g: 2 x '1 tbsp' 16 g" },
      { name: 'english muffin', grams: 57, kcal: 134, protein: 4.4, carbs: 26.2, fat: 1, source: "USDA SR Legacy 175063 'English muffins, plain, enriched, without calcium propionate(includes sourdough)', 57 g: '1 muffin' 57 g" },
    ],
  },
  {
    id: 'h1-units-tsp-honey-in-tea', category: 'units', tolerance: 'normal',
    input: 'a tsp of honey in my tea',
    ref: { kcal: 22, protein: 0, carbs: 6.2, fat: 0 },
    items: [
      { name: 'honey', grams: 6.7, kcal: 20, protein: 0, carbs: 5.5, fat: 0, source: "USDA FNDDS 2710281 'Honey', 6.7 g: 1 tsp = 1/3 x '1 tablespoon' 20 g" },
      { name: 'black tea, brewed', grams: 237, kcal: 2, protein: 0, carbs: 0.7, fat: 0, source: "USDA SR Legacy 173227 'Beverages, tea, black, brewed, prepared with tap water', 237 g: no size: '1 cup (8 fl oz)' 237 g" },
    ],
  },
  {
    id: 'h1-units-16-fl-oz-2pct', category: 'units', tolerance: 'tight',
    input: '16 fl oz 2% milk',
    ref: { kcal: 244, protein: 16.1, carbs: 23.4, fat: 9.7 },
    items: [
      { name: '2% milk', grams: 488, kcal: 244, protein: 16.1, carbs: 23.4, fat: 9.7, source: "USDA SR Legacy 171267 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 488 g: 16 x '1 fl oz' 30.5 g" },
    ],
  },
  {
    id: 'h1-units-1-lb-strawberries', category: 'units', tolerance: 'tight',
    input: 'ate 1 lb of strawberries lol',
    ref: { kcal: 163, protein: 2.9, carbs: 36.1, fat: 1 },
    items: [
      { name: 'strawberries', grams: 453.6, kcal: 163, protein: 2.9, carbs: 36.1, fat: 1, source: "USDA FNDDS 2709283 'Strawberries, raw', 453.6 g: 1 lb = 453.6 g" },
    ],
  },
  {
    id: 'h1-units-three-quarter-cup-greek-honey', category: 'units', tolerance: 'normal',
    input: '3/4 cup greek yogurt + 1 tbsp honey',
    ref: { kcal: 184, protein: 18.8, carbs: 23.1, fat: 2.5 },
    items: [
      { name: 'greek yogurt, plain', grams: 183.8, kcal: 123, protein: 18.7, carbs: 6.6, fat: 2.5, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 183.8 g: 0.75 x '1 cup' 245 g" },
      { name: 'honey', grams: 20, kcal: 61, protein: 0.1, carbs: 16.5, fat: 0, source: "USDA FNDDS 2710281 'Honey', 20 g: '1 tablespoon' 20 g" },
    ],
  },
  {
    id: 'h1-units-1-5-oz-cheddar-10-grapes', category: 'units', tolerance: 'tight',
    input: '1.5 oz cheddar and 10 grapes',
    ref: { kcal: 208, protein: 10.3, carbs: 9.9, fat: 14.6 },
    items: [
      { name: 'cheddar', grams: 42.5, kcal: 174, protein: 9.9, carbs: 1, fat: 14.5, source: "USDA FNDDS 2705709 'Cheese, Cheddar', 42.5 g: 1.5 oz = 42.5 g" },
      { name: 'grapes', grams: 49, kcal: 34, protein: 0.4, carbs: 8.9, fat: 0.1, source: "USDA SR Legacy 174683 'Grapes, red or green (European type, such as Thompson seedless), raw', 49 g: '10 grapes' 49 g" },
    ],
  },
  {
    id: 'h1-units-two-thirds-cup-brown-rice', category: 'units', tolerance: 'normal',
    input: 'two thirds cup brown rice',
    ref: { kcal: 166, protein: 3.7, carbs: 34.4, fat: 1.3 },
    items: [
      { name: 'brown rice, cooked', grams: 134.7, kcal: 166, protein: 3.7, carbs: 34.4, fat: 1.3, source: "USDA SR Legacy 169704 'Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)', 134.7 g: 2/3 x '1 cup' 202 g, cooked by convention" },
    ],
  },
  {
    id: 'h1-units-12oz-oj', category: 'units', tolerance: 'normal',
    input: '12oz oj',
    ref: { kcal: 175, protein: 2.9, carbs: 37.9, fat: 1.3 },
    items: [
      { name: 'orange juice', grams: 372, kcal: 175, protein: 2.9, carbs: 37.9, fat: 1.3, source: "USDA FNDDS 2709186 'Orange juice, 100%, NFS', 372 g: 12 fl oz x '1 fl oz (NFS)' 31 g (drink oz = fluid oz)" },
    ],
    note: 'oj = orange juice',
  },
  {
    id: 'h1-units-quarter-cup-walnuts', category: 'units', tolerance: 'normal',
    input: 'a quarter cup of walnuts',
    ref: { kcal: 191, protein: 4.5, carbs: 4, fat: 19.1 },
    items: [
      { name: 'walnuts', grams: 29.2, kcal: 191, protein: 4.5, carbs: 4, fat: 19.1, source: "USDA SR Legacy 170187 'Nuts, walnuts, english', 29.2 g: 0.25 x '1 cup, chopped' 117 g" },
    ],
  },
  {
    id: 'h1-units-half-cup-egg-whites-1oz-feta', category: 'units', tolerance: 'normal',
    input: '1/2 cup liquid egg whites scrambled w 1 oz feta',
    ref: { kcal: 140, protein: 18.8, carbs: 2.5, fat: 5.6 },
    items: [
      { name: 'egg whites', grams: 121.5, kcal: 63, protein: 13.2, carbs: 0.9, fat: 0.2, source: "USDA SR Legacy 172183 'Egg, white, raw, fresh', 121.5 g: 0.5 x '1 cup' 243 g" },
      { name: 'feta', grams: 28.3, kcal: 77, protein: 5.6, carbs: 1.6, fat: 5.4, source: "USDA FNDDS 2705714 'Cheese, Feta', 28.3 g: 1 oz = 28.35 g" },
    ],
  },
  {
    id: 'h1-units-1-and-quarter-cups-1pct', category: 'units', tolerance: 'normal',
    input: '1 1/4 cups 1% milk',
    ref: { kcal: 128, protein: 10.3, carbs: 15.2, fat: 3 },
    items: [
      { name: '1% milk', grams: 305, kcal: 128, protein: 10.3, carbs: 15.2, fat: 3, source: "USDA SR Legacy 170872 'Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D', 305 g: 1.25 x '1 cup' 244 g" },
    ],
  },
  {
    id: 'h1-units-3oz-tuna-tbsp-mayo', category: 'units', tolerance: 'tight',
    input: '3oz tuna in water + 1 tbsp mayo',
    ref: { kcal: 167, protein: 16.6, carbs: 0.1, fat: 11.1 },
    items: [
      { name: 'tuna, canned in water, drained', grams: 85, kcal: 73, protein: 16.5, carbs: 0, fat: 0.8, source: "USDA SR Legacy 173709 'Fish, tuna, light, canned in water, drained solids (Includes foods for USDA's Food Distribution Program)', 85 g: '3 oz' 85 g" },
      { name: 'mayonnaise', grams: 13.8, kcal: 94, protein: 0.1, carbs: 0.1, fat: 10.3, source: "USDA SR Legacy 171009 'Salad dressing, mayonnaise, regular', 13.8 g: '1 tbsp' 13.8 g" },
    ],
  },
  // ---- intl_units ----
  {
    id: 'h1-intl-jacket-potato-knob-butter', category: 'intl_units', tolerance: 'loose',
    input: 'jacket potato with a knob of butter',
    ref: { kcal: 339, protein: 7.2, carbs: 59.9, fat: 8.6 },
    items: [
      { name: 'baked potato', grams: 285, kcal: 265, protein: 7.1, carbs: 59.9, fat: 0.4, source: "USDA FNDDS 2709524 'Potato, baked, peel eaten', 285 g: jacket potato = baked, skin eaten; no size: '1 medium' 285 g" },
      { name: 'butter', grams: 10, kcal: 74, protein: 0.1, carbs: 0, fat: 8.2, source: "USDA FNDDS 2710154 'Butter, NFS', 10 g: knob = 10 g (CONVENTION, UK)" },
    ],
  },
  {
    id: 'h1-intl-porridge-40g-200ml-semi-skimmed', category: 'intl_units', tolerance: 'normal',
    input: 'porridge with 40g oats and 200 ml semi-skimmed',
    ref: { kcal: 255, protein: 12.1, carbs: 37, fat: 6.7 },
    items: [
      { name: 'rolled oats, dry', grams: 40, kcal: 152, protein: 5.3, carbs: 27.1, fat: 2.6, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 40 g: stated 40 g dry" },
      { name: '2% milk', grams: 206.3, kcal: 103, protein: 6.8, carbs: 9.9, fat: 4.1, source: "USDA SR Legacy 171267 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 206.3 g: 200 ml x 244 g/236.6 ml; semi-skimmed (UK ~1.7% fat) = closest USDA 2%" },
    ],
  },
  {
    id: 'h1-intl-tin-of-tuna-wholemeal', category: 'intl_units', tolerance: 'normal',
    input: 'a tin of tuna in spring water on 2 slices of wholemeal',
    ref: { kcal: 281, protein: 30.8, carbs: 31.1, fat: 3.7 },
    items: [
      { name: 'tuna, canned, drained', grams: 115, kcal: 98, protein: 21.9, carbs: 0.1, fat: 1.1, source: "USDA FNDDS 2706311 'Fish, tuna, canned', 115 g: tin = '1 standard can' 115 g" },
      { name: 'whole wheat bread', grams: 72, kcal: 183, protein: 8.9, carbs: 31, fat: 2.6, source: "USDA FNDDS 2707709 'Bread, whole wheat', 72 g: wholemeal = whole wheat: 2 x '1 medium or regular slice' 36 g" },
    ],
  },
  {
    id: 'h1-intl-2dl-oats-3dl-milk', category: 'intl_units', tolerance: 'normal',
    input: '2 dl oats with 3 dl milk',
    ref: { kcal: 421, protein: 19.3, carbs: 61.3, fat: 11.1 },
    items: [
      { name: 'rolled oats, dry', grams: 68.5, kcal: 260, protein: 9, carbs: 46.4, fat: 4.5, source: "USDA SR Legacy 173904 'Cereals, oats, regular and quick, not fortified, dry', 68.5 g: 2 dl = 200 ml x '1 cup' 81 g/236.6 ml (dry)" },
      { name: 'milk', grams: 309.4, kcal: 161, protein: 10.3, carbs: 14.9, fat: 6.6, source: "USDA FNDDS 2705384 'Milk, NFS', 309.4 g: 3 dl = 300 ml x 244 g/236.6 ml; 'Milk, NFS'" },
    ],
  },
  {
    id: 'h1-intl-uk-pint-semi-skimmed', category: 'intl_units', tolerance: 'normal',
    input: 'drank a pint of semi skimmed (uk pint)',
    ref: { kcal: 293, protein: 19.3, carbs: 28.1, fat: 11.6 },
    items: [
      { name: '2% milk', grams: 586.1, kcal: 293, protein: 19.3, carbs: 28.1, fat: 11.6, source: "USDA SR Legacy 171267 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 586.1 g: UK pint = 568.26 ml x 244 g/236.6 ml; semi-skimmed = closest USDA 2%" },
    ],
  },
  {
    id: 'h1-intl-50cl-orange-juice', category: 'intl_units', tolerance: 'normal',
    input: '50 cl orange juice',
    ref: { kcal: 246, protein: 4, carbs: 53.5, fat: 1.8 },
    items: [
      { name: 'orange juice', grams: 524.1, kcal: 246, protein: 4, carbs: 53.5, fat: 1.8, source: "USDA FNDDS 2709186 'Orange juice, 100%, NFS', 524.1 g: 50 cl = 500 ml x '1 fl oz (NFS)' 31 g/29.57 ml" },
    ],
  },
  {
    id: 'h1-intl-125g-punnet-raspberries', category: 'intl_units', tolerance: 'tight',
    input: 'a 125g punnet of raspberries',
    ref: { kcal: 71, protein: 1.3, carbs: 16.1, fat: 0.2 },
    items: [
      { name: 'raspberries', grams: 125, kcal: 71, protein: 1.3, carbs: 16.1, fat: 0.2, source: "USDA FNDDS 2709281 'Raspberries, raw', 125 g: stated 125 g" },
    ],
  },
  {
    id: 'h1-intl-100g-5pct-mince', category: 'intl_units', tolerance: 'normal',
    input: '100 g 5% fat beef mince',
    ref: { kcal: 193, protein: 29.2, carbs: 0, fat: 7.6 },
    items: [
      { name: 'lean ground beef 95/5, cooked', grams: 100, kcal: 193, protein: 29.2, carbs: 0, fat: 7.6, source: "USDA SR Legacy 174028 'Beef, ground, 95% lean meat / 5% fat, crumbles, cooked, pan-browned', 100 g: stated 100 g, cooked by convention; 5% fat mince = 95% lean" },
    ],
  },
  {
    id: 'h1-intl-decimal-comma-half-litre', category: 'intl_units', tolerance: 'normal',
    input: '0,5 l semi skimmed milk',
    ref: { kcal: 258, protein: 17, carbs: 24.8, fat: 10.2 },
    items: [
      { name: '2% milk', grams: 515.7, kcal: 258, protein: 17, carbs: 24.8, fat: 10.2, source: "USDA SR Legacy 171267 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 515.7 g: 0,5 l = 500 ml (decimal comma) x 244 g/236.6 ml; semi-skimmed = closest USDA 2%" },
    ],
  },
  // ---- emoji ----
  {
    id: 'h1-emoji-fried-eggs-avo-toast', category: 'emoji', tolerance: 'loose',
    input: '🍳🍳 + 🥑 toast',
    ref: { kcal: 325, protein: 16, carbs: 17.1, fat: 21.9 },
    items: [
      { name: 'fried eggs', grams: 110, kcal: 204, protein: 12.8, carbs: 1, fat: 16.5, source: "USDA FNDDS 2707155 'Egg, whole, fried, NS as to fat', 110 g: 🍳🍳 = 2 x '1 egg' 55 g" },
      { name: 'avocado', grams: 30, kcal: 48, protein: 0.6, carbs: 2.6, fat: 4.4, source: "USDA FNDDS 2709223 'Avocado, raw', 30 g: no amount: 'Quantity not specified' 30 g" },
      { name: 'white toast', grams: 25, kcal: 73, protein: 2.6, carbs: 13.5, fat: 1, source: "USDA FNDDS 2707599 'Bread, white, toasted', 25 g: 1 x '1 medium or regular slice' 25 g (no count: 1 slice)" },
    ],
  },
  {
    id: 'h1-emoji-banana-black-coffee', category: 'emoji', tolerance: 'normal',
    input: '🍌 and ☕️ black',
    ref: { kcal: 126, protein: 1.3, carbs: 28.6, fat: 0.5 },
    items: [
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2709224 'Banana, raw', 126 g: 1 x '1 banana' 126 g" },
      { name: 'coffee, brewed', grams: 360, kcal: 4, protein: 0.4, carbs: 0, fat: 0.1, source: "USDA FNDDS 2710375 'Coffee, brewed', 360 g: no size: 'Quantity not specified' 360 g" },
    ],
  },
  {
    id: 'h1-emoji-2-eggs-bread', category: 'emoji', tolerance: 'normal',
    input: '2 🥚 + 🍞',
    ref: { kcal: 230, protein: 15.2, carbs: 14.9, fat: 11.6 },
    items: [
      { name: 'egg, hard-boiled', grams: 100, kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, source: "USDA SR Legacy 173424 'Egg, whole, cooked, hard-boiled', 100 g: 2 x '1 large' 50 g (no cooking method given: hard-boiled by convention)" },
      { name: 'white bread', grams: 28, kcal: 75, protein: 2.6, carbs: 13.8, fat: 1, source: "USDA FNDDS 2707598 'Bread, white', 28 g: 🍞 = 1 slice: '1 medium or regular slice' 28 g" },
    ],
  },
  {
    id: 'h1-emoji-chicken-rice-broccoli', category: 'emoji', tolerance: 'loose',
    input: '🍗🍚🥦',
    ref: { kcal: 400, protein: 40.9, carbs: 39.3, fat: 7.1 },
    items: [
      { name: 'grilled chicken breast', grams: 120, kcal: 211, protein: 35.5, carbs: 0, fat: 6.5, source: "USDA FNDDS 2705968 'Chicken breast, grilled without sauce, skin not eaten', 120 g: no amount: 'Quantity not specified' 120 g" },
      { name: 'white rice, cooked', grams: 122, kcal: 157, protein: 3.3, carbs: 34.2, fat: 0.3, source: "USDA FNDDS 2708403 'Rice, white, cooked, NS as to fat', 122 g: no amount: 'Quantity not specified' 122 g" },
      { name: 'broccoli, cooked', grams: 78, kcal: 32, protein: 2.1, carbs: 5.1, fat: 0.3, source: "USDA FNDDS 2709645 'Broccoli, fresh, cooked, no added fat', 78 g: no amount: 'Quantity not specified' 78 g" },
    ],
    note: '🍗 is used as generic chicken here (breast), not literally a drumstick',
  },
  {
    id: 'h1-emoji-two-milks', category: 'emoji', tolerance: 'normal',
    input: '🥛🥛',
    ref: { kcal: 254, protein: 16.3, carbs: 23.6, fat: 10.4 },
    items: [
      { name: 'milk', grams: 488, kcal: 254, protein: 16.3, carbs: 23.6, fat: 10.4, source: "USDA FNDDS 2705384 'Milk, NFS', 488 g: 2 glasses x 8 fl oz (CONVENTION) = 2 x '1 cup' 244 g; 'Milk, NFS'" },
    ],
  },
  {
    id: 'h1-emoji-apples-peanut-butter', category: 'emoji', tolerance: 'normal',
    input: '🍎🍎 w 2 tbsp 🥜 butter',
    ref: { kcal: 435, protein: 7.8, carbs: 66.3, fat: 17 },
    items: [
      { name: 'apple', grams: 400, kcal: 244, protein: 0.7, carbs: 59.2, fat: 0.6, source: "USDA FNDDS 2709215 'Apple, raw', 400 g: 2 x '1 medium' 200 g (no size given)" },
      { name: 'peanut butter', grams: 32, kcal: 191, protein: 7.1, carbs: 7.1, fat: 16.4, source: "USDA FNDDS 2707537 'Peanut butter', 32 g: 2 x '1 tablespoon' 16 g" },
    ],
  },
  {
    id: 'h1-emoji-post-leg-day-steak-potato', category: 'emoji', tolerance: 'loose',
    input: 'post leg day 🦵 8oz 🥩 + 🥔',
    ref: { kcal: 784, protein: 68.3, carbs: 59.9, fat: 29.7 },
    items: [
      { name: 'steak, cooked', grams: 226.8, kcal: 519, protein: 61.2, carbs: 0, fat: 29.3, source: "USDA FNDDS 2705824 'Beef, steak, NFS', 226.8 g: 8 oz = 226.8 g, cooked by convention" },
      { name: 'baked potato', grams: 285, kcal: 265, protein: 7.1, carbs: 59.9, fat: 0.4, source: "USDA FNDDS 2709524 'Potato, baked, peel eaten', 285 g: 🥔 = 1 potato, baked by convention: '1 medium' 285 g" },
    ],
    workout: ['leg day'],
  },
  {
    id: 'h1-emoji-workout-only', category: 'emoji', tolerance: 'tight',
    input: '💪 bench 3x5 225 🔥',
    ref: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    items: [],
    workout: ['bench press 3x5 @225'],
    note: 'workout only: nothing should be logged as food',
  },
  {
    id: 'h1-emoji-three-strawberries-greek', category: 'emoji', tolerance: 'normal',
    input: '🍓🍓🍓 + greek yogurt cup',
    ref: { kcal: 120, protein: 15.6, carbs: 9.7, fat: 2.1 },
    items: [
      { name: 'strawberries', grams: 54, kcal: 19, protein: 0.3, carbs: 4.3, fat: 0.1, source: "USDA FNDDS 2709283 'Strawberries, raw', 54 g: 3 x '1 fruit' 18 g" },
      { name: 'greek yogurt, plain', grams: 150, kcal: 101, protein: 15.3, carbs: 5.4, fat: 2, source: "USDA FNDDS 2705421 'Yogurt, Greek, NS as to type of milk, plain', 150 g: cup = container: '1 container, NFS' 150 g" },
    ],
  },
  // ---- cooked_raw ----
  {
    id: 'h1-raw-150g-raw-chicken-breast', category: 'cooked_raw', tolerance: 'tight',
    input: '150g raw chicken breast',
    ref: { kcal: 180, protein: 33.8, carbs: 0, fat: 3.9 },
    items: [
      { name: 'chicken breast, raw', grams: 150, kcal: 180, protein: 33.8, carbs: 0, fat: 3.9, source: "USDA SR Legacy 171077 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw', 150 g: stated 150 g raw" },
    ],
  },
  {
    id: 'h1-raw-80g-dry-pasta-tbsp-oil', category: 'cooked_raw', tolerance: 'tight',
    input: '80g dry pasta + 1 tbsp olive oil',
    ref: { kcal: 416, protein: 10.4, carbs: 59.7, fat: 14.7 },
    items: [
      { name: 'pasta, dry', grams: 80, kcal: 297, protein: 10.4, carbs: 59.7, fat: 1.2, source: "USDA SR Legacy 169736 'Pasta, dry, enriched', 80 g: stated 80 g dry" },
      { name: 'olive oil', grams: 13.5, kcal: 119, protein: 0, carbs: 0, fat: 13.5, source: "USDA SR Legacy 171413 'Oil, olive, salad or cooking', 13.5 g: '1 tablespoon' 13.5 g" },
    ],
  },
  {
    id: 'h1-raw-half-cup-dry-rice', category: 'cooked_raw', tolerance: 'normal',
    input: '1/2 cup dry rice (cooked it all and ate it)',
    ref: { kcal: 338, protein: 6.6, carbs: 74, fat: 0.6 },
    items: [
      { name: 'white rice, dry', grams: 92.5, kcal: 338, protein: 6.6, carbs: 74, fat: 0.6, source: "USDA SR Legacy 168877 'Rice, white, long-grain, regular, raw, enriched', 92.5 g: 0.5 x '1 cup' 185 g, dry" },
    ],
  },
  {
    id: 'h1-raw-100g-uncooked-quinoa', category: 'cooked_raw', tolerance: 'tight',
    input: '100g uncooked quinoa',
    ref: { kcal: 368, protein: 14.1, carbs: 64.2, fat: 6.1 },
    items: [
      { name: 'quinoa, uncooked', grams: 100, kcal: 368, protein: 14.1, carbs: 64.2, fat: 6.1, source: "USDA SR Legacy 168874 'Quinoa, uncooked', 100 g: stated 100 g uncooked" },
    ],
  },
  {
    id: 'h1-raw-salmon-180g-weighed-raw', category: 'cooked_raw', tolerance: 'normal',
    input: 'salmon 180g weighed raw',
    ref: { kcal: 374, protein: 36.8, carbs: 0, fat: 24.2 },
    items: [
      { name: 'salmon, raw', grams: 180, kcal: 374, protein: 36.8, carbs: 0, fat: 24.2, source: "USDA SR Legacy 175167 'Fish, salmon, Atlantic, farmed, raw', 180 g: stated 180 g raw" },
    ],
  },
  {
    id: 'h1-raw-60g-dry-red-lentils', category: 'cooked_raw', tolerance: 'tight',
    input: '60g dry red lentils',
    ref: { kcal: 215, protein: 14.3, carbs: 37.9, fat: 1.3 },
    items: [
      { name: 'red lentils, dry', grams: 60, kcal: 215, protein: 14.3, carbs: 37.9, fat: 1.3, source: "USDA SR Legacy 174284 'Lentils, pink or red, raw', 60 g: stated 60 g dry" },
    ],
  },
];
