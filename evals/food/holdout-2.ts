// Held-out food-log set, part 2 (branded, restaurant, drinks, alcohol). Never tune on it.
// Written without reading data/foods.ts, services/foods.ts, services/foodUnits.ts, server/src/food.ts or the other
// gold sets' cases. References, all fetched or computed 2026-10-08:
// - Branded packaged food: the brand's published US label (official page or label image). Where the brand site
//   blocked scripted access or showed no panel, a major US grocery listing that reproduces the label (Giant, Food
//   Lion, Hannaford, Stop & Shop, Vitacost); the source says so. Counts and fractions multiply the label serving
//   ("half a pint" of a 3-serving pint = 1.5 servings).
// - Restaurant: the chain's published US nutrition (official page, PDF, calculator data or its own nutrition API;
//   a Wayback copy of the official page when the live site blocks scripts; the Nutritionix brand portals for Pizza
//   Hut, KFC and Popeyes). Custom builds (Chipotle, Cava, Five Guys "no bun") sum the chain's per-ingredient values
//   at its standard portion. Starbucks values use the size's default milk (milk swaps are not published).
// - Generic drinks and alcohol: USDA FoodData Central, FNDDS 2021-2023 (2024-10-31 release) and SR Legacy
//   (2018-04), at the cited portion weight. Standard drinks follow NIAAA: 12 fl oz beer, 5 fl oz wine, 1.5 fl oz
//   spirits ("double" = 3 fl oz). FNDDS weighs 1 fl oz as 30 g for coffee, tea, wine and cocktails, 31 g for
//   juice, sweet tea and lemonade. A US pint = 16 fl oz. No size given: FNDDS "1 drink" or "Quantity not specified".
// - Alcohol kcal include ethanol (about 7 kcal/g), so they exceed 4/4/9 x macros; straight spirits are kcal with
//   0 g macros. Label values printed as "<1 g" count as 0.
// Rounding: item kcal to integers, macros to 0.1 g; ref = sum of the rounded items. Tolerance on kcal: tight =
// exact label item and count (10% or 25 kcal), normal = standard sizes (20% or 50 kcal), loose = vague amounts,
// custom restaurant builds (35% or 75 kcal).
import type { FoodCase } from './cases.ts';

export const cases: FoodCase[] = [
  {
    id: 'h2-br-quest-cookie-dough-x2', category: 'branded', tolerance: 'tight',
    input: '2 quest bars (choc chip cookie dough) between meetings',
    ref: { kcal: 380, protein: 42, carbs: 44, fat: 18 },
    items: [
      { name: 'Quest Protein Bar Chocolate Chip Cookie Dough x2', grams: 120, kcal: 380, protein: 42, carbs: 44, fat: 18, source: 'Quest label, 1 bar (60 g) = 190 kcal, 21 P, 22 C, 9 F, x2: https://www.questnutrition.com/products/chocolate-chip-cookie-dough-protein-bar' },
    ],
  },
  {
    id: 'h2-br-one-bar-bday-cake', category: 'branded', tolerance: 'tight',
    input: 'had a ONE bar, the birthday cake one',
    ref: { kcal: 220, protein: 20, carbs: 25, fat: 6 },
    items: [
      { name: 'ONE Protein Bar Birthday Cake', grams: 60, kcal: 220, protein: 20, carbs: 25, fat: 6, source: 'ONE label, 1 bar (2.12 oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://giantfoodstores.com/groceries/product/one-gluten-free-birthday-cake-20g-protein-bar-2-12-oz-bar/225404' },
    ],
    note: '"ONE bar" is the brand, not a count word',
  },
  {
    id: 'h2-br-barebells-salty-peanut', category: 'branded', tolerance: 'tight',
    input: 'chest and tris today, after: barebells salty peanut',
    ref: { kcal: 200, protein: 20, carbs: 18, fat: 8 },
    items: [
      { name: 'Barebells Protein Bar Salty Peanut', grams: 55, kcal: 200, protein: 20, carbs: 18, fat: 8, source: 'Barebells US nutrition values, 1 bar (55 g): https://shop.barebells.com/pages/nutrition-values' },
    ],
    workout: ['chest', 'triceps'],
    note: 'not the Salted Peanut Caramel bar (210 kcal)',
  },
  {
    id: 'h2-br-rxbar-choc-sea-salt', category: 'branded', tolerance: 'tight',
    input: 'rxbar choc sea salt on the train',
    ref: { kcal: 200, protein: 12, carbs: 23, fat: 8 },
    items: [
      { name: 'RXBAR Chocolate Sea Salt', grams: 52, kcal: 200, protein: 12, carbs: 23, fat: 8, source: 'RXBAR label, 1 bar (52 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://giantfoodstores.com/groceries/product/rxbar-chocolate-sea-salt-12g-protein-bar-1-8-oz-bar/221761' },
    ],
  },
  {
    id: 'h2-br-built-puff-coconut', category: 'branded', tolerance: 'tight',
    input: 'built puff coconut 🥥',
    ref: { kcal: 140, protein: 17, carbs: 13, fat: 3 },
    items: [
      { name: 'Built Puff Coconut', grams: 40, kcal: 140, protein: 17, carbs: 13, fat: 3, source: 'Built label, 1 bar (1.41 oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://giantfoodstores.com/groceries/product/built-puff-coconut-17g-protein-bar-1-41-oz-bar/353086' },
    ],
  },
  {
    id: 'h2-br-premier-choc-shake', category: 'branded', tolerance: 'tight',
    input: 'premier protien shake choc',
    ref: { kcal: 160, protein: 30, carbs: 4, fat: 3 },
    items: [
      { name: 'Premier Protein Chocolate shake, 11 fl oz', kcal: 160, protein: 30, carbs: 4, fat: 3, source: 'Premier Protein label, 1 bottle (11 fl oz): https://www.premierprotein.com/products/chocolate-protein-shake' },
    ],
  },
  {
    id: 'h2-br-core-power-42-choc', category: 'branded', tolerance: 'tight',
    input: 'core power elite chocolate (the 42g one) post lift',
    ref: { kcal: 230, protein: 42, carbs: 9, fat: 3.5 },
    items: [
      { name: 'Fairlife Core Power Chocolate 42g, 14 fl oz', kcal: 230, protein: 42, carbs: 9, fat: 3.5, source: 'fairlife label, 1 bottle (14 fl oz): https://fairlife.com/core-power/chocolate-protein-shake-42g/' },
    ],
    note: '"Elite" is the old name of the 42g shake',
  },
  {
    id: 'h2-br-muscle-milk-choc', category: 'branded', tolerance: 'tight',
    input: 'um so a muscle milk, chocolate, the carton one',
    ref: { kcal: 160, protein: 25, carbs: 9, fat: 4.5 },
    items: [
      { name: 'Muscle Milk Genuine Chocolate, 11 fl oz', kcal: 160, protein: 25, carbs: 9, fat: 4.5, source: 'Muscle Milk label, 1 carton (11 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://www.vitacost.com/products/muscle-milk-genuine-protein-shake-chocolate-4-cartons-11-fl-oz-330-ml-each-157808' },
    ],
  },
  {
    id: 'h2-br-chobani-vanilla-banana', category: 'branded', tolerance: 'normal',
    input: 'chobani vanila greek yogurt and a banana',
    ref: { kcal: 232, protein: 12.9, carbs: 43.6, fat: 0.4 },
    items: [
      { name: 'Chobani Non-Fat Vanilla Greek Yogurt, 5.3 oz', grams: 150, kcal: 110, protein: 12, carbs: 15, fat: 0, source: 'Chobani label, 1 cup (150 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://giantfoodstores.com/groceries/product/chobani-non-fat-vanilla-greek-yogurt-cup-5-3-oz-cup/153579' },
      { name: 'banana', grams: 126, kcal: 122, protein: 0.9, carbs: 28.6, fat: 0.4, source: "USDA FNDDS 2021-2023 'Banana, raw' (FDC 2709224): '1 banana' 126 g" },
    ],
  },
  {
    id: 'h2-br-oikos-pro-x2', category: 'branded', tolerance: 'tight',
    input: '2 oikos pro vanilla cups',
    ref: { kcal: 260, protein: 40, carbs: 12, fat: 6 },
    items: [
      { name: 'Oikos Pro Vanilla yogurt cup x2', grams: 300, kcal: 260, protein: 40, carbs: 12, fat: 6, source: 'Oikos Pro label, 1 cup (5.3 oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://foodlion.com/groceries/product/oikos-pro-vanilla-20g-protein-cultured-milk-yogurt-cup-4-ct-21-2-oz-pkg/348584' },
    ],
  },
  {
    id: 'h2-br-siggis-vanilla-honey', category: 'branded', tolerance: 'normal',
    input: 'siggis vanilla w a tbsp of honey on top',
    ref: { kcal: 174, protein: 16.1, carbs: 28.3, fat: 0 },
    items: [
      { name: "Siggi's Vanilla 0% skyr, 5.3 oz", grams: 150, kcal: 110, protein: 16, carbs: 11, fat: 0, source: "Siggi's label, 1 cup (150 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://hannaford.com/groceries/product/siggis-non-fat-vanilla-skyr-yogurt-cup-5-3-oz-cup/158371" },
      { name: 'honey, 1 tbsp', grams: 21, kcal: 64, protein: 0.1, carbs: 17.3, fat: 0, source: "USDA SR Legacy 'Honey' (FDC 169640): '1 tbsp' 21 g" },
    ],
  },
  {
    id: 'h2-br-fage-0-small-cup', category: 'branded', tolerance: 'tight',
    input: 'fage total 0% plain, the small cup',
    ref: { kcal: 80, protein: 16, carbs: 5, fat: 0 },
    items: [
      { name: 'FAGE Total 0% plain, single cup', grams: 150, kcal: 80, protein: 16, carbs: 5, fat: 0, source: 'FAGE label, 1 container (150 g): https://usa.fage/products/yogurt/fage-total-0' },
    ],
  },
  {
    id: 'h2-br-cheerios-almond-milk', category: 'branded', tolerance: 'normal',
    input: '1.5 cups cheerios w a cup of silk unsweetened almond milk',
    ref: { kcal: 170, protein: 6, carbs: 30, fat: 5.5 },
    items: [
      { name: 'Cheerios, 1 1/2 cup', kcal: 140, protein: 5, carbs: 29, fat: 2.5, source: 'Cheerios label, 1 1/2 cup: https://www.cheerios.com/products/original-cheerios' },
      { name: 'Silk Unsweet Almondmilk, 1 cup', kcal: 30, protein: 1, carbs: 1, fat: 3, source: 'Silk label, 1 cup (240 ml): https://silk.com/plant-based-products/almondmilk/unsweet-almondmilk/' },
    ],
  },
  {
    id: 'h2-br-frosted-flakes-skim', category: 'branded', tolerance: 'normal',
    input: '2 cups frosted flakes + 1 cup skim milk',
    ref: { kcal: 343, protein: 12.4, carbs: 78, fat: 0.2 },
    items: [
      { name: 'Frosted Flakes, 2 cups', grams: 74, kcal: 260, protein: 4, carbs: 66, fat: 0, source: "Kellogg's label, 1 cup (37 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://www.priceritemarketplace.com/product/frosted-flakes-corn-cereal-00038000248504" },
      { name: 'skim milk, 1 cup', grams: 244, kcal: 83, protein: 8.4, carbs: 12, fat: 0.2, source: "USDA FNDDS 2021-2023 'Milk, fat free (skim)' (FDC 2705388): '1 cup' 244 g" },
    ],
  },
  {
    id: 'h2-br-doritos-small-bag', category: 'branded', tolerance: 'normal',
    input: 'a family size bag of doritos... jk a small bag, nacho cheese',
    ref: { kcal: 140, protein: 2, carbs: 16, fat: 8 },
    items: [
      { name: 'Doritos Nacho Cheese, 1 oz bag', grams: 28, kcal: 140, protein: 2, carbs: 16, fat: 8, source: 'Doritos label, 1 bag (1 oz, 28 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://foodlion.com/groceries/snacks/chips/corn-tortilla-chips/doritos-nacho-cheese-tortilla-chips-1-oz-bag.html' },
    ],
    note: 'the joke "family size" must not be logged; some 1 oz listings say 150 kcal / 18 g carbs',
  },
  {
    id: 'h2-br-cheez-it-54', category: 'branded', tolerance: 'tight',
    input: 'cheez its, counted 54 so 2 servings',
    ref: { kcal: 300, protein: 6, carbs: 36, fat: 16 },
    items: [
      { name: 'Cheez-It Original, 54 crackers', grams: 60, kcal: 300, protein: 6, carbs: 36, fat: 16, source: 'Cheez-It label, 27 crackers (30 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://giantfood.com/groceries/product/cheez-it-original-baked-cheese-crackers-family-size-21-oz-box/174085' },
    ],
  },
  {
    id: 'h2-br-goldfish-pouch', category: 'branded', tolerance: 'normal',
    input: "goldfish pouch from my kid's snack drawer",
    ref: { kcal: 130, protein: 3, carbs: 19, fat: 4.5 },
    items: [
      { name: 'Goldfish Cheddar, 1 oz snack pack', grams: 28, kcal: 130, protein: 3, carbs: 19, fat: 4.5, source: 'Pepperidge Farm label, 1 pack (1 oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://www.foodlion.com/groceries/product/pepperidge-farm-goldfish-cheddar-cheese-baked-crackers-packs-20-ct-20-oz-box/226412' },
    ],
  },
  {
    id: 'h2-br-pringles-half-can', category: 'branded', tolerance: 'loose',
    input: 'ate like half a can of original pringles 😬',
    ref: { kcal: 375, protein: 2.5, carbs: 42.5, fat: 22.5 },
    items: [
      { name: 'Pringles Original, half a 5.2 oz can', grams: 70, kcal: 375, protein: 2.5, carbs: 42.5, fat: 22.5, source: 'Pringles label, 1 oz (28 g), 5 servings per 5.2 oz can, half = 2.5 servings, via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://giantfoodstores.com/groceries/product/pringles-original-potato-crisps-chips-5-2-oz-can/3643' },
    ],
  },
  {
    id: 'h2-br-oreos-4-milk', category: 'branded', tolerance: 'normal',
    input: '4 oreos and a glass of 2% milk',
    ref: { kcal: 335, protein: 9.5, carbs: 45.3, fat: 13.9 },
    items: [
      { name: 'Oreo, 4 cookies', grams: 45.3, kcal: 213, protein: 1.3, carbs: 33.3, fat: 9.3, source: 'Oreo label, 3 cookies (34 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x4/3: https://www.hannaford.com/groceries/product/oreo-chocolate-sandwich-cookies-13-2-oz-pkg/6207' },
      { name: '2% milk, 1 cup', grams: 244, kcal: 122, protein: 8.2, carbs: 12, fat: 4.6, source: "USDA FNDDS 2021-2023 'Milk, reduced fat (2%)' (FDC 2705386): glass = '1 cup' 244 g" },
    ],
  },
  {
    id: 'h2-br-kind-dark-choc-sea-salt', category: 'branded', tolerance: 'tight',
    input: 'kind bar dark choc nuts n sea salt',
    ref: { kcal: 190, protein: 6, carbs: 16, fat: 15 },
    items: [
      { name: 'KIND Dark Chocolate Nuts & Sea Salt', grams: 40, kcal: 190, protein: 6, carbs: 16, fat: 15, source: 'KIND label, 1 bar (40 g): https://www.kindsnacks.com/products/nut-bar/dark-chocolate-nuts-sea-salt' },
    ],
  },
  {
    id: 'h2-br-lean-cuisine-white-cheddar-mac', category: 'branded', tolerance: 'tight',
    input: 'lean cuisine vermont white cheddar mac n cheese for lunch',
    ref: { kcal: 270, protein: 17, carbs: 35, fat: 7 },
    items: [
      { name: 'Lean Cuisine Vermont White Cheddar Mac & Cheese', grams: 226, kcal: 270, protein: 17, carbs: 35, fat: 7, source: 'Lean Cuisine label, 1 package (8 oz, 226 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://www.hannaford.com/groceries/product/lean-cuisine-signature-vermont-white-cheddar-mac-cheese-frozen-meal-8-oz-box/214431' },
    ],
    note: 'brand site snippet says 18 g protein',
  },
  {
    id: 'h2-br-amys-bean-cheese-burrito', category: 'branded', tolerance: 'tight',
    input: 'amys bean & cheese burrito, microwaved',
    ref: { kcal: 340, protein: 12, carbs: 50, fat: 11 },
    items: [
      { name: "Amy's Bean & Cheese Burrito", grams: 170, kcal: 340, protein: 12, carbs: 50, fat: 11, source: "Amy's label, 1 burrito (170 g): https://www.amys.com/our-foods/cheddar-cheese-bean-rice-burrito" },
    ],
  },
  {
    id: 'h2-br-daves-21-grain-toast-butter', category: 'branded', tolerance: 'normal',
    input: 'so for breakfast i had uh two slices of daves killer bread the 21 grain one toasted with like a tablespoon of butter',
    ref: { kcal: 322, protein: 12.1, carbs: 44, fat: 14.5 },
    items: [
      { name: "Dave's Killer Bread 21 Whole Grains and Seeds, 2 slices", grams: 90, kcal: 220, protein: 12, carbs: 44, fat: 3, source: "Dave's Killer Bread label, 1 slice (regular, 27 oz loaf) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://giantfoodstores.com/groceries/product/daves-killer-bread-organic-21-whole-grains-seeds-bread-sliced-27-oz-pkg/220302" },
      { name: 'butter, 1 tbsp', grams: 14.2, kcal: 102, protein: 0.1, carbs: 0, fat: 11.5, source: "USDA SR Legacy 'Butter, salted' (FDC 173410): '1 tbsp' 14.2 g" },
    ],
    note: 'thin-sliced 21 grain is 60-70 kcal a slice; regular assumed',
  },
  {
    id: 'h2-br-celsius-orange', category: 'branded', tolerance: 'tight',
    input: 'celsius sparkling orange',
    ref: { kcal: 10, protein: 0, carbs: 0, fat: 0 },
    items: [
      { name: 'Celsius Sparkling Orange, 12 oz', kcal: 10, protein: 0, carbs: 0, fat: 0, source: 'Celsius label, 1 can (12 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://stopandshop.com/groceries/beverages/energy-drinks/celsius-live-fit-sparkling-orange-energy-drink-12-oz-can.html' },
    ],
  },
  {
    id: 'h2-br-monster-og', category: 'branded', tolerance: 'tight',
    input: 'monster energy, the og green can',
    ref: { kcal: 230, protein: 0, carbs: 58, fat: 0 },
    items: [
      { name: 'Monster Energy original, 16 oz', kcal: 230, protein: 0, carbs: 58, fat: 0, source: 'Monster label, 1 can (16 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://stopandshop.com/groceries/beverages/energy-drinks/monster-energy-drink-16-oz-can.html' },
    ],
    note: 'older labels said 210 kcal',
  },
  {
    id: 'h2-br-red-bull-x2', category: 'branded', tolerance: 'tight',
    input: '2 red bulls (regular not sugar free)',
    ref: { kcal: 220, protein: 0, carbs: 58, fat: 0 },
    items: [
      { name: 'Red Bull 8.4 oz x2', kcal: 220, protein: 0, carbs: 58, fat: 0, source: 'Red Bull label, 1 can (8.4 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://giantfoodstores.com/groceries/product/red-bull-energy-drink-8-4-oz-can/99550' },
    ],
  },
  {
    id: 'h2-br-coke-20oz', category: 'branded', tolerance: 'tight',
    input: '20oz coke from the vending machine',
    ref: { kcal: 240, protein: 0, carbs: 65, fat: 0 },
    items: [
      { name: 'Coca-Cola, 20 oz bottle', kcal: 240, protein: 0, carbs: 65, fat: 0, source: 'Coca-Cola label, 1 bottle (20 fl oz): https://coca-cola.com/us/en/brands/coca-cola/products/original' },
    ],
  },
  {
    id: 'h2-br-dr-pepper-2-cans', category: 'branded', tolerance: 'tight',
    input: '2 cans of dr pepper',
    ref: { kcal: 300, protein: 0, carbs: 80, fat: 0 },
    items: [
      { name: 'Dr Pepper 12 oz x2', kcal: 300, protein: 0, carbs: 80, fat: 0, source: 'Dr Pepper label, 1 can (12 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://www.hannaford.com/groceries/product/dr-pepper-soda-24-pk-12-oz-cans/16317' },
    ],
  },
  {
    id: 'h2-br-gatorade-20oz-run', category: 'branded', tolerance: 'tight',
    input: 'did a 6 mile run, drank a 20oz lemon lime gatorade',
    ref: { kcal: 140, protein: 0, carbs: 36, fat: 0 },
    items: [
      { name: 'Gatorade Thirst Quencher Lemon-Lime, 20 oz', kcal: 140, protein: 0, carbs: 36, fat: 0, source: 'Gatorade label, 1 bottle (20 fl oz) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://hannaford.com/groceries/product/gatorade-thirst-quencher-lemon-lime-sports-drink-20-oz-btl/251348' },
    ],
    workout: ['6 mile run'],
  },
  {
    id: 'h2-br-on-whey-2-scoops-water', category: 'branded', tolerance: 'tight',
    input: '2 scoops ON gold standard double rich chocolate in water',
    ref: { kcal: 240, protein: 48, carbs: 6, fat: 3 },
    items: [
      { name: 'Optimum Nutrition Gold Standard Whey Double Rich Chocolate, 2 scoops', grams: 62, kcal: 240, protein: 48, carbs: 6, fat: 3, source: 'ON label image, 1 scoop (31 g), x2: https://www.optimumnutrition.com/cdn/shop/files/US_GSW_10SRV_DRC_NFP.png (product page https://www.optimumnutrition.com/en-us/products/gold-standard-100-whey-protein-powder)' },
    ],
    note: 'water adds nothing',
  },
  {
    id: 'h2-br-iso100-2pct-milk', category: 'branded', tolerance: 'normal',
    input: '1 scoop iso100 gourmet chocolate w 8oz 2% milk',
    ref: { kcal: 242, protein: 33.2, carbs: 14, fat: 5.6 },
    items: [
      { name: 'Dymatize ISO100 Gourmet Chocolate, 1 scoop', grams: 32, kcal: 120, protein: 25, carbs: 2, fat: 1, source: 'Dymatize label, 1 scoop (32 g): https://dymatize.com/best-tasting-chocolate' },
      { name: '2% milk, 1 cup', grams: 244, kcal: 122, protein: 8.2, carbs: 12, fat: 4.6, source: "USDA FNDDS 2021-2023 'Milk, reduced fat (2%)' (FDC 2705386): 8 fl oz = '1 cup' 244 g" },
    ],
  },
  {
    id: 'h2-br-halo-top-half-pint', category: 'branded', tolerance: 'normal',
    input: 'half a pint of halo top birthday cake',
    ref: { kcal: 150, protein: 7.5, carbs: 33, fat: 3 },
    items: [
      { name: 'Halo Top Birthday Cake, half pint', grams: 127.5, kcal: 150, protein: 7.5, carbs: 33, fat: 3, source: 'Halo Top label, 2/3 cup (85 g), 3 servings per pint, half pint = 1.5 servings: https://wellsfoodservice.com/products/halo-top/dairy/birthday-cake' },
    ],
  },
  {
    id: 'h2-br-lays-1oz', category: 'branded', tolerance: 'tight',
    input: 'lays classic 1oz bag',
    ref: { kcal: 160, protein: 2, carbs: 15, fat: 10 },
    items: [
      { name: "Lay's Classic, 1 oz bag", grams: 28, kcal: 160, protein: 2, carbs: 15, fat: 10, source: "Lay's label, 1 bag (28 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel): https://stopandshop.com/groceries/product/lays-classic-potato-chips-1-oz-bag/283024" },
    ],
  },
  {
    id: 'h2-br-clif-crunchy-pb', category: 'branded', tolerance: 'tight',
    input: 'clif bar crunchy pb on the hike',
    ref: { kcal: 260, protein: 11, carbs: 40, fat: 8 },
    items: [
      { name: 'Clif Bar Crunchy Peanut Butter', grams: 68, kcal: 260, protein: 11, carbs: 40, fat: 8, source: 'Clif label image, 1 bar (68 g): https://cdn.shopify.com/s/files/1/0341/0637/6325/files/10120022_R18_DTC_CLF_CRP_NF.png (product page https://www.clifbar.com/products/clif-bar-crunchy-peanut-butter)' },
    ],
  },
  {
    id: 'h2-br-fairlife-2pct-2-cups', category: 'branded', tolerance: 'tight',
    input: 'fairlife 2% milk, 2 cups',
    ref: { kcal: 240, protein: 26, carbs: 12, fat: 9 },
    items: [
      { name: 'fairlife 2% ultra-filtered milk, 2 cups', kcal: 240, protein: 26, carbs: 12, fat: 9, source: 'fairlife label, 1 cup via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel), x2: https://foodlion.com/groceries/product/fairlife-lactose-free-2-reduced-fat-ultra-filtered-milk-52-oz-btl/211041' },
    ],
  },
  {
    id: 'h2-br-quaker-maple-x2', category: 'branded', tolerance: 'normal',
    input: '2 packets quaker maple brown sugar oatmeal made w water',
    ref: { kcal: 320, protein: 8, carbs: 66, fat: 4 },
    items: [
      { name: 'Quaker Instant Oatmeal Maple & Brown Sugar, 2 packets', grams: 86, kcal: 320, protein: 8, carbs: 66, fat: 4, source: 'Quaker label, 1 packet (43 g) via grocery listing reproducing the US label (brand site blocked scripted access or showed no panel) (values from the listing in search results): https://foodlion.com/groceries/breakfast/oatmeal-hot-cereal/instant-oatmeal/quaker-maple-brown-sugar-instant-oatmeal-8-ct-121-oz-box.html' },
    ],
  },
  {
    id: 'h2-rest-mcd-big-mac-large-fries', category: 'restaurant', tolerance: 'normal',
    input: 'big mac n large fries',
    ref: { kcal: 1060, protein: 32, carbs: 110, fat: 57 },
    items: [
      { name: 'Big Mac', kcal: 580, protein: 25, carbs: 45, fat: 34, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/big-mac.html" },
      { name: 'Large French Fries', kcal: 480, protein: 7, carbs: 65, fat: 23, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/large-french-fries.html" },
    ],
  },
  {
    id: 'h2-rest-mcd-2-mcdoubles', category: 'restaurant', tolerance: 'normal',
    input: '2 mcdoubles no pickles',
    ref: { kcal: 780, protein: 44, carbs: 64, fat: 40 },
    items: [
      { name: 'McDouble x2', kcal: 780, protein: 44, carbs: 64, fat: 40, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/mcdouble.html (x2; pickles are negligible)" },
    ],
  },
  {
    id: 'h2-rest-mcd-10-nuggets-bbq', category: 'restaurant', tolerance: 'tight',
    input: '10 pc nuggets w a bbq sauce',
    ref: { kcal: 455, protein: 23, carbs: 37, fat: 24 },
    items: [
      { name: 'Chicken McNuggets, 10 pc', kcal: 410, protein: 23, carbs: 26, fat: 24, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-10-piece.html" },
      { name: 'Tangy Barbeque Sauce, 1 packet', kcal: 45, protein: 0, carbs: 11, fat: 0, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/tangy-barbeque-sauce.html" },
    ],
  },
  {
    id: 'h2-rest-mcd-egg-mcmuffin-hashbrown', category: 'restaurant', tolerance: 'tight',
    input: 'egg mcmuffin + hash brown from mcds on the way in',
    ref: { kcal: 450, protein: 19, carbs: 48, fat: 21 },
    items: [
      { name: 'Egg McMuffin', kcal: 310, protein: 17, carbs: 30, fat: 13, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/egg-mcmuffin.html" },
      { name: 'Hash Browns', kcal: 140, protein: 2, carbs: 18, fat: 8, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/hash-browns.html" },
    ],
  },
  {
    id: 'h2-rest-mcd-qpc-medium-fry', category: 'restaurant', tolerance: 'normal',
    input: 'qpc and a medium fry',
    ref: { kcal: 840, protein: 35, carbs: 85, fat: 41 },
    items: [
      { name: 'Quarter Pounder with Cheese', kcal: 520, protein: 30, carbs: 42, fat: 26, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/quarter-pounder-with-cheese.html" },
      { name: 'Medium French Fries', kcal: 320, protein: 5, carbs: 43, fat: 15, source: "McDonald's US official product page (read through the r.jina.ai reader; mcdonalds.com blocks scripts): https://www.mcdonalds.com/us/en-us/product/medium-french-fries.html" },
    ],
    note: 'qpc = Quarter Pounder with Cheese',
  },
  {
    id: 'h2-rest-chipotle-chicken-bowl', category: 'restaurant', tolerance: 'normal',
    input: 'got chipotle, chicken bowl w white rice black beans fajita veg mild salsa cheese and guac',
    ref: { kcal: 905, protein: 53, carbs: 80, fat: 42.5 },
    items: [
      { name: 'Chipotle chicken', kcal: 180, protein: 32, carbs: 0, fat: 7, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle white rice', kcal: 210, protein: 4, carbs: 40, fat: 4, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle black beans', kcal: 130, protein: 8, carbs: 22, fat: 1.5, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle fajita veggies', kcal: 20, protein: 1, carbs: 5, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 2.5 oz portion' },
      { name: 'Chipotle fresh tomato salsa (mild)', kcal: 25, protein: 0, carbs: 4, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 3.5 oz portion' },
      { name: 'Chipotle cheese', kcal: 110, protein: 6, carbs: 1, fat: 8, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 1 oz portion' },
      { name: 'Chipotle guacamole', kcal: 230, protein: 2, carbs: 8, fat: 22, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
    ],
  },
  {
    id: 'h2-rest-chipotle-steak-burrito', category: 'restaurant', tolerance: 'normal',
    input: 'chipotle steak burrito, brown rice, pinto, corn salsa, sour cream, lettuce',
    ref: { kcal: 1005, protein: 46, carbs: 127, fat: 33 },
    items: [
      { name: 'Chipotle flour tortilla (burrito)', kcal: 320, protein: 8, carbs: 50, fat: 9, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 1 tortilla portion' },
      { name: 'Chipotle steak', kcal: 150, protein: 21, carbs: 1, fat: 6, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle brown rice', kcal: 210, protein: 4, carbs: 36, fat: 6, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle pinto beans', kcal: 130, protein: 8, carbs: 21, fat: 1.5, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion' },
      { name: 'Chipotle roasted chili-corn salsa', kcal: 80, protein: 3, carbs: 16, fat: 1.5, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 3.5 oz portion' },
      { name: 'Chipotle sour cream', kcal: 110, protein: 2, carbs: 2, fat: 9, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 2 oz portion' },
      { name: 'Chipotle romaine lettuce', kcal: 5, protein: 0, carbs: 1, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 1 oz portion' },
    ],
  },
  {
    id: 'h2-rest-chipotle-chips-guac', category: 'restaurant', tolerance: 'normal',
    input: 'chips and guac from chipotle (ate all of it)',
    ref: { kcal: 770, protein: 9, carbs: 81, fat: 47 },
    items: [
      { name: 'Chipotle chips & guacamole', kcal: 770, protein: 9, carbs: 81, fat: 47, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 8 oz (side) portion' },
    ],
  },
  {
    id: 'h2-rest-chipotle-salad-double-chicken', category: 'restaurant', tolerance: 'normal',
    input: 'chipotle salad, lettuce, double chicken, fajita veggies, red salsa, cheese. no rice no beans',
    ref: { kcal: 525, protein: 71, carbs: 11, fat: 22 },
    items: [
      { name: 'Chipotle romaine lettuce', kcal: 5, protein: 0, carbs: 1, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 1 oz portion' },
      { name: 'Chipotle chicken x2', kcal: 360, protein: 64, carbs: 0, fat: 14, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 4 oz portion x2' },
      { name: 'Chipotle fajita veggies', kcal: 20, protein: 1, carbs: 5, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 2.5 oz portion' },
      { name: 'Chipotle tomatillo-red chili salsa', kcal: 30, protein: 0, carbs: 4, fat: 0, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 2 oz portion' },
      { name: 'Chipotle cheese', kcal: 110, protein: 6, carbs: 1, fat: 8, source: 'Chipotle nutrition calculator (data feed services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US), https://www.chipotle.com/nutrition-calculator; 1 oz portion' },
    ],
    note: 'double chicken = 2 x 4 oz; the salad base lettuce in the calculator is romaine',
  },
  {
    id: 'h2-rest-sbux-venti-latte', category: 'restaurant', tolerance: 'normal',
    input: 'venti latte, regular milk',
    ref: { kcal: 250, protein: 16, carbs: 24, fat: 9 },
    items: [
      { name: 'Caffe Latte, venti (2% milk)', kcal: 250, protein: 16, carbs: 24, fat: 9, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/407/hot (venti 20 fl oz, default 2% milk)' },
    ],
    note: 'Starbucks publishes only the default 2% build',
  },
  {
    id: 'h2-rest-sbux-grande-caramel-frap', category: 'restaurant', tolerance: 'normal',
    input: 'grande caramel frap w whip',
    ref: { kcal: 380, protein: 4, carbs: 55, fat: 16 },
    items: [
      { name: 'Caramel Frappuccino, grande (whole milk, whipped cream)', kcal: 380, protein: 4, carbs: 55, fat: 16, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/424/iced (grande 16 fl oz, default whole milk and whip)' },
    ],
  },
  {
    id: 'h2-rest-sbux-grande-psl', category: 'restaurant', tolerance: 'normal',
    input: 'grande psl 🎃',
    ref: { kcal: 390, protein: 14, carbs: 52, fat: 14 },
    items: [
      { name: 'Pumpkin Spice Latte, grande (2% milk, whipped cream)', kcal: 390, protein: 14, carbs: 52, fat: 14, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/418/hot (grande 16 fl oz, default 2% milk and whip)' },
    ],
    note: 'psl = Pumpkin Spice Latte',
  },
  {
    id: 'h2-rest-sbux-bsoe-egg-bites', category: 'restaurant', tolerance: 'normal',
    input: 'iced brown sugar oatmilk shaken espresso grande + bacon gruyere egg bites',
    ref: { kcal: 450, protein: 21, carbs: 36, fat: 24.5 },
    items: [
      { name: 'Iced Brown Sugar Oatmilk Shaken Espresso, grande', kcal: 150, protein: 2, carbs: 27, fat: 4.5, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/2123431/iced (grande 16 fl oz, oatmilk)' },
      { name: 'Bacon & Gruyere Egg Bites (2 bites)', grams: 130, kcal: 300, protein: 19, carbs: 9, fat: 20, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/2122116/single (1 serving, 2 bites, 130 g)' },
    ],
  },
  {
    id: 'h2-rest-sbux-venti-iced-caramel-mac-croissant', category: 'restaurant', tolerance: 'normal',
    input: 'venti iced caramel macchiato and a butter croissant',
    ref: { kcal: 600, protein: 18, carbs: 79, fat: 23 },
    items: [
      { name: 'Iced Caramel Macchiato, venti (2% milk)', kcal: 350, protein: 13, carbs: 53, fat: 9, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/413/iced (venti 24 fl oz, default 2% milk)' },
      { name: 'Butter Croissant', grams: 62, kcal: 250, protein: 5, carbs: 26, fat: 14, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/1033/single (1 croissant, 62 g)' },
    ],
  },
  {
    id: 'h2-rest-cfa-sandwich-fries-sauce', category: 'restaurant', tolerance: 'normal',
    input: 'chikfila sandwich, medium waffle fries, 1 cfa sauce',
    ref: { kcal: 980, protein: 34, carbs: 92, fat: 53 },
    items: [
      { name: 'Chick-fil-A Chicken Sandwich', grams: 183, kcal: 420, protein: 29, carbs: 41, fat: 16, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (183 g)' },
      { name: 'Waffle Potato Fries, medium', grams: 125, kcal: 420, protein: 5, carbs: 45, fat: 24, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (125 g)' },
      { name: 'Chick-fil-A Sauce, 1 packet', grams: 28, kcal: 140, protein: 0, carbs: 6, fat: 13, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (28 g)' },
    ],
  },
  {
    id: 'h2-rest-cfa-12ct-grilled', category: 'restaurant', tolerance: 'tight',
    input: '12ct grilled nuggets',
    ref: { kcal: 200, protein: 38, carbs: 2, fat: 4.5 },
    items: [
      { name: 'Grilled Nuggets, 12 ct', grams: 142, kcal: 200, protein: 38, carbs: 2, fat: 4.5, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (142 g)' },
    ],
  },
  {
    id: 'h2-rest-cfa-spicy-deluxe-8ct', category: 'restaurant', tolerance: 'normal',
    input: 'spicy deluxe and an 8 count nuggets (not sharing lol)',
    ref: { kcal: 790, protein: 61, carbs: 57, fat: 35 },
    items: [
      { name: 'Spicy Deluxe Sandwich', grams: 259, kcal: 540, protein: 34, carbs: 46, fat: 24, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (259 g)' },
      { name: 'Nuggets, 8 ct', grams: 113, kcal: 250, protein: 27, carbs: 11, fat: 11, source: 'Chick-fil-A official nutrition table: https://www.chick-fil-a.com/nutrition-allergens (113 g)' },
    ],
  },
  {
    id: 'h2-rest-subway-footlong-turkey', category: 'restaurant', tolerance: 'normal',
    input: 'subway footlong oven roasted turkey, regular build',
    ref: { kcal: 940, protein: 50, carbs: 84, fat: 44 },
    items: [
      { name: 'Oven-Roasted Turkey footlong (menu build)', grams: 458, kcal: 940, protein: 50, carbs: 84, fat: 44, source: 'Subway US Nutrition PDF (Oct 2026): https://media.subway.com/dam/urn:aaid:aem:f20a4541-8c88-496b-940d-4aa8318cae26/original/as/us-nutrition-en.pdf; 6" menu build (229 g), footlong = 2x per the PDF' },
    ],
    note: 'custom toppings would change it; reference is the standard menu build',
  },
  {
    id: 'h2-rest-wendys-daves-single-combo', category: 'restaurant', tolerance: 'normal',
    input: "dave's single, medium fries, medium chocolate frosty",
    ref: { kcal: 1300, protein: 48, carbs: 145, fat: 62 },
    items: [
      { name: "Dave's Single", kcal: 560, protein: 31, carbs: 37, fat: 34, source: "Wendy's official product page: https://order.wendys.com/us/en/national/menu/hamburgers/daves-single" },
      { name: 'Natural-Cut Fries, medium', kcal: 350, protein: 5, carbs: 47, fat: 16, source: "Wendy's official product page: https://order.wendys.com/us/en/national/menu/fries-sides/french-fries" },
      { name: 'Classic Chocolate Frosty, medium', kcal: 390, protein: 12, carbs: 61, fat: 12, source: "Wendy's official product page: https://order.wendys.com/us/en/national/menu/frosty/classic-chocolate-frosty" },
    ],
  },
  {
    id: 'h2-rest-wendys-baconator', category: 'restaurant', tolerance: 'tight',
    input: 'baconator from wendys',
    ref: { kcal: 890, protein: 59, carbs: 36, fat: 58 },
    items: [
      { name: 'Baconator', kcal: 890, protein: 59, carbs: 36, fat: 58, source: "Wendy's official product page: https://order.wendys.com/us/en/national/menu/hamburgers/baconator" },
    ],
  },
  {
    id: 'h2-rest-panera-broc-cheddar-bread-bowl', category: 'restaurant', tolerance: 'normal',
    input: 'panera broccoli cheddar in a bread bowl',
    ref: { kcal: 930, protein: 29, carbs: 152, fat: 23 },
    items: [
      { name: 'Broccoli Cheddar Soup in a Bread Bowl', kcal: 930, protein: 29, carbs: 152, fat: 23, source: 'Panera official product page (read through a reader proxy): https://www.panerabread.com/content/panerabread_com/en-us/menu/products/bread-bowl-broccoli-cheddar-soup.html' },
    ],
  },
  {
    id: 'h2-rest-panera-mac-bowl', category: 'restaurant', tolerance: 'normal',
    input: 'panera mac and cheese, the bowl size',
    ref: { kcal: 980, protein: 32, carbs: 68, fat: 64 },
    items: [
      { name: 'Mac & Cheese, bowl', kcal: 980, protein: 32, carbs: 68, fat: 64, source: 'Panera official product page (read through a reader proxy): https://www.panerabread.com/content/panerabread_com/en-us/menu/products/mac-and-cheese.html' },
    ],
  },
  {
    id: 'h2-rest-sweetgreen-harvest', category: 'restaurant', tolerance: 'normal',
    input: 'sweetgreen harvest bowl, nothing changed',
    ref: { kcal: 760, protein: 40, carbs: 60, fat: 42 },
    items: [
      { name: 'Harvest Bowl', grams: 425, kcal: 760, protein: 40, carbs: 60, fat: 42, source: 'Sweetgreen official nutrition table: https://www.sweetgreen.com/nutrition (425 g)' },
    ],
  },
  {
    id: 'h2-rest-sweetgreen-kale-caesar', category: 'restaurant', tolerance: 'normal',
    input: 'kale caesar from sweetgreen for lunch',
    ref: { kcal: 545, protein: 41, carbs: 18, fat: 35 },
    items: [
      { name: 'Kale Caesar', grams: 415, kcal: 545, protein: 41, carbs: 18, fat: 35, source: 'Sweetgreen official nutrition table: https://www.sweetgreen.com/nutrition (415 g)' },
    ],
  },
  {
    id: 'h2-rest-fiveguys-cheeseburger-no-bun', category: 'restaurant', tolerance: 'normal',
    input: 'five guys cheeseburger no bun, lettuce tomato grilled onions',
    ref: { kcal: 766, protein: 40, carbs: 5, fat: 46 },
    items: [
      { name: 'Five Guys hamburger patty x2', grams: 130, kcal: 604, protein: 32, carbs: 0, fat: 34, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf; 1 patty 65 g, a Cheeseburger has 2 patties' },
      { name: 'Five Guys cheese, 2 slices', grams: 38, kcal: 140, protein: 8, carbs: 0, fat: 12, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf; 1 slice 19 g (carbs listed <1 g, counted 0); Cheeseburger 980 = 840 + 2 slices' },
      { name: 'lettuce', grams: 30, kcal: 3, protein: 0, carbs: 1, fat: 0, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (30 g)' },
      { name: 'tomatoes', grams: 52, kcal: 8, protein: 0, carbs: 2, fat: 0, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (52 g; protein <1 g counted 0)' },
      { name: 'grilled onions', grams: 26, kcal: 11, protein: 0, carbs: 2, fat: 0, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (26 g)' },
    ],
    note: 'no bun: the bun (240 kcal) must be left out',
  },
  {
    id: 'h2-rest-fiveguys-little-cheeseburger-little-fries', category: 'restaurant', tolerance: 'normal',
    input: 'little cheeseburger w mayo and grilled onions + little fries',
    ref: { kcal: 1260, protein: 35, carbs: 109, fat: 65 },
    items: [
      { name: 'Five Guys bun', grams: 77, kcal: 240, protein: 7, carbs: 35, fat: 8, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (77 g)' },
      { name: 'Five Guys hamburger patty', grams: 65, kcal: 302, protein: 16, carbs: 0, fat: 17, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (65 g; Little = 1 patty)' },
      { name: 'Five Guys cheese, 1 slice', grams: 19, kcal: 70, protein: 4, carbs: 0, fat: 6, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (19 g; carbs <1 g counted 0)' },
      { name: 'mayonnaise', grams: 14, kcal: 111, protein: 0, carbs: 0, fat: 11, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (14 g)' },
      { name: 'grilled onions', grams: 26, kcal: 11, protein: 0, carbs: 2, fat: 0, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (26 g)' },
      { name: 'Little Five Guys Style fries', grams: 227, kcal: 526, protein: 8, carbs: 72, fat: 23, source: 'Five Guys US Nutrition & Allergen Guide PDF (Sept 2026): https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf (227 g)' },
    ],
  },
  {
    id: 'h2-rest-dominos-3-slices-pepperoni', category: 'restaurant', tolerance: 'normal',
    input: "3 slices large pepperoni domino's hand tossed",
    ref: { kcal: 885, protein: 33, carbs: 99, fat: 36 },
    items: [
      { name: 'Domino\'s 14" Hand Tossed pepperoni, 3 slices', kcal: 885, protein: 33, carbs: 99, fat: 36, source: 'Domino\'s Nutrition Guide PDF (Nov 2025), 14" Large Hand Tossed, per 1/8 pizza = crust 160/5/30/2 + garlic oil 15/0/0/1.5 + sauce 10/0/2/0 + regular cheese with other toppings 70/4/1/5 + pepperoni 40/2/0/3.5: https://cache.dominos.com/olo/6_168_0/assets/build/market/US/_en/pdf/DominosNutritionGuide.pdf (sum per slice 295/11/33/12), x3' },
    ],
  },
  {
    id: 'h2-rest-pizzahut-2-pan-pepperoni', category: 'restaurant', tolerance: 'normal',
    input: '2 slices of medium pan pepperoni from pizza hut',
    ref: { kcal: 540, protein: 18, carbs: 58, fat: 24 },
    items: [
      { name: 'Pizza Hut Medium Original Pan pepperoni, 2 slices', kcal: 540, protein: 18, carbs: 58, fat: 24, source: 'Pizza Hut nutrition portal on Nutritionix, linked as Full Menu Nutrition from https://www.pizzahut.com/c/content/nutrition (updated 10/05/2026): https://www.nutritionix.com/pizza-hut/menu/premium; per slice, x2' },
    ],
  },
  {
    id: 'h2-rest-panda-plate-half-half', category: 'restaurant', tolerance: 'loose',
    input: 'panda plate: orange chicken + beijing beef, half chow mein half fried rice',
    ref: { kcal: 1590, protein: 44, carbs: 196.5, fat: 72 },
    items: [
      { name: 'Orange Chicken', grams: 168, kcal: 510, protein: 16, carbs: 53, fat: 24, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; 1 serving 5.92 oz' },
      { name: 'Beijing Beef', grams: 159, kcal: 470, protein: 14, carbs: 46, fat: 27, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; 1 serving 5.6 oz' },
      { name: 'Chow Mein, half side', grams: 156, kcal: 300, protein: 7.5, carbs: 47, fat: 11.5, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; 1 side 11.0 oz, half' },
      { name: 'Fried Rice, half side', grams: 156, kcal: 310, protein: 6.5, carbs: 50.5, fat: 9.5, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; 1 side 11.0 oz, half' },
    ],
    note: 'plate = 1 side + 2 entrees; Panda does not publish plate portions, so each item is its listed serving',
  },
  {
    id: 'h2-rest-panda-bowl-teriyaki-greens', category: 'restaurant', tolerance: 'normal',
    input: 'panda bowl, grilled teriyaki chicken over super greens',
    ref: { kcal: 405, protein: 42, carbs: 28, fat: 14 },
    items: [
      { name: 'Grilled Teriyaki Chicken', grams: 170, kcal: 275, protein: 33, carbs: 14, fat: 10, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; 1 serving 6.0 oz' },
      { name: 'Super Greens (side)', grams: 283, kcal: 130, protein: 9, carbs: 14, fat: 4, source: 'Panda Express official nutrition page (Wayback snapshot 2026-09-30; live site blocks scripts): https://web.archive.org/web/20260930063436/https://www.pandaexpress.com/nutritioninformation; side 10.0 oz' },
    ],
  },
  {
    id: 'h2-rest-dunkin-2-donuts-iced-coffee', category: 'restaurant', tolerance: 'normal',
    input: 'glazed donut + boston kreme + medium iced coffee w cream and sugar',
    ref: { kcal: 700, protein: 11, carbs: 99, fat: 31 },
    items: [
      { name: 'Glazed Donut', kcal: 240, protein: 4, carbs: 33, fat: 11, source: "Dunkin' Nutrition Guide PDF (updated 09-21-2026), linked from dunkindonuts.com: https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf" },
      { name: 'Boston Kreme Donut', kcal: 270, protein: 5, carbs: 39, fat: 11, source: "Dunkin' Nutrition Guide PDF (updated 09-21-2026), linked from dunkindonuts.com: https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf" },
      { name: 'Iced Coffee with Cream and Sugar, medium', kcal: 190, protein: 2, carbs: 27, fat: 9, source: "Dunkin' Nutrition Guide PDF (updated 09-21-2026), linked from dunkindonuts.com: https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf" },
    ],
  },
  {
    id: 'h2-rest-dunkin-sec-oat-latte', category: 'restaurant', tolerance: 'normal',
    input: 'okay so dunkin this morning, sausage egg and cheese on english muffin and a medium iced oat milk latte',
    ref: { kcal: 690, protein: 23, carbs: 64, fat: 39 },
    items: [
      { name: 'Sausage, Egg and Cheese on English Muffin', kcal: 560, protein: 21, carbs: 40, fat: 35, source: "Dunkin' Nutrition Guide PDF (updated 09-21-2026), linked from dunkindonuts.com: https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf" },
      { name: 'Iced Latte with Oatmilk, medium', kcal: 130, protein: 2, carbs: 24, fat: 4, source: "Dunkin' Nutrition Guide PDF (updated 09-21-2026), linked from dunkindonuts.com: https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf" },
    ],
  },
  {
    id: 'h2-rest-shakeshack-shackburger-fries', category: 'restaurant', tolerance: 'normal',
    input: 'shackburger + fries at shake shack lol',
    ref: { kcal: 970, protein: 35, carbs: 89, fat: 52 },
    items: [
      { name: 'Single ShackBurger', kcal: 500, protein: 29, carbs: 26, fat: 30, source: 'Shake Shack Master Nutrition PDF 3.31.26 (Wayback snapshot 2026-06-17; live site blocks scripts): https://web.archive.org/web/20260617050214/https://shakeshack.com/nutritionandallergeninfo' },
      { name: 'Fries (regular)', kcal: 470, protein: 6, carbs: 63, fat: 22, source: 'Shake Shack Master Nutrition PDF 3.31.26 (Wayback snapshot 2026-06-17; live site blocks scripts): https://web.archive.org/web/20260617050214/https://shakeshack.com/nutritionandallergeninfo' },
    ],
  },
  {
    id: 'h2-rest-kfc-2pc-mashed-biscuit', category: 'restaurant', tolerance: 'normal',
    input: 'kfc 2 pc original recipe (breast + thigh) mashed potatos w gravy and a biscuit',
    ref: { kcal: 980, protein: 65, carbs: 61, fat: 52.5 },
    items: [
      { name: 'Original Recipe Chicken Breast', kcal: 390, protein: 39, carbs: 11, fat: 21, source: 'KFC Interactive Nutrition Menu on Nutritionix (updated 10/02/2026; kfc.com blocks scripts): https://www.nutritionix.com/kfc/menu/premium' },
      { name: 'Original Recipe Chicken Thigh', kcal: 280, protein: 19, carbs: 8, fat: 19, source: 'KFC Interactive Nutrition Menu on Nutritionix (updated 10/02/2026; kfc.com blocks scripts): https://www.nutritionix.com/kfc/menu/premium' },
      { name: 'Mashed Potatoes with Gravy (individual)', kcal: 130, protein: 3, carbs: 20, fat: 4.5, source: 'KFC Interactive Nutrition Menu on Nutritionix (updated 10/02/2026; kfc.com blocks scripts): https://www.nutritionix.com/kfc/menu/premium' },
      { name: 'Biscuit', kcal: 180, protein: 4, carbs: 22, fat: 8, source: 'KFC Interactive Nutrition Menu on Nutritionix (updated 10/02/2026; kfc.com blocks scripts): https://www.nutritionix.com/kfc/menu/premium' },
    ],
  },
  {
    id: 'h2-rest-popeyes-sandwich-cajun-fries', category: 'restaurant', tolerance: 'normal',
    input: 'popeyes chicken sandwich classic + regular cajun fries',
    ref: { kcal: 970, protein: 32, carbs: 83, fat: 56 },
    items: [
      { name: 'Classic Chicken Sandwich', kcal: 700, protein: 28, carbs: 50, fat: 42, source: 'Popeyes Interactive Nutrition Menu on Nutritionix (updated 09/29/2025; popeyes.com is script-only): https://www.nutritionix.com/popeyes/menu/premium' },
      { name: 'Cajun Fries, regular', kcal: 270, protein: 4, carbs: 33, fat: 14, source: 'Popeyes Interactive Nutrition Menu on Nutritionix (updated 09/29/2025; popeyes.com is script-only): https://www.nutritionix.com/popeyes/menu/premium' },
    ],
  },
  {
    id: 'h2-rest-popeyes-3pc-tenders-rbr', category: 'restaurant', tolerance: 'normal',
    input: 'popeyes 3pc tenders w red beans and rice',
    ref: { kcal: 700, protein: 46, carbs: 51, fat: 37 },
    items: [
      { name: 'Tenders, 3 pc', kcal: 450, protein: 38, carbs: 29, fat: 21, source: 'Popeyes Interactive Nutrition Menu on Nutritionix (updated 09/29/2025; popeyes.com is script-only): https://www.nutritionix.com/popeyes/menu/premium' },
      { name: 'Red Beans & Rice, regular', kcal: 250, protein: 8, carbs: 22, fat: 16, source: 'Popeyes Interactive Nutrition Menu on Nutritionix (updated 09/29/2025; popeyes.com is script-only): https://www.nutritionix.com/popeyes/menu/premium' },
    ],
  },
  {
    id: 'h2-rest-innout-dd-protein-style-fries', category: 'restaurant', tolerance: 'normal',
    input: 'in n out double double protein style and fries',
    ref: { kcal: 820, protein: 36, carbs: 61, fat: 47 },
    items: [
      { name: 'Double-Double Protein Style', grams: 289, kcal: 460, protein: 30, carbs: 12, fat: 32, source: 'In-N-Out nutrition PDF (Jan 2026), https://www.in-n-out.com/menu/nutrition-info: https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf (289 g)' },
      { name: 'French Fries', grams: 125, kcal: 360, protein: 6, carbs: 49, fat: 15, source: 'In-N-Out nutrition PDF (Jan 2026), https://www.in-n-out.com/menu/nutrition-info: https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf (125 g)' },
    ],
    note: 'protein style = lettuce wrap, no bun',
  },
  {
    id: 'h2-rest-innout-cheeseburger-shake', category: 'restaurant', tolerance: 'normal',
    input: 'in-n-out cheeseburger and a chocolate shake',
    ref: { kcal: 1040, protein: 36, carbs: 114, fat: 51 },
    items: [
      { name: 'Cheeseburger w/ Onion', grams: 229, kcal: 430, protein: 20, carbs: 40, fat: 21, source: 'In-N-Out nutrition PDF (Jan 2026), https://www.in-n-out.com/menu/nutrition-info: https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf (229 g)' },
      { name: 'Chocolate Shake (15 oz)', kcal: 610, protein: 16, carbs: 74, fat: 30, source: 'In-N-Out nutrition PDF (Jan 2026), https://www.in-n-out.com/menu/nutrition-info: https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf' },
    ],
  },
  {
    id: 'h2-rest-jerseymikes-13-regular', category: 'restaurant', tolerance: 'normal',
    input: 'jersey mikes #13 regular mikes way',
    ref: { kcal: 956, protein: 46.8, carbs: 71.1, fat: 54.5 },
    items: [
      { name: "#13 The Original Italian, regular, Mike's Way", kcal: 956, protein: 46.8, carbs: 71.1, fat: 54.5, source: "Jersey Mike's nutrition data behind https://www.jerseymikes.com/menu/nutrition: https://subs.jerseymikes.com/nutrition/8/2 (sum of the default ingredients: white bread, meats, provolone, Mike's Way = onions, lettuce, tomatoes, red wine vinegar, olive oil blend, oregano, salt)" },
    ],
    note: "Mike's Way oil blend alone is 250 kcal / 28 g fat",
  },
  {
    id: 'h2-rest-cava-custom-bowl', category: 'restaurant', tolerance: 'loose',
    input: 'cava bowl, half supergreens half saffron rice, harissa honey chicken, hummus, crazy feta, tzatziki, pickled onions, cucumbers',
    ref: { kcal: 608, protein: 38, carbs: 49, fat: 29.7 },
    items: [
      { name: 'Super Greens, half base', kcal: 18, protein: 1.5, carbs: 3, fat: 0.2, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf; standard portion, half' },
      { name: 'Saffron Basmati Rice, half base', kcal: 145, protein: 2.5, carbs: 27, fat: 3.5, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf; standard portion, half' },
      { name: 'Harissa Honey Chicken', kcal: 260, protein: 26, carbs: 7, fat: 14, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
      { name: 'Hummus', kcal: 50, protein: 2, carbs: 4, fat: 2.5, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
      { name: 'Crazy Feta', kcal: 70, protein: 4, carbs: 1, fat: 6, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
      { name: 'Tzatziki', kcal: 30, protein: 2, carbs: 1, fat: 2.5, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
      { name: 'Pickled Onions', kcal: 20, protein: 0, carbs: 5, fat: 0, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
      { name: 'Persian Cucumber', kcal: 15, protein: 0, carbs: 1, fat: 1, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
    ],
    note: 'half-and-half base read as half of each standard portion',
  },
  {
    id: 'h2-rest-cava-greek-salad', category: 'restaurant', tolerance: 'normal',
    input: 'cava greek salad bowl, as is',
    ref: { kcal: 580, protein: 37, carbs: 19, fat: 40 },
    items: [
      { name: 'Greek Salad bowl (curated)', kcal: 580, protein: 37, carbs: 19, fat: 40, source: 'Cava Nutrition and Allergen Guide PDF (Jun 2026), linked from cava.com/nutrition: https://assets.ctfassets.net/kugm9fp9ib18/Ki4gri5pvT2rtPcjBQPjR/5c435502ed8a9c07d54e8eb8af7ce1cf/KT5_26_AN_STND_RECAN11148_DIGITAL.pdf' },
    ],
  },
  {
    id: 'h2-drink-gts-trilogy', category: 'drinks', tolerance: 'tight',
    input: 'drank a whole gts trilogy kombucha',
    ref: { kcal: 50, protein: 0, carbs: 12, fat: 0 },
    items: [
      { name: "GT's Synergy Trilogy kombucha, 16 oz", kcal: 50, protein: 0, carbs: 12, fat: 0, source: "GT's package label on a grocery listing, 1 bottle 16 fl oz: https://stopandshop.com/groceries/product/gts-synergy-organic-trilogy-kombucha-drink-16-oz-btl/158295" },
    ],
  },
  {
    id: 'h2-drink-black-coffee-20oz', category: 'drinks', tolerance: 'normal',
    input: 'black coffee 20oz no cream no sugar',
    ref: { kcal: 6, protein: 0.7, carbs: 0, fat: 0.1 },
    items: [
      { name: 'black coffee, 20 fl oz', grams: 600, kcal: 6, protein: 0.7, carbs: 0, fat: 0.1, source: "USDA FNDDS 2021-2023 'Coffee, brewed' (FDC 2710375): 20 fl oz x 30 g (FNDDS 1 fl oz = 30 g)" },
    ],
    note: 'near-zero kcal; checks nothing gets added',
  },
  {
    id: 'h2-drink-coffee-oat-splash-2-sugars', category: 'drinks', tolerance: 'loose',
    input: 'coffee w a splash of oat milk and 2 sugars',
    ref: { kcal: 52, protein: 0.6, carbs: 10, fat: 0.8 },
    items: [
      { name: 'coffee', grams: 360, kcal: 4, protein: 0.4, carbs: 0, fat: 0.1, source: "USDA FNDDS 2021-2023 'Coffee, brewed' (FDC 2710375): 'Quantity not specified' 360 g (12 fl oz)" },
      { name: 'oat milk, splash', grams: 30, kcal: 14, protein: 0.2, carbs: 1.6, fat: 0.7, source: "USDA FNDDS 2021-2023 'Oat milk' (FDC 2705412): splash = FNDDS 'Guideline amount per fl oz of beverage' 2.5 g x 12 fl oz" },
      { name: 'sugar, 2 tsp', grams: 8.4, kcal: 34, protein: 0, carbs: 8.4, fat: 0, source: "USDA FNDDS 2021-2023 'Sugar, white, granulated or lump' (FDC 2710258): '1 teaspoon' 4.2 g x 2 (2 sugars read as 2 tsp)" },
    ],
  },
  {
    id: 'h2-drink-oj-16oz', category: 'drinks', tolerance: 'normal',
    input: '16oz OJ',
    ref: { kcal: 233, protein: 3.8, carbs: 50.6, fat: 1.7 },
    items: [
      { name: 'orange juice, 16 fl oz', grams: 496, kcal: 233, protein: 3.8, carbs: 50.6, fat: 1.7, source: "USDA FNDDS 2021-2023 'Orange juice, 100%, canned, bottled or in a carton' (FDC 2709188): '1 bottle (16 fl oz)' 496 g" },
    ],
  },
  {
    id: 'h2-drink-whole-milk-glass', category: 'drinks', tolerance: 'normal',
    input: 'a glass of whole milk before bed',
    ref: { kcal: 149, protein: 8, carbs: 11.3, fat: 7.8 },
    items: [
      { name: 'whole milk, 1 glass', grams: 244, kcal: 149, protein: 8, carbs: 11.3, fat: 7.8, source: "USDA FNDDS 2021-2023 'Milk, whole' (FDC 2705385): glass = '1 cup' 244 g" },
    ],
  },
  {
    id: 'h2-drink-green-tea-2-cups', category: 'drinks', tolerance: 'normal',
    input: '2 cups green tea, nothing in it',
    ref: { kcal: 5, protein: 1.1, carbs: 0, fat: 0 },
    items: [
      { name: 'green tea, 2 cups', grams: 480, kcal: 5, protein: 1.1, carbs: 0, fat: 0, source: "USDA FNDDS 2021-2023 'Tea, hot, leaf, green' (FDC 2710490): '1 cup' 240 g x 2" },
    ],
    note: 'near-zero kcal',
  },
  {
    id: 'h2-drink-hot-cocoa-mug', category: 'drinks', tolerance: 'loose',
    input: 'mug of hot chocolate made w milk',
    ref: { kcal: 226, protein: 6.8, carbs: 40.9, fat: 3.8 },
    items: [
      { name: 'hot chocolate with milk, 1 mug', grams: 248, kcal: 226, protein: 6.8, carbs: 40.9, fat: 3.8, source: "USDA FNDDS 2021-2023 'Hot chocolate / cocoa, made with whole or reduced fat (2%) milk' (FDC 2705473): mug = '1 cup' 248 g" },
    ],
  },
  {
    id: 'h2-drink-sweet-tea-32oz', category: 'drinks', tolerance: 'normal',
    input: '32oz sweet tea from the gas station',
    ref: { kcal: 317, protein: 0, carbs: 78.8, fat: 0.2 },
    items: [
      { name: 'sweet tea, 32 fl oz', grams: 992, kcal: 317, protein: 0, carbs: 78.8, fat: 0.2, source: "USDA FNDDS 2021-2023 'Tea, iced, brewed, black, pre-sweetened with sugar' (FDC 2710515): '1 fl oz (no ice)' 31 g x 32" },
    ],
  },
  {
    id: 'h2-drink-coconut-water-330ml', category: 'drinks', tolerance: 'normal',
    input: 'coconut water 330ml carton',
    ref: { kcal: 60, protein: 0.7, carbs: 14.2, fat: 0 },
    items: [
      { name: 'coconut water, 330 ml', grams: 334.8, kcal: 60, protein: 0.7, carbs: 14.2, fat: 0, source: "USDA FNDDS 2021-2023 'Coconut water, unsweetened' (FDC 2707572): 330 ml = 11.16 fl oz x '1 fl oz (no ice)' 30 g" },
    ],
  },
  {
    id: 'h2-drink-choc-milk-after-run', category: 'drinks', tolerance: 'normal',
    input: 'ran 4 miles this am then 12oz chocolate milk (2%)',
    ref: { kcal: 283, protein: 11.1, carbs: 45, fat: 7.1 },
    items: [
      { name: 'chocolate milk 2%, 12 fl oz', grams: 372, kcal: 283, protein: 11.1, carbs: 45, fat: 7.1, source: "USDA FNDDS 2021-2023 'Chocolate milk, reduced fat (2%)' (FDC 2705468): '1 fl oz' 31 g x 12" },
    ],
    workout: ['ran 4 miles'],
  },
  {
    id: 'h2-drink-lemonade-20oz', category: 'drinks', tolerance: 'normal',
    input: '20 oz lemonade',
    ref: { kcal: 285, protein: 0, carbs: 75, fat: 0 },
    items: [
      { name: 'lemonade, 20 fl oz', grams: 620, kcal: 285, protein: 0, carbs: 75, fat: 0, source: "USDA FNDDS 2021-2023 'Lemonade, fruit juice drink' (FDC 2710570): '1 fl oz (no ice)' 31 g x 20" },
    ],
  },
  {
    id: 'h2-drink-americano-half-and-half', category: 'drinks', tolerance: 'normal',
    input: 'americano with 2 tbsp half and half',
    ref: { kcal: 44, protein: 1, carbs: 2.3, fat: 3.6 },
    items: [
      { name: 'americano (2 espresso shots + water)', grams: 60, kcal: 5, protein: 0.1, carbs: 1, fat: 0.1, source: "USDA FNDDS 2021-2023 'Coffee, espresso' (FDC 2710378): '1 espresso cup (2 fl oz)' 60 g; added water 0 kcal" },
      { name: 'half and half, 2 tbsp', grams: 30, kcal: 39, protein: 0.9, carbs: 1.3, fat: 3.5, source: "USDA FNDDS 2021-2023 'Cream, half and half' (FDC 2705594): 2 tbsp = 1 fl oz = '1 fl oz' 30 g" },
    ],
  },
  {
    id: 'h2-drink-skim-milk-2-cups', category: 'drinks', tolerance: 'normal',
    input: 'had 2 cups skim milk',
    ref: { kcal: 166, protein: 16.7, carbs: 24, fat: 0.4 },
    items: [
      { name: 'skim milk, 2 cups', grams: 488, kcal: 166, protein: 16.7, carbs: 24, fat: 0.4, source: "USDA FNDDS 2021-2023 'Milk, fat free (skim)' (FDC 2705388): '1 cup' 244 g x 2" },
    ],
  },
  {
    id: 'h2-drink-sbux-chai-grande', category: 'drinks', tolerance: 'normal',
    input: 'grande chai latte ☕️',
    ref: { kcal: 200, protein: 7, carbs: 33, fat: 4.5 },
    items: [
      { name: 'Chai Latte, grande (2% milk)', kcal: 200, protein: 7, carbs: 33, fat: 4.5, source: 'Starbucks US official product page: https://www.starbucks.com/menu/product/466/hot (grande 16 fl oz, default 2% milk)' },
    ],
  },
  {
    id: 'h2-drink-jamba-mango-medium', category: 'drinks', tolerance: 'normal',
    input: 'jamba juice mango a go go, medium',
    ref: { kcal: 400, protein: 1, carbs: 100, fat: 0 },
    items: [
      { name: 'Jamba Mango-A-Go-Go, medium', kcal: 400, protein: 1, carbs: 100, fat: 0, source: 'Jamba official product page size data (medium): https://www.jamba.com/menu/smoothies/mango-a-go-go; fat not published, 0 g taken from kcal = 4 x (protein + carbs)' },
    ],
  },
  {
    id: 'h2-alc-bud-light-x3', category: 'alcohol', tolerance: 'tight',
    input: '3 bud lights 🍺',
    ref: { kcal: 315, protein: 3, carbs: 18, fat: 0 },
    items: [
      { name: 'Bud Light 12 oz x3', kcal: 315, protein: 3, carbs: 18, fat: 0, source: 'Bud Light package label on a grocery listing (brand site age-gated or blocks scripts), 12 fl oz, x3: https://stopandshop.com/groceries/product/bud-light-beer-12-pk-12-oz-cans/23965' },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; older brand figure is 110 kcal / 6.6 g carbs / 0.9 g protein a can',
  },
  {
    id: 'h2-alc-white-claw', category: 'alcohol', tolerance: 'tight',
    input: 'white claw black cherry',
    ref: { kcal: 100, protein: 0, carbs: 2, fat: 0 },
    items: [
      { name: 'White Claw Black Cherry 12 oz', kcal: 100, protein: 0, carbs: 2, fat: 0, source: 'White Claw package label on a grocery listing (brand site age-gated or blocks scripts), 1 can 12 fl oz: https://stopandshop.com/groceries/product/white-claw-black-cherry-hard-seltzer-12-pk-12-oz-cans/276999' },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-michelob-ultra-x6', category: 'alcohol', tolerance: 'tight',
    input: '6 michelob ultras watching the game',
    ref: { kcal: 570, protein: 6, carbs: 18, fat: 0 },
    items: [
      { name: 'Michelob Ultra 12 oz x6', kcal: 570, protein: 6, carbs: 18, fat: 0, source: 'Michelob Ultra package label on a grocery listing (brand site age-gated or blocks scripts), 12 fl oz, x6: https://stopandshop.com/groceries/product/michelob-ultra-superior-light-beer-24-pk-12-oz-cans/135629' },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; other listings show 2.6 g carbs / 0.6 g protein a can',
  },
  {
    id: 'h2-alc-corona-x2-modelo', category: 'alcohol', tolerance: 'tight',
    input: '2 coronas and a modelo',
    ref: { kcal: 439, protein: 3.5, carbs: 42, fat: 0 },
    items: [
      { name: 'Corona Extra 12 oz x2', kcal: 296, protein: 2.4, carbs: 28, fat: 0, source: 'Corona Extra package label on a grocery listing (brand site age-gated or blocks scripts), 12 fl oz, x2: https://www.foodlion.com/groceries/product/corona-extra-beer-12-pk-12-oz-cans/213323' },
      { name: 'Modelo Especial 12 oz', kcal: 143, protein: 1.1, carbs: 14, fat: 0, source: 'Modelo Especial package label on a grocery listing (brand site age-gated or blocks scripts), 12 fl oz: https://stopandshop.com/groceries/product/modelo-especial-imported-beer-12-pk-12-oz-btls/164010' },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-stella-pint', category: 'alcohol', tolerance: 'normal',
    input: 'pint of stella',
    ref: { kcal: 200, protein: 2.4, carbs: 16, fat: 0 },
    items: [
      { name: 'Stella Artois, 16 fl oz pint', kcal: 200, protein: 2.4, carbs: 16, fat: 0, source: 'Stella Artois package label on a grocery listing (brand site age-gated or blocks scripts), 12 fl oz = 150 kcal, 1.8 P, 12 C, 0 F, x16/12 for a US pint: https://hannaford.com/groceries/product/stella-artois-premium-lager-beer-12-pk-12-oz-cans/316661' },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; US pint = 16 fl oz',
  },
  {
    id: 'h2-alc-red-wine-2-glasses', category: 'alcohol', tolerance: 'normal',
    input: '2 glasses of red',
    ref: { kcal: 255, protein: 0.2, carbs: 7.8, fat: 0 },
    items: [
      { name: 'red wine, 2 glasses', grams: 300, kcal: 255, protein: 0.2, carbs: 7.8, fat: 0, source: "USDA FNDDS 2021-2023 'Wine, red' (FDC 2710688): NIAAA standard glass 5 fl oz x 2 = 10 fl oz (FNDDS 1 fl oz = 30 g)" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-vodka-soda-x4', category: 'alcohol', tolerance: 'normal',
    input: 'vodka soda x4 last night',
    ref: { kcal: 388, protein: 0, carbs: 0, fat: 0 },
    items: [
      { name: 'vodka, 4 shots', grams: 168, kcal: 388, protein: 0, carbs: 0, fat: 0, source: "USDA FNDDS 2021-2023 'Vodka' (FDC 2710704): NIAAA 1.5 fl oz per drink = '1 shot' 42 g x 4" },
      { name: 'club soda', grams: 720, kcal: 0, protein: 0, carbs: 0, fat: 0, source: "USDA SR Legacy 'Beverages, carbonated, club soda' (FDC 174842): mixer, about 6 fl oz per drink; 0 kcal and 0 g macros at any amount" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-margarita-rocks', category: 'alcohol', tolerance: 'loose',
    input: 'margarita on the rocks w salt',
    ref: { kcal: 274, protein: 0.2, carbs: 36.2, fat: 0.2 },
    items: [
      { name: 'margarita', grams: 225, kcal: 274, protein: 0.2, carbs: 36.2, fat: 0.2, source: "USDA FNDDS 2021-2023 'Margarita' (FDC 2710638): '1 drink' 225 g" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; mix ratio varies by bar',
  },
  {
    id: 'h2-alc-tequila-2-shots', category: 'alcohol', tolerance: 'normal',
    input: '2 shots of tequila 🥴',
    ref: { kcal: 194, protein: 0, carbs: 0, fat: 0 },
    items: [
      { name: 'tequila, 2 shots', grams: 84, kcal: 194, protein: 0, carbs: 0, fat: 0, source: "USDA FNDDS 2021-2023 'Tequila' (FDC 2710705): NIAAA 1.5 fl oz shot = '1 shot' 42 g x 2" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; all kcal are alcohol, macros 0',
  },
  {
    id: 'h2-alc-rum-and-coke', category: 'alcohol', tolerance: 'loose',
    input: 'rum n coke',
    ref: { kcal: 200, protein: 0, carbs: 17.6, fat: 0.4 },
    items: [
      { name: 'rum and cola', grams: 225, kcal: 200, protein: 0, carbs: 17.6, fat: 0.4, source: "USDA FNDDS 2021-2023 'Rum and cola' (FDC 2710660): '1 drink' 225 g" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-prosecco-glass', category: 'alcohol', tolerance: 'normal',
    input: 'glass of prosseco 🥂',
    ref: { kcal: 112, protein: 0.1, carbs: 3.5, fat: 0 },
    items: [
      { name: 'prosecco, 1 glass', grams: 150, kcal: 112, protein: 0.1, carbs: 3.5, fat: 0, source: "USDA FNDDS 2021-2023 'Wine, sparkling' (FDC 2710687): NIAAA standard glass 5 fl oz (FNDDS 1 fl oz = 30 g)" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-long-island', category: 'alcohol', tolerance: 'loose',
    input: 'long island iced tea at happy hour',
    ref: { kcal: 241, protein: 0, carbs: 19.5, fat: 0.3 },
    items: [
      { name: 'long island iced tea', grams: 225, kcal: 241, protein: 0, carbs: 19.5, fat: 0.3, source: "USDA FNDDS 2021-2023 'Long Island iced tea' (FDC 2710679): '1 drink' 225 g" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-mimosas-brunch', category: 'alcohol', tolerance: 'normal',
    input: '2 mimosas at brunch',
    ref: { kcal: 230, protein: 1.5, carbs: 23.4, fat: 0.6 },
    items: [
      { name: 'mimosa, 2 drinks', grams: 360, kcal: 230, protein: 1.5, carbs: 23.4, fat: 0.6, source: "USDA FNDDS 2021-2023 'Mimosa' (FDC 2710642): '1 drink' 180 g x 2" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; brunch food not described, so only the drinks count',
  },
  {
    id: 'h2-alc-double-whiskey', category: 'alcohol', tolerance: 'normal',
    input: 'double whiskey neat',
    ref: { kcal: 194, protein: 0, carbs: 0, fat: 0 },
    items: [
      { name: 'whiskey, double', grams: 84, kcal: 194, protein: 0, carbs: 0, fat: 0, source: "USDA FNDDS 2021-2023 'Whiskey' (FDC 2710700): double = 2 x NIAAA 1.5 fl oz = '1 shot' 42 g x 2" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; all kcal are alcohol, macros 0',
  },
  {
    id: 'h2-alc-gin-tonic-x2', category: 'alcohol', tolerance: 'normal',
    input: 'g&t x2',
    ref: { kcal: 378, protein: 0, carbs: 29.6, fat: 0 },
    items: [
      { name: 'gin and tonic, 2 drinks', grams: 450, kcal: 378, protein: 0, carbs: 29.6, fat: 0, source: "USDA FNDDS 2021-2023 'Gin and tonic' (FDC 2710633): '1 drink' 225 g x 2" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
  {
    id: 'h2-alc-old-fashioned', category: 'alcohol', tolerance: 'loose',
    input: 'had an old fashioned before dinner',
    ref: { kcal: 295, protein: 0.3, carbs: 11, fat: 0.1 },
    items: [
      { name: 'old fashioned', grams: 180, kcal: 295, protein: 0.3, carbs: 11, fat: 0.1, source: "USDA FNDDS 2021-2023 'Old fashioned' (FDC 2710646): '1 drink' 180 g" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat; the dinner is not described, so only the drink counts',
  },
  {
    id: 'h2-alc-half-bottle-white', category: 'alcohol', tolerance: 'normal',
    input: 'split a bottle of white wine w my gf so like half',
    ref: { kcal: 308, protein: 0.3, carbs: 9.8, fat: 0 },
    items: [
      { name: 'white wine, half bottle', grams: 375, kcal: 308, protein: 0.3, carbs: 9.8, fat: 0, source: "USDA FNDDS 2021-2023 'Wine, white' (FDC 2710689): '1/2 bottle' 375 g" },
    ],
    note: 'alcohol kcal (7 kcal/g) do not add up from protein/carbs/fat',
  },
];
