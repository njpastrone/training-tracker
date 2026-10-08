// The core food table, hand-picked: one entry per food people actually log. scripts/foods/build.ts
// turns it into data/foods.ts with USDA FoodData Central numbers; no nutrition number is typed here.
//
// Rules (data/foods.test.mts enforces most of them):
// - ids are permanent kebab-case keys: never renamed or reused.
// - The plain name is what a bare word means: COOKED for meat, fish, grains, pasta, rice and beans
//   ("chicken breast" = roasted); raw and dry variants say so in name and id ('chicken-breast-raw',
//   'rice-dry'). Oats are the exception: 'oats' is dry (people measure oats dry), 'oatmeal' is cooked.
//   Vegetables default to raw unless they're mostly eaten cooked (potatoes, squash, green beans...).
// - aliases: other wordings people type, normalized like data/catalog.ts normalizeWords. No regular
//   plurals: the matcher singularizes (singularWords), so only plurals it can't undo are listed
//   ("potatoes", "cookies"). No wording on two foods; a generic word ("chicken", "milk") goes to the
//   most common default, with a comment saying so.
// - fdc: the FoodData Central food whose macros are used: SR Legacy by default, Foundation or FNDDS
//   (survey, "as eaten") when SR lacks the food or has worse data. portionsFrom: more FDC foods, the
//   same food in the same state, whose portion weights to use as well — usually the FNDDS twin for
//   everyday sizes ("1 slice", "1 banana") or an SR sibling for cups and spoons.
// - serving: what the name alone means ("a banana", "rice"). Count units use qty 1 so "3 eggs" is
//   3 × each. Meat and fish default to 4 oz cooked unless they come in pieces (breast, drumstick...).
// - units: only where USDA lacks an obvious portion; the comment says which USDA portion the number
//   comes from.

import type { FoodCategory, FoodUnit, MassUnit } from '../../types/food';

export interface Pick {
  id: string;
  name: string;
  aliases: string[];
  category: FoodCategory;
  fdc: number;
  portionsFrom?: number[];
  serving: { qty: number; unit: FoodUnit };
  state?: 'cooked' | 'raw' | 'dry';
  units?: Partial<Record<Exclude<FoodUnit, MassUnit>, number>>;
  noFiber?: true; // USDA has no fiber value for this food: record 0 instead of rejecting it (comment why that's fine)
}

export const PICKS: Pick[] = [

  // ======== MEAT, POULTRY, FISH & SEAFOOD ========

  // ---- Chicken ----
  // "chicken", "chx", "chicken meat" → plain cooked breast meat, the most common default
  { id: 'chicken-breast', name: 'Chicken breast', aliases: ['chicken', 'chx', 'chicken meat', 'chx breast', 'cooked chicken breast', 'grilled chicken', 'grilled chicken breast', 'baked chicken breast', 'roasted chicken breast', 'boneless skinless chicken breast', 'skinless chicken breast', 'chicken breast meat', 'bsc breast'], category: 'meat_fish', fdc: 171477, portionsFrom: [2705956], serving: { qty: 1, unit: 'breast' }, state: 'cooked' },
  // breast: SR 171077's own "piece" portion (one whole boneless skinless breast, 13 data points)
  { id: 'chicken-breast-raw', name: 'Chicken breast, raw', aliases: ['raw chicken breast', 'raw chicken', 'uncooked chicken breast', 'raw chx'], category: 'meat_fish', fdc: 171077, serving: { qty: 4, unit: 'oz' }, state: 'raw', units: { breast: 272 } },
  { id: 'chicken-breast-skin', name: 'Chicken breast, with skin', aliases: ['skin on chicken breast', 'chicken breast skin on', 'bone in chicken breast'], category: 'meat_fish', fdc: 171075, portionsFrom: [2705955], serving: { qty: 1, unit: 'breast' }, state: 'cooked' },
  { id: 'chicken-thigh', name: 'Chicken thigh', aliases: ['boneless skinless chicken thigh', 'skinless chicken thigh', 'grilled chicken thigh', 'baked chicken thigh', 'chicken thigh meat'], category: 'meat_fish', fdc: 172388, portionsFrom: [2706030], serving: { qty: 1, unit: 'thigh' }, state: 'cooked' },
  { id: 'chicken-thigh-skin', name: 'Chicken thigh, with skin', aliases: ['skin on chicken thigh', 'chicken thigh skin on', 'bone in chicken thigh'], category: 'meat_fish', fdc: 173625, portionsFrom: [2706029], serving: { qty: 1, unit: 'thigh' }, state: 'cooked' },
  { id: 'chicken-thigh-raw', name: 'Chicken thigh, raw', aliases: ['raw chicken thigh', 'uncooked chicken thigh'], category: 'meat_fish', fdc: 173627, serving: { qty: 1, unit: 'thigh' }, state: 'raw' },
  // drumsticks are usually eaten with the skin, so the plain name keeps it
  { id: 'chicken-drumstick', name: 'Chicken drumstick', aliases: ['drumstick', 'chicken drum', 'baked drumstick', 'chicken leg drumstick'], category: 'meat_fish', fdc: 173612, portionsFrom: [2706002], serving: { qty: 1, unit: 'drumstick' }, state: 'cooked' },
  { id: 'chicken-drumstick-skinless', name: 'Chicken drumstick, skinless', aliases: ['skinless drumstick', 'chicken drumstick without skin'], category: 'meat_fish', fdc: 172376, portionsFrom: [2706003], serving: { qty: 1, unit: 'drumstick' }, state: 'cooked' },
  // FNDDS as fdc: SR's roasted wing (173630) has a "piece" of 85 g that isn't one wing; macros match within 1%
  { id: 'chicken-wing', name: 'Chicken wing', aliases: ['wing', 'plain chicken wing', 'baked chicken wing', 'roasted chicken wing', 'grilled chicken wing', 'chicken wingette', 'chicken drumette', 'drumette', 'wingette'], category: 'meat_fish', fdc: 2706057, serving: { qty: 1, unit: 'wing' }, state: 'cooked' },
  { id: 'chicken-dark-meat', name: 'Chicken, dark meat', aliases: ['dark meat chicken', 'chicken dark meat only'], category: 'meat_fish', fdc: 171069, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'chicken-white-meat', name: 'Chicken, white meat', aliases: ['white meat chicken', 'chicken light meat', 'light meat chicken'], category: 'meat_fish', fdc: 171466, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'rotisserie-chicken', name: 'Rotisserie chicken', aliases: ['roast chicken', 'roasted chicken', 'whole chicken', 'chicken with skin', 'rotisserie chicken meat', 'store bought rotisserie chicken'], category: 'meat_fish', fdc: 2705936, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-chicken', name: 'Ground chicken', aliases: ['chicken mince', 'minced chicken', 'cooked ground chicken'], category: 'meat_fish', fdc: 171117, portionsFrom: [2706091], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // cup: 225 g, FNDDS 2705853 "Beef, ground, raw" 1 cup (raw ground meat; SR gives no portion for raw ground chicken)
  { id: 'ground-chicken-raw', name: 'Ground chicken, raw', aliases: ['raw ground chicken', 'uncooked ground chicken'], category: 'meat_fish', fdc: 171116, serving: { qty: 4, unit: 'oz' }, state: 'raw', units: { cup: 225 } },
  { id: 'chicken-canned', name: 'Chicken, canned', aliases: ['canned chicken', 'canned chicken breast', 'chicken breast canned', 'tinned chicken'], category: 'meat_fish', fdc: 171099, portionsFrom: [2706086], serving: { qty: 1, unit: 'can' }, state: 'cooked' },
  { id: 'chicken-liver', name: 'Chicken liver', aliases: ['liver chicken', 'chicken liver cooked'], category: 'meat_fish', fdc: 171061, portionsFrom: [2706154], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },

  // ---- Turkey ----
  // "turkey" → roasted breast meat; SR 171491 "light meat" has the same numbers as roasted breast (171496)
  // without its 1.4 kg whole-bird "breast" portion
  { id: 'turkey-breast', name: 'Turkey breast', aliases: ['turkey', 'roast turkey breast', 'roasted turkey breast', 'turkey breast meat', 'turkey white meat', 'white meat turkey'], category: 'meat_fish', fdc: 171491, portionsFrom: [2706109], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'turkey-roasted', name: 'Turkey, roasted (light and dark meat)', aliases: ['roast turkey', 'roasted turkey', 'thanksgiving turkey', 'turkey meat', 'whole turkey'], category: 'meat_fish', fdc: 171481, portionsFrom: [2706113], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'turkey-dark-meat', name: 'Turkey, dark meat', aliases: ['dark meat turkey', 'turkey thigh meat'], category: 'meat_fish', fdc: 171091, portionsFrom: [2706111], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'turkey-leg', name: 'Turkey leg', aliases: ['turkey drumstick', 'roasted turkey leg'], category: 'meat_fish', fdc: 171135, portionsFrom: [2706124], serving: { qty: 1, unit: 'drumstick' }, state: 'cooked' },
  // "ground turkey" → 93% lean, the most sold kind
  { id: 'ground-turkey', name: 'Ground turkey, 93% lean', aliases: ['ground turkey', 'turkey mince', 'minced turkey', '93 7 ground turkey', '93 lean ground turkey', 'lean ground turkey', 'cooked ground turkey'], category: 'meat_fish', fdc: 172851, portionsFrom: [2706133], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-turkey-85', name: 'Ground turkey, 85% lean', aliases: ['85 15 ground turkey', '85 lean ground turkey'], category: 'meat_fish', fdc: 174494, portionsFrom: [2706133], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-turkey-99', name: 'Ground turkey, 99% lean', aliases: ['99 1 ground turkey', '99 lean ground turkey', 'fat free ground turkey', 'extra lean ground turkey', 'ground turkey breast'], category: 'meat_fish', fdc: 172848, portionsFrom: [2706133], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-turkey-raw', name: 'Ground turkey, raw', aliases: ['raw ground turkey', 'uncooked ground turkey'], category: 'meat_fish', fdc: 172850, portionsFrom: [171505], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'turkey-deli', name: 'Turkey, deli sliced', aliases: ['deli turkey', 'turkey lunch meat', 'sliced turkey', 'turkey deli meat', 'turkey cold cuts', 'lunch meat turkey', 'deli turkey breast', 'turkey slices', 'sliced turkey breast'], category: 'meat_fish', fdc: 172941, portionsFrom: [2706215], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  { id: 'turkey-bacon', name: 'Turkey bacon', aliases: ['bacon turkey', 'turkey bacon strip'], category: 'meat_fish', fdc: 171639, portionsFrom: [2706135], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  // link: 20 g, FNDDS 2706200 "Turkey or chicken sausage" 1 breakfast size link (turkey sausage is mostly breakfast links)
  { id: 'turkey-sausage', name: 'Turkey sausage', aliases: ['turkey breakfast sausage', 'turkey sausage link', 'turkey sausage patty'], category: 'meat_fish', fdc: 173871, portionsFrom: [2706200], serving: { qty: 1, unit: 'link' }, state: 'cooked', units: { link: 20 } },
  // link: 75 g, FNDDS 2706200 "Turkey or chicken sausage" 1 bun-size or griller link (chicken sausages are dinner-size links)
  { id: 'chicken-sausage', name: 'Chicken sausage', aliases: ['chicken sausage link', 'chicken apple sausage'], category: 'meat_fish', fdc: 2706200, serving: { qty: 1, unit: 'link' }, state: 'cooked', units: { link: 75 } },

  // ---- Beef ----
  // "beef", "ground beef", "hamburger meat" → 85% lean cooked crumbles (a middle, very common blend)
  { id: 'ground-beef-85', name: 'Ground beef, 85% lean', aliases: ['beef', 'ground beef', 'hamburger meat', 'minced beef', 'beef mince', '85 15 ground beef', '85 lean ground beef', 'cooked ground beef', 'ground beef crumbles'], category: 'meat_fish', fdc: 174034, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-beef-70', name: 'Ground beef, 70% lean', aliases: ['70 30 ground beef', '70 lean ground beef'], category: 'meat_fish', fdc: 169473, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-beef-80', name: 'Ground beef, 80% lean', aliases: ['80 20 ground beef', '80 lean ground beef', 'ground chuck'], category: 'meat_fish', fdc: 171799, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // "lean ground beef" → 90%; "extra lean" → 95%
  { id: 'ground-beef-90', name: 'Ground beef, 90% lean', aliases: ['90 10 ground beef', '90 lean ground beef', 'lean ground beef', 'ground sirloin'], category: 'meat_fish', fdc: 171794, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-beef-93', name: 'Ground beef, 93% lean', aliases: ['93 7 ground beef', '93 lean ground beef'], category: 'meat_fish', fdc: 174755, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-beef-95', name: 'Ground beef, 95% lean', aliases: ['95 5 ground beef', '95 lean ground beef', 'extra lean ground beef'], category: 'meat_fish', fdc: 174028, portionsFrom: [2705854], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-beef-80-raw', name: 'Ground beef, 80% lean, raw', aliases: ['raw 80 20 ground beef', '80 20 ground beef raw'], category: 'meat_fish', fdc: 174036, portionsFrom: [2705853], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'ground-beef-85-raw', name: 'Ground beef, 85% lean, raw', aliases: ['raw ground beef', 'uncooked ground beef', 'raw 85 15 ground beef', '85 15 ground beef raw'], category: 'meat_fish', fdc: 171796, portionsFrom: [2705853], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'ground-beef-90-raw', name: 'Ground beef, 90% lean, raw', aliases: ['raw 90 10 ground beef', '90 10 ground beef raw'], category: 'meat_fish', fdc: 174030, portionsFrom: [2705853], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'ground-beef-93-raw', name: 'Ground beef, 93% lean, raw', aliases: ['raw 93 7 ground beef', '93 7 ground beef raw'], category: 'meat_fish', fdc: 173110, portionsFrom: [2705853], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'beef-patty', name: 'Beef burger patty', aliases: ['hamburger patty', 'burger patty', 'beef patty', 'beef burger', 'grilled burger patty'], category: 'meat_fish', fdc: 171797, portionsFrom: [2705855], serving: { qty: 1, unit: 'patty' }, state: 'cooked' },
  // Steaks: SR lean and fat trimmed to 0-1/8" (what's on the plate), FNDDS twin for "1 steak" sizes.
  // "steak" → top sirloin, the everyday steak
  { id: 'sirloin-steak', name: 'Sirloin steak', aliases: ['steak', 'sirloin', 'top sirloin', 'top sirloin steak', 'grilled steak', 'beef steak', 'cooked steak'], category: 'meat_fish', fdc: 169457, portionsFrom: [2705832], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ribeye-steak', name: 'Ribeye steak', aliases: ['ribeye', 'rib eye', 'rib eye steak', 'delmonico steak', 'scotch fillet'], category: 'meat_fish', fdc: 169436, portionsFrom: [2705828], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'strip-steak', name: 'Strip steak', aliases: ['ny strip', 'new york strip', 'new york strip steak', 'ny strip steak', 'strip loin', 'striploin', 'top loin steak', 'kansas city strip', 'kc strip'], category: 'meat_fish', fdc: 169539, portionsFrom: [2705835], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'filet-mignon', name: 'Filet mignon', aliases: ['beef tenderloin', 'tenderloin steak', 'beef filet', 'filet steak', 'fillet steak', 'beef fillet'], category: 'meat_fish', fdc: 170641, portionsFrom: [2705841], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // porterhouse is the same cut as a T-bone with a bigger tenderloin side
  { id: 't-bone-steak', name: 'T-bone steak', aliases: ['t bone', 'tbone', 'tbone steak', 'porterhouse', 'porterhouse steak'], category: 'meat_fish', fdc: 169464, portionsFrom: [2705838], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'flank-steak', name: 'Flank steak', aliases: ['flank', 'beef flank'], category: 'meat_fish', fdc: 168733, portionsFrom: [2705827], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // portions from FNDDS 2705824 "Beef, steak, NFS" (FNDDS has no skirt steak of its own)
  { id: 'skirt-steak', name: 'Skirt steak', aliases: ['skirt', 'carne asada', 'fajita steak'], category: 'meat_fish', fdc: 168744, portionsFrom: [2705824], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'top-round-steak', name: 'Top round steak', aliases: ['london broil', 'round steak', 'top round', 'beef round'], category: 'meat_fish', fdc: 169531, portionsFrom: [2705831], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'eye-of-round', name: 'Eye of round roast', aliases: ['eye of round', 'eye round', 'eye of round steak'], category: 'meat_fish', fdc: 169524, portionsFrom: [2705847], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'tri-tip', name: 'Tri-tip', aliases: ['tritip', 'tri tip steak', 'tri tip roast'], category: 'meat_fish', fdc: 169558, portionsFrom: [2705847], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'prime-rib', name: 'Prime rib', aliases: ['standing rib roast', 'rib roast', 'prime rib roast'], category: 'meat_fish', fdc: 169500, portionsFrom: [2705847], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // FNDDS "as eaten" averages for these braised/roasted cuts (SR splits them into many lean/fat variants)
  { id: 'roast-beef', name: 'Roast beef', aliases: ['beef roast', 'roasted beef', 'rump roast'], category: 'meat_fish', fdc: 2705847, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'pot-roast', name: 'Pot roast', aliases: ['chuck roast', 'beef chuck', 'beef pot roast', 'braised beef', 'chuck steak'], category: 'meat_fish', fdc: 2705848, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'brisket', name: 'Brisket', aliases: ['beef brisket', 'smoked brisket'], category: 'meat_fish', fdc: 2705851, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'beef-stew-meat', name: 'Beef stew meat', aliases: ['stew meat', 'stewing beef', 'beef cubes', 'stew beef'], category: 'meat_fish', fdc: 2705849, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // piece: 70 g, FNDDS 2705845 "Beef, shortribs" 1 rib (yield after cooking, bone removed)
  { id: 'beef-short-ribs', name: 'Beef short ribs', aliases: ['short ribs', 'braised short ribs'], category: 'meat_fish', fdc: 168615, serving: { qty: 4, unit: 'oz' }, state: 'cooked', units: { piece: 70 } },
  { id: 'corned-beef', name: 'Corned beef', aliases: ['corned beef brisket', 'salt beef'], category: 'meat_fish', fdc: 170200, portionsFrom: [2705850], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // "liver" → beef liver, the most eaten kind
  { id: 'beef-liver', name: 'Beef liver', aliases: ['liver', 'calf liver', 'calves liver', 'liver and onions'], category: 'meat_fish', fdc: 168627, portionsFrom: [2706153], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'beef-jerky', name: 'Beef jerky', aliases: ['jerky', 'beef jerky stick'], category: 'meat_fish', fdc: 167536, portionsFrom: [2705860], serving: { qty: 1, unit: 'oz' }, state: 'cooked' },
  { id: 'roast-beef-deli', name: 'Roast beef, deli sliced', aliases: ['deli roast beef', 'roast beef lunch meat', 'sliced roast beef', 'roast beef deli meat', 'roast beef cold cuts'], category: 'meat_fish', fdc: 174570, portionsFrom: [2706218], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  { id: 'pastrami', name: 'Pastrami', aliases: ['beef pastrami', 'deli pastrami'], category: 'meat_fish', fdc: 170204, portionsFrom: [2706183], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  // "bison" → ground, how most bison is sold
  { id: 'ground-bison', name: 'Ground bison', aliases: ['bison', 'buffalo meat', 'ground buffalo', 'bison meat'], category: 'meat_fish', fdc: 174422, portionsFrom: [2705920], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'venison', name: 'Venison', aliases: ['deer meat', 'deer', 'venison steak', 'deer steak'], category: 'meat_fish', fdc: 175085, portionsFrom: [2705914], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-venison', name: 'Ground venison', aliases: ['ground deer', 'deer burger', 'venison burger'], category: 'meat_fish', fdc: 172603, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },

  // ---- Pork ----
  // "pork" → a boneless loin chop, the everyday cut
  { id: 'pork-chop', name: 'Pork chop', aliases: ['pork', 'boneless pork chop', 'grilled pork chop', 'pork loin chop', 'baked pork chop', 'pan fried pork chop'], category: 'meat_fish', fdc: 167841, portionsFrom: [2705866], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'pork-chop-raw', name: 'Pork chop, raw', aliases: ['raw pork chop', 'uncooked pork chop'], category: 'meat_fish', fdc: 167839, serving: { qty: 1, unit: 'each' }, state: 'raw' },
  { id: 'pork-tenderloin', name: 'Pork tenderloin', aliases: ['pork fillet', 'pork filet', 'pork tenderloin roast', 'roasted pork tenderloin'], category: 'meat_fish', fdc: 167905, portionsFrom: [2705877], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'pork-loin', name: 'Pork loin roast', aliases: ['pork loin', 'roast pork', 'pork roast', 'roasted pork loin', 'pork loin roast boneless'], category: 'meat_fish', fdc: 167842, portionsFrom: [2705882], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-pork', name: 'Ground pork', aliases: ['pork mince', 'minced pork', 'cooked ground pork'], category: 'meat_fish', fdc: 167903, portionsFrom: [2705863], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'pulled-pork', name: 'Pulled pork', aliases: ['pork shoulder', 'pork butt', 'boston butt', 'shredded pork', 'carnitas', 'smoked pork shoulder'], category: 'meat_fish', fdc: 167844, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // "ribs" → pork back ribs. piece: 35 g, FNDDS 2705894 "Pork, ribs" 1 rib (yield after cooking, bone removed)
  { id: 'pork-ribs', name: 'Pork ribs', aliases: ['ribs', 'baby back ribs', 'back ribs', 'pork back ribs', 'baby backs'], category: 'meat_fish', fdc: 168300, serving: { qty: 4, unit: 'oz' }, state: 'cooked', units: { piece: 35 } },
  // piece: 35 g, FNDDS 2705894 "Pork, ribs" 1 rib (yield after cooking, bone removed)
  { id: 'spareribs', name: 'Spareribs', aliases: ['spare ribs', 'pork spare ribs', 'pork spareribs', 'st louis ribs', 'st louis style ribs'], category: 'meat_fish', fdc: 169178, serving: { qty: 4, unit: 'oz' }, state: 'cooked', units: { piece: 35 } },
  { id: 'pork-belly', name: 'Pork belly', aliases: ['crispy pork belly', 'roast pork belly'], category: 'meat_fish', fdc: 2705901, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // slice: 8 g, FNDDS 2705889 "Pork bacon, smoked or cured, cooked" 1 medium slice (yield after cooking);
  // SR's own 11.5 g slice is a thick-cut slice
  { id: 'bacon', name: 'Bacon', aliases: ['pork bacon', 'bacon strip', 'bacon slice', 'streaky bacon', 'crispy bacon', 'rasher', 'rasher of bacon'], category: 'meat_fish', fdc: 168322, serving: { qty: 1, unit: 'slice' }, state: 'cooked', units: { slice: 8 } },
  { id: 'canadian-bacon', name: 'Canadian bacon', aliases: ['back bacon', 'peameal bacon', 'canadian style bacon'], category: 'meat_fish', fdc: 168383, portionsFrom: [2705884], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  // "ham" → cured roasted ham
  { id: 'ham', name: 'Ham', aliases: ['baked ham', 'roasted ham', 'holiday ham', 'ham steak', 'spiral ham', 'honey ham', 'cured ham', 'glazed ham'], category: 'meat_fish', fdc: 168296, portionsFrom: [2705878], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ham-deli', name: 'Ham, deli sliced', aliases: ['deli ham', 'ham lunch meat', 'sliced ham', 'ham slices', 'ham deli meat', 'ham cold cuts', 'lunch meat ham', 'black forest ham'], category: 'meat_fish', fdc: 173863, portionsFrom: [2706206], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  // FNDDS as fdc: SR has no prosciutto
  { id: 'prosciutto', name: 'Prosciutto', aliases: ['parma ham', 'prosciutto di parma', 'serrano ham', 'jamon serrano', 'jamon'], category: 'meat_fish', fdc: 2705879, serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  // "sausage" → pork breakfast sausage
  { id: 'pork-sausage', name: 'Pork sausage', aliases: ['sausage', 'breakfast sausage', 'sausage link', 'sausage patty', 'pork sausage link', 'pork sausage patty', 'breakfast sausage link', 'breakfast sausage patty'], category: 'meat_fish', fdc: 174578, serving: { qty: 1, unit: 'link' }, state: 'cooked' },
  { id: 'italian-sausage', name: 'Italian sausage', aliases: ['italian sausage link', 'sweet italian sausage', 'hot italian sausage', 'mild italian sausage'], category: 'meat_fish', fdc: 174586, serving: { qty: 1, unit: 'link' }, state: 'cooked' },
  // FNDDS as fdc (Foundation 332864 has no fiber value); its link weight comes from that Foundation twin
  { id: 'chorizo', name: 'Chorizo', aliases: ['mexican chorizo', 'pork chorizo', 'chorizo sausage'], category: 'meat_fish', fdc: 2706179, portionsFrom: [332864], serving: { qty: 2, unit: 'oz' }, state: 'cooked' },
  { id: 'bratwurst', name: 'Bratwurst', aliases: ['brat', 'beer brat', 'bratwurst sausage'], category: 'meat_fish', fdc: 171620, serving: { qty: 1, unit: 'link' }, state: 'cooked' },
  // SR's link is a whole 370 g ring, so the plain serving is 3 oz
  { id: 'kielbasa', name: 'Kielbasa', aliases: ['polish sausage', 'kielbasa sausage', 'smoked sausage', 'polska kielbasa'], category: 'meat_fish', fdc: 173878, serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  // "hot dog" → all-beef frank
  { id: 'hot-dog', name: 'Hot dog', aliases: ['hotdog', 'frank', 'frankfurter', 'beef hot dog', 'all beef hot dog', 'beef frank', 'wiener', 'weiner'], category: 'meat_fish', fdc: 174614, portionsFrom: [2706167], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'turkey-hot-dog', name: 'Turkey hot dog', aliases: ['turkey frank', 'turkey frankfurter', 'turkey dog'], category: 'meat_fish', fdc: 171625, portionsFrom: [2706170], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  // slice: 2 g, FNDDS 2706185 "Pepperoni, NFS" 1 slice (its "each" is a whole 251 g stick, so it isn't used)
  { id: 'pepperoni', name: 'Pepperoni', aliases: ['pepperoni slices', 'sliced pepperoni'], category: 'meat_fish', fdc: 174575, serving: { qty: 1, unit: 'oz' }, state: 'cooked', units: { slice: 2 } },
  // "salami" → hard salami (pork and beef); SR slice only (FNDDS's 28 g slice is a thick cooked-salami slice)
  { id: 'salami', name: 'Salami', aliases: ['hard salami', 'genoa salami', 'italian salami', 'salame', 'soppressata', 'sopressata'], category: 'meat_fish', fdc: 174582, serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  { id: 'bologna', name: 'Bologna', aliases: ['baloney', 'boloney', 'bologna slice'], category: 'meat_fish', fdc: 171637, portionsFrom: [2706176], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },
  { id: 'chicken-deli', name: 'Chicken breast, deli sliced', aliases: ['deli chicken', 'chicken lunch meat', 'sliced chicken breast', 'chicken deli meat', 'chicken cold cuts', 'lunch meat chicken'], category: 'meat_fish', fdc: 173874, portionsFrom: [2706208], serving: { qty: 1, unit: 'slice' }, state: 'cooked' },

  // ---- Lamb, veal, goat, duck ----
  { id: 'lamb-chop', name: 'Lamb chop', aliases: ['lamb loin chop', 'lamb rib chop', 'grilled lamb chop', 'lamb cutlet'], category: 'meat_fish', fdc: 174375, portionsFrom: [2705906], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  // "lamb" → roast leg, the most common cut
  { id: 'leg-of-lamb', name: 'Leg of lamb', aliases: ['lamb', 'lamb leg', 'roast lamb', 'roasted lamb', 'lamb roast', 'lamb meat'], category: 'meat_fish', fdc: 174373, portionsFrom: [2705905], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'ground-lamb', name: 'Ground lamb', aliases: ['lamb mince', 'minced lamb'], category: 'meat_fish', fdc: 172544, portionsFrom: [2705907], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'veal-chop', name: 'Veal chop', aliases: ['veal', 'veal loin chop'], category: 'meat_fish', fdc: 172650, portionsFrom: [2705909], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'goat', name: 'Goat', aliases: ['goat meat', 'cabrito', 'chevon'], category: 'meat_fish', fdc: 175304, portionsFrom: [2705908], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'duck', name: 'Duck', aliases: ['duck meat', 'roast duck', 'roasted duck', 'duck breast', 'skinless duck'], category: 'meat_fish', fdc: 172411, portionsFrom: [2706140], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'duck-with-skin', name: 'Duck, with skin', aliases: ['duck skin on', 'crispy duck', 'duck breast with skin'], category: 'meat_fish', fdc: 172409, portionsFrom: [2706139], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },

  // ---- Fish ----
  // "salmon" → farmed Atlantic, what most stores sell; FNDDS twin for fillet sizes (SR's fillet is half a side)
  { id: 'salmon', name: 'Salmon', aliases: ['salmon fillet', 'salmon filet', 'baked salmon', 'grilled salmon', 'atlantic salmon', 'farmed salmon', 'cooked salmon', 'pan seared salmon', 'roasted salmon'], category: 'meat_fish', fdc: 175168, portionsFrom: [2706286], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'salmon-raw', name: 'Salmon, raw', aliases: ['raw salmon', 'salmon sashimi', 'sashimi salmon', 'uncooked salmon'], category: 'meat_fish', fdc: 175167, portionsFrom: [2706284], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'salmon-sockeye', name: 'Salmon, sockeye (wild)', aliases: ['sockeye salmon', 'sockeye', 'wild salmon', 'red salmon', 'wild caught salmon', 'alaskan salmon'], category: 'meat_fish', fdc: 173692, portionsFrom: [2706286], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'salmon-pink', name: 'Salmon, pink', aliases: ['pink salmon', 'humpback salmon'], category: 'meat_fish', fdc: 172001, portionsFrom: [2706286], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'salmon-king', name: 'Salmon, king (chinook)', aliases: ['king salmon', 'chinook salmon', 'chinook'], category: 'meat_fish', fdc: 171999, portionsFrom: [2706286], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // can: 115 g, FNDDS 2706291 "Fish, salmon, canned" 1 standard can (not picked up automatically: "standard" isn't a size word)
  { id: 'salmon-canned', name: 'Salmon, canned', aliases: ['canned salmon', 'tinned salmon', 'salmon can'], category: 'meat_fish', fdc: 175175, portionsFrom: [2706291], serving: { qty: 3, unit: 'oz' }, state: 'cooked', units: { can: 115 } },
  { id: 'smoked-salmon', name: 'Smoked salmon', aliases: ['lox', 'nova lox', 'nova salmon', 'cold smoked salmon'], category: 'meat_fish', fdc: 173687, portionsFrom: [2706292], serving: { qty: 2, unit: 'oz' }, state: 'cooked' },
  // "tuna" → canned light tuna in water. can: 115 g, FNDDS 2706311 "Fish, tuna, canned" 1 standard can
  // (today's 5 oz can, drained); SR's 165 g can is the older 6 oz can
  { id: 'tuna-canned-water', name: 'Tuna, canned in water', aliases: ['tuna', 'canned tuna', 'tuna in water', 'chunk light tuna', 'light tuna', 'tinned tuna', 'tuna pouch', 'canned tuna in water'], category: 'meat_fish', fdc: 173709, serving: { qty: 1, unit: 'can' }, state: 'cooked', units: { can: 115 } },
  // can: 115 g, FNDDS 2706311 "Fish, tuna, canned" 1 standard can (see above)
  { id: 'tuna-canned-oil', name: 'Tuna, canned in oil', aliases: ['tuna in oil', 'oil packed tuna', 'canned tuna in oil', 'tuna in olive oil'], category: 'meat_fish', fdc: 173708, serving: { qty: 1, unit: 'can' }, state: 'cooked', units: { can: 115 } },
  // can: 115 g, FNDDS 2706311 "Fish, tuna, canned" 1 standard can (see above)
  { id: 'tuna-albacore', name: 'Tuna, albacore, canned in water', aliases: ['albacore', 'albacore tuna', 'white tuna', 'solid white tuna', 'white albacore tuna'], category: 'meat_fish', fdc: 175158, serving: { qty: 1, unit: 'can' }, state: 'cooked', units: { can: 115 } },
  { id: 'tuna-steak', name: 'Tuna steak', aliases: ['ahi tuna', 'ahi', 'yellowfin tuna', 'seared tuna', 'grilled tuna', 'fresh tuna', 'seared ahi'], category: 'meat_fish', fdc: 172006, portionsFrom: [2706310], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'tuna-raw', name: 'Tuna, raw', aliases: ['raw tuna', 'tuna sashimi', 'ahi sashimi', 'sashimi tuna', 'raw ahi'], category: 'meat_fish', fdc: 175159, portionsFrom: [2706308], serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  // "fish", "white fish" → cod, the default white fish fillet
  { id: 'cod', name: 'Cod', aliases: ['fish', 'white fish', 'cod fillet', 'atlantic cod', 'baked cod', 'cod fish', 'codfish', 'fish fillet'], category: 'meat_fish', fdc: 171956, portionsFrom: [2706241], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'cod-raw', name: 'Cod, raw', aliases: ['raw cod'], category: 'meat_fish', fdc: 171955, serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'tilapia', name: 'Tilapia', aliases: ['tilapia fillet', 'baked tilapia'], category: 'meat_fish', fdc: 175177, portionsFrom: [2706319], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'tilapia-raw', name: 'Tilapia, raw', aliases: ['raw tilapia'], category: 'meat_fish', fdc: 175176, serving: { qty: 4, unit: 'oz' }, state: 'raw' },
  { id: 'halibut', name: 'Halibut', aliases: ['halibut fillet'], category: 'meat_fish', fdc: 174201, portionsFrom: [2706260], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'mahi-mahi', name: 'Mahi mahi', aliases: ['mahi', 'mahimahi', 'dorado', 'dolphinfish'], category: 'meat_fish', fdc: 171992, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'trout', name: 'Trout', aliases: ['rainbow trout', 'trout fillet'], category: 'meat_fish', fdc: 173718, portionsFrom: [2706303], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'catfish', name: 'Catfish', aliases: ['catfish fillet'], category: 'meat_fish', fdc: 175166, portionsFrom: [2706235], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'sea-bass', name: 'Sea bass', aliases: ['bass', 'branzino', 'striped bass', 'sea bass fillet'], category: 'meat_fish', fdc: 173694, portionsFrom: [2706295], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'swordfish', name: 'Swordfish', aliases: ['swordfish steak'], category: 'meat_fish', fdc: 173704, portionsFrom: [2706301], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'haddock', name: 'Haddock', aliases: ['haddock fillet'], category: 'meat_fish', fdc: 174198, portionsFrom: [2706255], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'pollock', name: 'Pollock', aliases: ['alaska pollock', 'pollack', 'pollock fillet'], category: 'meat_fish', fdc: 173681, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'flounder', name: 'Flounder', aliases: ['sole', 'flatfish', 'fluke', 'dover sole', 'lemon sole', 'flounder fillet'], category: 'meat_fish', fdc: 174197, portionsFrom: [2706249], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'snapper', name: 'Snapper', aliases: ['red snapper', 'snapper fillet'], category: 'meat_fish', fdc: 173699, portionsFrom: [2706283], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'grouper', name: 'Grouper', aliases: ['grouper fillet'], category: 'meat_fish', fdc: 171963, serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'mackerel', name: 'Mackerel', aliases: ['atlantic mackerel', 'saba', 'mackerel fillet'], category: 'meat_fish', fdc: 175120, portionsFrom: [2706264], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  { id: 'herring', name: 'Herring', aliases: ['atlantic herring', 'herring fillet'], category: 'meat_fish', fdc: 175117, portionsFrom: [2706261], serving: { qty: 4, unit: 'oz' }, state: 'cooked' },
  // each: 12 g, FNDDS 2706293 "Fish, sardines, canned" 1 sardine
  { id: 'sardines', name: 'Sardines, canned in oil', aliases: ['sardines', 'canned sardines', 'sardines in oil', 'tinned sardines'], category: 'meat_fish', fdc: 175139, serving: { qty: 1, unit: 'can' }, state: 'cooked', units: { each: 12 } },
  // each: 4 g, SR 174183's own "anchovy" portion
  { id: 'anchovies', name: 'Anchovies, canned in oil', aliases: ['anchovy', 'anchovy fillet', 'canned anchovies'], category: 'meat_fish', fdc: 174183, serving: { qty: 1, unit: 'oz' }, state: 'cooked', units: { each: 4 } },

  // ---- Shellfish ----
  { id: 'shrimp', name: 'Shrimp', aliases: ['prawn', 'cooked shrimp', 'boiled shrimp', 'steamed shrimp', 'grilled shrimp', 'jumbo shrimp', 'peeled shrimp'], category: 'meat_fish', fdc: 171971, portionsFrom: [2706363], serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  { id: 'shrimp-raw', name: 'Shrimp, raw', aliases: ['raw shrimp', 'uncooked shrimp', 'raw prawn'], category: 'meat_fish', fdc: 174210, serving: { qty: 3, unit: 'oz' }, state: 'raw' },
  // each: 40 g, FNDDS 2706344 "Crab" 1 crab
  { id: 'crab', name: 'Crab', aliases: ['crab meat', 'crabmeat', 'blue crab', 'lump crab', 'lump crab meat', 'canned crab'], category: 'meat_fish', fdc: 174205, portionsFrom: [2706344], serving: { qty: 3, unit: 'oz' }, state: 'cooked', units: { each: 40 } },
  // piece: 134 g, SR 174202's own "leg" portion (one king crab leg)
  { id: 'king-crab', name: 'King crab', aliases: ['king crab leg', 'alaskan king crab', 'crab legs'], category: 'meat_fish', fdc: 174202, serving: { qty: 1, unit: 'piece' }, state: 'cooked', units: { piece: 134 } },
  { id: 'imitation-crab', name: 'Imitation crab', aliases: ['imitation crab meat', 'krab', 'surimi', 'crab stick', 'kani'], category: 'meat_fish', fdc: 174203, portionsFrom: [2706568], serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  // each: 200 g, FNDDS 2706349 "Lobster" 1 lobster (meat)
  { id: 'lobster', name: 'Lobster', aliases: ['lobster meat', 'steamed lobster', 'boiled lobster'], category: 'meat_fish', fdc: 174209, portionsFrom: [2706349], serving: { qty: 3, unit: 'oz' }, state: 'cooked', units: { each: 200 } },
  // each: 15 g, FNDDS 2706358's sibling 2706356 "Scallops, baked or broiled" 1 scallop
  { id: 'scallops', name: 'Scallops', aliases: ['sea scallops', 'bay scallops', 'seared scallops'], category: 'meat_fish', fdc: 167742, portionsFrom: [2706358], serving: { qty: 3, unit: 'oz' }, state: 'cooked', units: { each: 15 } },
  { id: 'mussels', name: 'Mussels', aliases: ['steamed mussels', 'blue mussels'], category: 'meat_fish', fdc: 174217, portionsFrom: [2706350], serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  { id: 'clams', name: 'Clams', aliases: ['steamed clams', 'clam meat'], category: 'meat_fish', fdc: 171975, portionsFrom: [2706342], serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  // oysters are mostly eaten raw, so the plain name is raw
  { id: 'oysters', name: 'Oysters, raw', aliases: ['oyster', 'raw oyster', 'oysters on the half shell'], category: 'meat_fish', fdc: 171978, serving: { qty: 1, unit: 'each' }, state: 'raw' },
  { id: 'oysters-cooked', name: 'Oysters, cooked', aliases: ['cooked oysters', 'steamed oysters', 'grilled oysters'], category: 'meat_fish', fdc: 171980, serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  // FNDDS as fdc: SR only has raw and fried squid
  { id: 'calamari', name: 'Calamari', aliases: ['squid', 'grilled calamari', 'grilled squid', 'cooked squid'], category: 'meat_fish', fdc: 2706333, serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  { id: 'octopus', name: 'Octopus', aliases: ['grilled octopus', 'pulpo', 'tako'], category: 'meat_fish', fdc: 174249, portionsFrom: [2706331], serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  { id: 'crawfish', name: 'Crawfish', aliases: ['crayfish', 'crawdad', 'crawfish tails'], category: 'meat_fish', fdc: 2706348, serving: { qty: 3, unit: 'oz' }, state: 'cooked' },

  // ======== EGGS, DAIRY, PLANT MILKS, PROTEIN POWDER, FATS & OILS ========

  // EGGS
  // "egg"/"eggs" (the name) → a whole egg cooked without added fat: SR 173424 hard-boiled. Fried,
  // scrambled and poached eggs have their own entries. Size units come from SR raw eggs: USDA grades
  // egg sizes by weight and boiling doesn't change it (SR hard-boiled large = SR raw large = 50 g).
  // cup: its own SR 'cup, chopped' 136 g (the raw egg's 243 g cup is beaten raw egg and would
  // otherwise win as the plainer wording)
  { id: 'egg', name: 'Egg', aliases: ['whole egg', 'cooked egg', 'egg whole', 'boiled egg', 'hard boiled egg', 'hardboiled egg', 'hard boiled', 'soft boiled egg', 'hard cooked egg'], category: 'eggs_dairy', fdc: 173424, portionsFrom: [2707154, 171287], serving: { qty: 1, unit: 'each' }, state: 'cooked', units: { cup: 136 } },
  { id: 'egg-fried', name: 'Egg, fried', aliases: ['fried egg', 'sunny side up egg', 'sunny side up', 'over easy egg', 'over easy', 'over medium egg', 'over hard egg'], category: 'eggs_dairy', fdc: 173423, portionsFrom: [2707155], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'egg-scrambled', name: 'Egg, scrambled', aliases: ['scrambled egg', 'scrambled'], category: 'eggs_dairy', fdc: 172187, portionsFrom: [2707198], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'egg-poached', name: 'Egg, poached', aliases: ['poached egg'], category: 'eggs_dairy', fdc: 172186, portionsFrom: [2707154], serving: { qty: 1, unit: 'large' }, state: 'cooked' },
  // An omelet alone means a 2-egg omelet; 'large' is SR's weight per large egg used (61 g with the added milk and fat)
  { id: 'omelet', name: 'Omelet', aliases: ['omelette', 'plain omelet', 'egg omelet', 'plain omelette'], category: 'eggs_dairy', fdc: 172185, serving: { qty: 2, unit: 'large' }, state: 'cooked' },
  { id: 'egg-raw', name: 'Egg, raw', aliases: ['raw egg', 'whole egg raw'], category: 'eggs_dairy', fdc: 748967, portionsFrom: [171287], serving: { qty: 1, unit: 'large' }, state: 'raw' },
  { id: 'egg-white', name: 'Egg white', aliases: ['cooked egg white', 'scrambled egg white', 'boiled egg white', 'egg white cooked'], category: 'eggs_dairy', fdc: 2707170, serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'egg-white-raw', name: 'Egg white, raw', aliases: ['raw egg white'], category: 'eggs_dairy', fdc: 172183, portionsFrom: [2707168], serving: { qty: 1, unit: 'large' }, state: 'raw' },
  // Carton egg whites are pasteurized raw whites; cup/large from SR 172183 'Egg, white, raw, fresh' (same food, unpasteurized)
  // Serving: half a cup, the usual pour (the label serving is 3 tbsp)
  { id: 'liquid-egg-whites', name: 'Liquid egg whites', aliases: ['carton egg white', 'egg whites from carton', 'boxed egg white', 'pasteurized egg white'], category: 'eggs_dairy', fdc: 172203, portionsFrom: [172183], serving: { qty: 0.5, unit: 'cup' }, state: 'raw' },
  { id: 'egg-yolk', name: 'Egg yolk', aliases: ['yolk'], category: 'eggs_dairy', fdc: 172184, portionsFrom: [2707172], serving: { qty: 1, unit: 'large' }, state: 'raw' },
  // Serving: a quarter cup replaces one egg (label serving)
  { id: 'egg-substitute', name: 'Egg substitute', aliases: ['liquid egg substitute', 'egg replacer liquid', 'fat free egg substitute'], category: 'eggs_dairy', fdc: 173462, serving: { qty: 0.25, unit: 'cup' }, state: 'raw' },
  { id: 'duck-egg', name: 'Duck egg', aliases: [], category: 'eggs_dairy', fdc: 172189, serving: { qty: 1, unit: 'each' }, state: 'raw' },
  { id: 'quail-egg', name: 'Quail egg', aliases: [], category: 'eggs_dairy', fdc: 172191, serving: { qty: 1, unit: 'each' }, state: 'raw' },

  // MILK
  // "milk" → 2%, the most sold fluid milk in the US
  { id: 'milk-2', name: 'Milk, 2%', aliases: ['milk', '2 milk', '2 percent milk', 'reduced fat milk', 'two percent milk'], category: 'eggs_dairy', fdc: 171267, serving: { qty: 1, unit: 'cup' } },
  { id: 'milk-whole', name: 'Milk, whole', aliases: ['whole milk', 'full fat milk', 'vitamin d milk', 'homo milk'], category: 'eggs_dairy', fdc: 171265, serving: { qty: 1, unit: 'cup' } },
  { id: 'milk-1', name: 'Milk, 1%', aliases: ['1 milk', '1 percent milk', 'one percent milk', 'low fat milk', 'lowfat milk'], category: 'eggs_dairy', fdc: 170872, serving: { qty: 1, unit: 'cup' } },
  { id: 'milk-skim', name: 'Milk, skim', aliases: ['skim milk', 'skim', 'nonfat milk', 'fat free milk', 'non fat milk', 'skimmed milk'], category: 'eggs_dairy', fdc: 171269, serving: { qty: 1, unit: 'cup' } },
  // FNDDS: SR has no lactose-free milk; same numbers as 2% milk
  { id: 'milk-lactose-free', name: 'Milk, lactose-free', aliases: ['lactose free milk', 'lactose free 2 milk'], category: 'eggs_dairy', fdc: 2705391, serving: { qty: 1, unit: 'cup' } },
  // "chocolate milk" → reduced fat, the usual carton and school milk
  { id: 'chocolate-milk', name: 'Chocolate milk', aliases: ['choc milk', 'chocolate milk 2'], category: 'eggs_dairy', fdc: 170880, serving: { qty: 1, unit: 'cup' } },
  { id: 'chocolate-milk-whole', name: 'Chocolate milk, whole', aliases: ['whole chocolate milk'], category: 'eggs_dairy', fdc: 170879, serving: { qty: 1, unit: 'cup' } },
  // Store buttermilk is low-fat cultured buttermilk
  { id: 'buttermilk', name: 'Buttermilk', aliases: ['cultured buttermilk', 'low fat buttermilk'], category: 'eggs_dairy', fdc: 170874, serving: { qty: 1, unit: 'cup' } },
  { id: 'evaporated-milk', name: 'Evaporated milk', aliases: ['canned evaporated milk', 'evap milk'], category: 'eggs_dairy', fdc: 171276, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'condensed-milk', name: 'Sweetened condensed milk', aliases: ['condensed milk', 'sweet condensed milk'], category: 'eggs_dairy', fdc: 171275, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'goat-milk', name: 'Goat milk', aliases: [], category: 'eggs_dairy', fdc: 171278, serving: { qty: 1, unit: 'cup' } },
  { id: 'powdered-milk', name: 'Powdered milk, nonfat', aliases: ['powdered milk', 'milk powder', 'dry milk', 'nonfat dry milk', 'skim milk powder', 'dried milk'], category: 'eggs_dairy', fdc: 170877, serving: { qty: 0.25, unit: 'cup' } },

  // CREAM & CREAMERS
  // "cream" → heavy cream. cup: SR 170859 'cup, fluid (yields 2 cups whipped)' 238 g; the build skips "yield"
  // wordings and would otherwise take 'cup, whipped' (120 g)
  { id: 'heavy-cream', name: 'Heavy cream', aliases: ['cream', 'heavy whipping cream', 'whipping cream', 'double cream'], category: 'eggs_dairy', fdc: 170859, serving: { qty: 1, unit: 'tbsp' }, units: { cup: 238 } },
  { id: 'light-cream', name: 'Light cream', aliases: ['coffee cream', 'table cream', 'single cream'], category: 'eggs_dairy', fdc: 170857, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'half-and-half', name: 'Half and half', aliases: ['half half', 'half n half', 'half and half cream'], category: 'eggs_dairy', fdc: 171255, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'whipped-cream', name: 'Whipped cream', aliases: ['canned whipped cream', 'spray whipped cream', 'reddi wip', 'whip cream'], category: 'eggs_dairy', fdc: 170860, serving: { qty: 2, unit: 'tbsp' } },
  // "cool whip" names the generic frozen whipped topping it's the archetype of
  { id: 'whipped-topping', name: 'Whipped topping', aliases: ['cool whip', 'frozen whipped topping', 'non dairy whipped topping'], category: 'eggs_dairy', fdc: 170868, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'coffee-creamer', name: 'Coffee creamer', aliases: ['creamer', 'liquid creamer', 'non dairy creamer', 'liquid coffee creamer'], category: 'eggs_dairy', fdc: 171261, portionsFrom: [2705600], serving: { qty: 1, unit: 'tbsp' } },
  // FNDDS: SR has no flavored liquid creamer (the most common kind)
  { id: 'coffee-creamer-flavored', name: 'Coffee creamer, flavored', aliases: ['flavored creamer', 'flavored coffee creamer', 'french vanilla creamer', 'hazelnut creamer', 'vanilla creamer'], category: 'eggs_dairy', fdc: 2705601, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'coffee-creamer-powder', name: 'Coffee creamer, powdered', aliases: ['powdered creamer', 'powder creamer', 'creamer powder', 'powdered coffee creamer'], category: 'eggs_dairy', fdc: 171263, serving: { qty: 1, unit: 'tsp' } },
  { id: 'sour-cream', name: 'Sour cream', aliases: ['soured cream', 'regular sour cream'], category: 'eggs_dairy', fdc: 171257, portionsFrom: [2705614], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'sour-cream-light', name: 'Sour cream, light', aliases: ['light sour cream', 'reduced fat sour cream', 'lite sour cream'], category: 'eggs_dairy', fdc: 171256, portionsFrom: [2705615], serving: { qty: 2, unit: 'tbsp' } },

  // YOGURT & KEFIR
  // "yogurt" → plain low-fat: unflavored is the neutral guess; flavors are named when eaten
  { id: 'yogurt-low-fat', name: 'Yogurt, plain, low-fat', aliases: ['yogurt', 'yoghurt', 'plain yogurt', 'low fat yogurt', 'lowfat yogurt', 'regular yogurt'], category: 'eggs_dairy', fdc: 170886, portionsFrom: [2705419], serving: { qty: 1, unit: 'container' } },
  { id: 'yogurt-whole', name: 'Yogurt, plain, whole milk', aliases: ['whole milk yogurt', 'full fat yogurt', 'plain whole milk yogurt'], category: 'eggs_dairy', fdc: 171284, portionsFrom: [2705418], serving: { qty: 1, unit: 'container' } },
  { id: 'yogurt-nonfat', name: 'Yogurt, plain, nonfat', aliases: ['nonfat yogurt', 'fat free yogurt', 'non fat yogurt', 'skim yogurt'], category: 'eggs_dairy', fdc: 170887, portionsFrom: [2705420], serving: { qty: 1, unit: 'container' } },
  { id: 'yogurt-vanilla', name: 'Yogurt, vanilla', aliases: ['vanilla yogurt', 'low fat vanilla yogurt'], category: 'eggs_dairy', fdc: 170888, portionsFrom: [2705435], serving: { qty: 1, unit: 'container' } },
  { id: 'yogurt-fruit', name: 'Yogurt, fruit', aliases: ['fruit yogurt', 'strawberry yogurt', 'blueberry yogurt', 'fruit on the bottom yogurt', 'flavored yogurt'], category: 'eggs_dairy', fdc: 170889, portionsFrom: [2705427], serving: { qty: 1, unit: 'container' } },
  // "greek yogurt" → plain nonfat, the most sold Greek yogurt
  { id: 'greek-yogurt-nonfat', name: 'Greek yogurt, nonfat, plain', aliases: ['greek yogurt', 'greek yoghurt', 'nonfat greek yogurt', 'plain greek yogurt', '0 greek yogurt', 'fat free greek yogurt', 'non fat greek yogurt'], category: 'eggs_dairy', fdc: 170894, portionsFrom: [2705424], serving: { qty: 1, unit: 'container' } },
  { id: 'greek-yogurt-low-fat', name: 'Greek yogurt, low-fat, plain', aliases: ['low fat greek yogurt', '2 greek yogurt', 'lowfat greek yogurt'], category: 'eggs_dairy', fdc: 170903, portionsFrom: [2705423], serving: { qty: 1, unit: 'container' } },
  { id: 'greek-yogurt-whole', name: 'Greek yogurt, whole milk, plain', aliases: ['whole milk greek yogurt', 'full fat greek yogurt', '5 greek yogurt'], category: 'eggs_dairy', fdc: 171304, portionsFrom: [2705422], serving: { qty: 1, unit: 'container' } },
  { id: 'greek-yogurt-vanilla', name: 'Greek yogurt, vanilla', aliases: ['vanilla greek yogurt'], category: 'eggs_dairy', fdc: 170902, portionsFrom: [2705440], serving: { qty: 1, unit: 'container' } },
  { id: 'greek-yogurt-fruit', name: 'Greek yogurt, fruit', aliases: ['fruit greek yogurt', 'strawberry greek yogurt', 'flavored greek yogurt', 'blueberry greek yogurt'], category: 'eggs_dairy', fdc: 171300, portionsFrom: [2705431], serving: { qty: 1, unit: 'container' } },
  // FNDDS: SR's only kefir is branded
  { id: 'kefir', name: 'Kefir', aliases: ['plain kefir', 'milk kefir'], category: 'eggs_dairy', fdc: 2705394, serving: { qty: 1, unit: 'cup' } },

  // COTTAGE CHEESE & RICOTTA
  // "cottage cheese" → 2%: FNDDS 'Cheese, cottage, NFS' carries the low-fat profile
  { id: 'cottage-cheese-2', name: 'Cottage cheese, 2%', aliases: ['cottage cheese', 'low fat cottage cheese', '2 cottage cheese', 'lowfat cottage cheese'], category: 'eggs_dairy', fdc: 172182, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'cottage-cheese-4', name: 'Cottage cheese, 4%', aliases: ['full fat cottage cheese', '4 cottage cheese', 'whole milk cottage cheese', 'regular cottage cheese', 'creamed cottage cheese'], category: 'eggs_dairy', fdc: 172179, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'cottage-cheese-1', name: 'Cottage cheese, 1%', aliases: ['1 cottage cheese', 'one percent cottage cheese'], category: 'eggs_dairy', fdc: 173417, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'ricotta', name: 'Ricotta cheese, whole milk', aliases: ['ricotta', 'whole milk ricotta'], category: 'eggs_dairy', fdc: 170851, portionsFrom: [2705750], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'ricotta-part-skim', name: 'Ricotta cheese, part-skim', aliases: ['part skim ricotta', 'low fat ricotta', 'light ricotta'], category: 'eggs_dairy', fdc: 171248, serving: { qty: 0.25, unit: 'cup' } },

  // CHEESE (slice weights from FNDDS "1 slice", the as-eaten deli/packaged slice)
  // "cheese" → cheddar
  { id: 'cheddar', name: 'Cheddar cheese', aliases: ['cheese', 'cheddar', 'sharp cheddar', 'mild cheddar', 'shredded cheddar', 'cheddar slice', 'aged cheddar'], category: 'eggs_dairy', fdc: 173414, portionsFrom: [2705709], serving: { qty: 1, unit: 'slice' } },
  { id: 'cheddar-reduced-fat', name: 'Cheddar cheese, reduced fat', aliases: ['reduced fat cheddar', 'low fat cheddar', 'light cheddar', '2 cheddar'], category: 'eggs_dairy', fdc: 171292, portionsFrom: [2705710], serving: { qty: 1, unit: 'slice' } },
  { id: 'mozzarella', name: 'Mozzarella cheese', aliases: ['mozzarella', 'mozz', 'fresh mozzarella', 'whole milk mozzarella', 'buffalo mozzarella'], category: 'eggs_dairy', fdc: 170845, portionsFrom: [2705722], serving: { qty: 1, unit: 'oz' } },
  { id: 'mozzarella-part-skim', name: 'Mozzarella cheese, part-skim', aliases: ['part skim mozzarella', 'shredded mozzarella', 'low moisture mozzarella', 'part skim mozz', 'pizza cheese'], category: 'eggs_dairy', fdc: 171244, portionsFrom: [2705723], serving: { qty: 1, unit: 'oz' } },
  // String cheese is low-moisture part-skim mozzarella; stick from FNDDS 'Cheese, Mozzarella, part skim' 1 stick
  { id: 'string-cheese', name: 'String cheese', aliases: ['cheese stick', 'mozzarella string cheese', 'string cheese stick'], category: 'eggs_dairy', fdc: 171244, portionsFrom: [2705723], serving: { qty: 1, unit: 'stick' } },
  { id: 'parmesan', name: 'Parmesan cheese, grated', aliases: ['parmesan', 'parm', 'grated parmesan', 'parmesan cheese', 'grated parm', 'parmesan grated'], category: 'eggs_dairy', fdc: 171247, portionsFrom: [2705728], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'parmesan-hard', name: 'Parmesan cheese, block', aliases: ['parmigiano reggiano', 'parmigiano', 'shaved parmesan', 'shredded parmesan', 'block parmesan', 'aged parmesan'], category: 'eggs_dairy', fdc: 170848, portionsFrom: [2705730], serving: { qty: 1, unit: 'oz' } },
  { id: 'feta', name: 'Feta cheese', aliases: ['feta', 'crumbled feta', 'feta crumbles'], category: 'eggs_dairy', fdc: 173420, portionsFrom: [2705714], serving: { qty: 1, unit: 'oz' } },
  { id: 'swiss', name: 'Swiss cheese', aliases: ['swiss', 'emmental', 'emmentaler', 'baby swiss'], category: 'eggs_dairy', fdc: 171251, portionsFrom: [2705735], serving: { qty: 1, unit: 'slice' } },
  // Deli American cheese (pasteurized process cheese); the wrapped singles are a separate entry
  { id: 'american-cheese', name: 'American cheese', aliases: ['american', 'american slice', 'deli american cheese', 'american cheese slice'], category: 'eggs_dairy', fdc: 171290, portionsFrom: [2705764], serving: { qty: 1, unit: 'slice' } },
  { id: 'american-cheese-singles', name: 'American cheese singles', aliases: ['cheese singles', 'american singles', 'individually wrapped cheese slice', 'processed cheese slice', 'cheese product slice'], category: 'eggs_dairy', fdc: 171289, serving: { qty: 1, unit: 'slice' } },
  { id: 'provolone', name: 'Provolone cheese', aliases: ['provolone', 'provolone slice'], category: 'eggs_dairy', fdc: 170850, portionsFrom: [2705733], serving: { qty: 1, unit: 'slice' } },
  // "pepper jack": USDA has no pepper jack; it's monterey jack with peppers, same macros
  { id: 'monterey-jack', name: 'Monterey jack cheese', aliases: ['monterey jack', 'jack cheese', 'monterey', 'pepper jack', 'pepper jack cheese', 'pepperjack'], category: 'eggs_dairy', fdc: 170844, portionsFrom: [2705720], serving: { qty: 1, unit: 'slice' } },
  { id: 'colby', name: 'Colby cheese', aliases: ['colby'], category: 'eggs_dairy', fdc: 173416, portionsFrom: [2705712], serving: { qty: 1, unit: 'slice' } },
  // FNDDS: SR has no colby jack
  { id: 'colby-jack', name: 'Colby jack cheese', aliases: ['colby jack', 'cojack', 'colby monterey jack'], category: 'eggs_dairy', fdc: 2705713, serving: { qty: 1, unit: 'slice' } },
  { id: 'mexican-blend-cheese', name: 'Mexican blend cheese, shredded', aliases: ['mexican cheese', 'mexican blend', 'shredded mexican cheese', 'taco cheese', 'fiesta blend cheese', 'mexican 4 cheese blend'], category: 'eggs_dairy', fdc: 171288, portionsFrom: [2705741], serving: { qty: 0.25, unit: 'cup' } },
  // Soft goat cheese (chevre), the usual kind; cup (crumbled) from FNDDS 'Cheese, goat'
  { id: 'goat-cheese', name: 'Goat cheese', aliases: ['chevre', 'goat cheese crumbles', 'soft goat cheese'], category: 'eggs_dairy', fdc: 173435, portionsFrom: [2705716], serving: { qty: 1, unit: 'oz' } },
  { id: 'brie', name: 'Brie cheese', aliases: ['brie'], category: 'eggs_dairy', fdc: 172177, portionsFrom: [2705708], serving: { qty: 1, unit: 'oz' } },
  { id: 'camembert', name: 'Camembert cheese', aliases: ['camembert'], category: 'eggs_dairy', fdc: 172178, portionsFrom: [2705707], serving: { qty: 1, unit: 'oz' } },
  { id: 'blue-cheese', name: 'Blue cheese', aliases: ['bleu cheese', 'blue cheese crumbles', 'gorgonzola', 'roquefort', 'stilton'], category: 'eggs_dairy', fdc: 172175, portionsFrom: [2705705], serving: { qty: 1, unit: 'oz' } },
  { id: 'gouda', name: 'Gouda cheese', aliases: ['gouda', 'smoked gouda', 'edam'], category: 'eggs_dairy', fdc: 171241, portionsFrom: [2705717], serving: { qty: 1, unit: 'slice' } },
  { id: 'muenster', name: 'Muenster cheese', aliases: ['muenster', 'munster cheese'], category: 'eggs_dairy', fdc: 171245, portionsFrom: [2705726], serving: { qty: 1, unit: 'slice' } },
  { id: 'fontina', name: 'Fontina cheese', aliases: ['fontina'], category: 'eggs_dairy', fdc: 170843, portionsFrom: [2705715], serving: { qty: 1, unit: 'oz' } },
  { id: 'gruyere', name: 'Gruyere cheese', aliases: ['gruyere'], category: 'eggs_dairy', fdc: 171242, portionsFrom: [2705718], serving: { qty: 1, unit: 'oz' } },
  { id: 'queso-fresco', name: 'Queso fresco', aliases: ['fresh mexican cheese', 'queso fresco cheese'], category: 'eggs_dairy', fdc: 172223, serving: { qty: 1, unit: 'oz' } },
  { id: 'cotija', name: 'Cotija cheese', aliases: ['cotija', 'queso cotija'], category: 'eggs_dairy', fdc: 170898, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'cream-cheese', name: 'Cream cheese', aliases: ['regular cream cheese', 'plain cream cheese', 'cream cheese spread'], category: 'eggs_dairy', fdc: 173418, portionsFrom: [2705760], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'cream-cheese-light', name: 'Cream cheese, light', aliases: ['light cream cheese', 'reduced fat cream cheese', 'low fat cream cheese', 'neufchatel', 'lite cream cheese'], category: 'eggs_dairy', fdc: 169079, portionsFrom: [2705762], serving: { qty: 1, unit: 'tbsp' } },

  // BUTTER
  // "butter" → salted stick butter
  { id: 'butter', name: 'Butter', aliases: ['salted butter', 'stick butter', 'dairy butter'], category: 'fats_oils', fdc: 173410, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'butter-unsalted', name: 'Butter, unsalted', aliases: ['unsalted butter', 'sweet cream butter', 'salt free butter'], category: 'fats_oils', fdc: 173430, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'butter-whipped', name: 'Butter, whipped', aliases: ['whipped butter'], category: 'fats_oils', fdc: 173411, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'butter-light', name: 'Butter, light', aliases: ['light butter', 'reduced fat butter'], category: 'fats_oils', fdc: 173581, portionsFrom: [2710157], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'ghee', name: 'Ghee', aliases: ['clarified butter', 'drawn butter'], category: 'fats_oils', fdc: 171314, portionsFrom: [2710168], serving: { qty: 1, unit: 'tbsp' } },

  // PLANT MILKS
  // FNDDS: SR's unsweetened almond milk has an odd 262 g cup; FNDDS has the same macros with the standard 244 g cup
  { id: 'almond-milk', name: 'Almond milk, unsweetened', aliases: ['almond milk', 'unsweetened almond milk', 'almondmilk'], category: 'eggs_dairy', fdc: 2705409, serving: { qty: 1, unit: 'cup' } },
  { id: 'almond-milk-sweetened', name: 'Almond milk, sweetened', aliases: ['sweetened almond milk', 'vanilla almond milk', 'original almond milk'], category: 'eggs_dairy', fdc: 168751, serving: { qty: 1, unit: 'cup' } },
  { id: 'almond-milk-chocolate', name: 'Almond milk, chocolate', aliases: ['chocolate almond milk'], category: 'eggs_dairy', fdc: 174820, serving: { qty: 1, unit: 'cup' } },
  // FNDDS: SR has no oat milk
  { id: 'oat-milk', name: 'Oat milk', aliases: ['oatmilk', 'oat beverage'], category: 'eggs_dairy', fdc: 2705412, serving: { qty: 1, unit: 'cup' } },
  { id: 'soy-milk', name: 'Soy milk', aliases: ['soymilk', 'soya milk', 'original soy milk', 'vanilla soy milk'], category: 'eggs_dairy', fdc: 172456, serving: { qty: 1, unit: 'cup' } },
  { id: 'soy-milk-unsweetened', name: 'Soy milk, unsweetened', aliases: ['unsweetened soy milk', 'unsweetened soymilk'], category: 'eggs_dairy', fdc: 175215, serving: { qty: 1, unit: 'cup' } },
  { id: 'rice-milk', name: 'Rice milk', aliases: ['rice beverage', 'ricemilk'], category: 'eggs_dairy', fdc: 171942, portionsFrom: [2705411], serving: { qty: 1, unit: 'cup' } },
  // "coconut milk" alone is left unassigned: carton (drink) vs canned (cooking) differ 6x in calories
  { id: 'coconut-milk-beverage', name: 'Coconut milk beverage', aliases: ['carton coconut milk', 'coconut milk drink', 'coconutmilk beverage'], category: 'eggs_dairy', fdc: 174116, serving: { qty: 1, unit: 'cup' } },
  // FNDDS 'Coconut milk, used in cooking': SR's canned coconut milk has no fiber value; cup/tbsp from that SR food (170173)
  { id: 'coconut-milk-canned', name: 'Coconut milk, canned', aliases: ['canned coconut milk', 'full fat coconut milk', 'coconut milk for cooking'], category: 'eggs_dairy', fdc: 2707568, portionsFrom: [170173], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'coconut-cream', name: 'Coconut cream', aliases: ['canned coconut cream', 'unsweetened coconut cream'], category: 'eggs_dairy', fdc: 170580, serving: { qty: 2, unit: 'tbsp' } },

  // PROTEIN POWDER (category 'other': supplements, not a food group)
  // "protein powder"/"protein shake" → whey: a shake is powder + water, so a scoop is the shake. Bare
  // "protein" isn't an alias: too broad ("protein bar", "protein pancakes").
  // scoop: 30 g, the usual whey label scoop (30-33 g); FNDDS 2710742's '1 scoop' is a light 26 g
  { id: 'whey-protein', name: 'Whey protein powder', aliases: ['protein powder', 'whey', 'whey protein', 'protein shake', 'whey isolate', 'whey protein isolate', 'protein scoop', 'whey shake', 'scoop of protein'], category: 'other', fdc: 173180, portionsFrom: [2710742], serving: { qty: 1, unit: 'scoop' }, units: { scoop: 30 } },
  { id: 'soy-protein-powder', name: 'Soy protein powder', aliases: ['plant protein powder', 'vegan protein powder', 'plant protein', 'soy protein', 'plant based protein powder', 'vegan protein'], category: 'other', fdc: 173181, serving: { qty: 1, unit: 'scoop' } },

  // OILS (all ~884 kcal per 100 g, so the generic defaults barely change the numbers)
  // "oil" → olive oil; "cooking oil" → vegetable oil (US vegetable oil is soybean)
  { id: 'olive-oil', name: 'Olive oil', aliases: ['oil', 'evoo', 'extra virgin olive oil', 'extra virgin oil', 'light olive oil'], category: 'fats_oils', fdc: 171413, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'vegetable-oil', name: 'Vegetable oil', aliases: ['cooking oil', 'veg oil', 'soybean oil', 'frying oil'], category: 'fats_oils', fdc: 172370, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'canola-oil', name: 'Canola oil', aliases: ['rapeseed oil'], category: 'fats_oils', fdc: 172336, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'coconut-oil', name: 'Coconut oil', aliases: ['virgin coconut oil'], category: 'fats_oils', fdc: 171412, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'avocado-oil', name: 'Avocado oil', aliases: [], category: 'fats_oils', fdc: 173573, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'sesame-oil', name: 'Sesame oil', aliases: ['toasted sesame oil'], category: 'fats_oils', fdc: 171016, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'peanut-oil', name: 'Peanut oil', aliases: ['groundnut oil'], category: 'fats_oils', fdc: 171410, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'sunflower-oil', name: 'Sunflower oil', aliases: [], category: 'fats_oils', fdc: 171025, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'corn-oil', name: 'Corn oil', aliases: [], category: 'fats_oils', fdc: 171029, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'grapeseed-oil', name: 'Grapeseed oil', aliases: ['grape seed oil'], category: 'fats_oils', fdc: 171028, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'flaxseed-oil', name: 'Flaxseed oil', aliases: ['flax oil', 'linseed oil'], category: 'fats_oils', fdc: 167702, serving: { qty: 1, unit: 'tbsp' } },
  // USDA's only cooking spray is SR 'Oil, PAM cooking spray, original'. serving: its own portion
  // 'spray, about 1/3 second (1 NLEA serving)' 0.3 g, which the build can't read
  { id: 'cooking-spray', name: 'Cooking spray', aliases: ['oil spray', 'nonstick spray', 'non stick cooking spray', 'pan spray', 'spray oil'], category: 'fats_oils', fdc: 171430, serving: { qty: 1, unit: 'serving' }, units: { serving: 0.3 } },
  { id: 'lard', name: 'Lard', aliases: ['pork fat'], category: 'fats_oils', fdc: 171401, portionsFrom: [2710166], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'shortening', name: 'Shortening', aliases: ['vegetable shortening', 'crisco'], category: 'fats_oils', fdc: 171011, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'beef-tallow', name: 'Beef tallow', aliases: ['tallow', 'beef fat'], category: 'fats_oils', fdc: 171400, serving: { qty: 1, unit: 'tbsp' } },

  // MAYO & SPREADS
  { id: 'mayonnaise', name: 'Mayonnaise', aliases: ['mayo', 'regular mayo', 'real mayonnaise', 'full fat mayo'], category: 'fats_oils', fdc: 171009, portionsFrom: [2710204], serving: { qty: 1, unit: 'tbsp' } },
  // FNDDS: SR's only generic light mayo is the cholesterol-free diet kind; FNDDS 'Mayonnaise, light' matches today's light mayo
  { id: 'mayonnaise-light', name: 'Mayonnaise, light', aliases: ['light mayo', 'light mayonnaise', 'reduced fat mayo', 'lite mayo', 'low fat mayo'], category: 'fats_oils', fdc: 2710220, serving: { qty: 1, unit: 'tbsp' } },
  // "miracle whip" names the generic mayonnaise-type dressing it's the archetype of
  { id: 'salad-dressing-mayo-type', name: 'Mayonnaise-style dressing', aliases: ['miracle whip', 'mayonnaise type salad dressing', 'salad cream', 'sandwich dressing'], category: 'fats_oils', fdc: 171403, portionsFrom: [2710207], serving: { qty: 1, unit: 'tbsp' } },
  // Today's tub margarine is ~60% fat vegetable-oil spread
  { id: 'margarine', name: 'Margarine', aliases: ['vegetable oil spread', 'buttery spread', 'margarine spread', 'tub margarine', 'oleo'], category: 'fats_oils', fdc: 171039, portionsFrom: [2710160], serving: { qty: 1, unit: 'tbsp' } },
  // stick: 113 g, SR 173430 butter 'stick' (the same US quarter-pound stick; USDA gives margarine none)
  { id: 'margarine-stick', name: 'Margarine, stick', aliases: ['stick margarine', 'margarine 80'], category: 'fats_oils', fdc: 171435, portionsFrom: [2710159], serving: { qty: 1, unit: 'tbsp' }, units: { stick: 113 } },
  { id: 'margarine-light', name: 'Margarine, light', aliases: ['light margarine', 'light spread', 'reduced fat margarine', 'light buttery spread'], category: 'fats_oils', fdc: 171434, portionsFrom: [2710162], serving: { qty: 1, unit: 'tbsp' } },

  // ======== GRAINS, PASTA, RICE, CEREAL, BREAD & BAKERY ========

  // ---- Rice (plain name = cooked) ----
  // "rice"/"white rice" → cooked long-grain white rice. Jasmine and basmati are long-grain white rices
  // with no separate USDA rows; they share these numbers.
  { id: 'rice', name: 'Rice, white', aliases: ['rice', 'white rice', 'steamed rice', 'cooked rice', 'cooked white rice', 'boiled rice', 'plain rice', 'long grain rice', 'jasmine rice', 'basmati rice', 'cooked jasmine rice', 'cooked basmati rice'], category: 'grains', fdc: 168878, portionsFrom: [2708408], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-dry', name: 'Rice, white, dry', aliases: ['dry rice', 'uncooked rice', 'raw rice', 'dry white rice', 'uncooked white rice', 'raw white rice', 'dry jasmine rice', 'uncooked jasmine rice', 'dry basmati rice', 'uncooked basmati rice'], category: 'grains', fdc: 168877, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'rice-brown', name: 'Rice, brown', aliases: ['brown rice', 'cooked brown rice', 'steamed brown rice', 'brown basmati rice', 'brown jasmine rice'], category: 'grains', fdc: 169704, portionsFrom: [2708414], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-brown-dry', name: 'Rice, brown, dry', aliases: ['dry brown rice', 'uncooked brown rice', 'raw brown rice'], category: 'grains', fdc: 169703, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'rice-wild', name: 'Rice, wild', aliases: ['wild rice', 'cooked wild rice'], category: 'grains', fdc: 168897, portionsFrom: [2708424], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-wild-dry', name: 'Rice, wild, dry', aliases: ['dry wild rice', 'uncooked wild rice', 'raw wild rice'], category: 'grains', fdc: 169726, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  // Sushi rice is short/medium-grain white rice; SR's short-grain cooked rows lack fiber, medium-grain has it
  { id: 'rice-medium-grain', name: 'Rice, medium-grain', aliases: ['medium grain rice', 'short grain rice', 'sushi rice', 'calrose rice', 'arborio rice', 'risotto rice'], category: 'grains', fdc: 168880, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-sticky', name: 'Rice, sticky', aliases: ['sticky rice', 'glutinous rice', 'sweet rice', 'mochi rice'], category: 'grains', fdc: 169711, portionsFrom: [2708422], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-instant', name: 'Rice, instant', aliases: ['instant rice', 'minute rice', 'microwave rice', 'precooked rice'], category: 'grains', fdc: 169710, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'rice-parboiled', name: 'Rice, parboiled', aliases: ['parboiled rice', 'converted rice'], category: 'grains', fdc: 169708, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },

  // ---- Pasta and noodles (plain name = cooked) ----
  // Shapes share one row: USDA's cooked pasta numbers don't differ by shape.
  { id: 'pasta', name: 'Pasta', aliases: ['cooked pasta', 'spaghetti', 'penne', 'macaroni', 'elbow macaroni', 'rigatoni', 'fusilli', 'rotini', 'linguine', 'fettuccine', 'fettuccini', 'farfalle', 'bow tie pasta', 'pasta shells', 'ziti', 'orzo', 'angel hair', 'angel hair pasta', 'lasagna noodles', 'lasagna sheets', 'tagliatelle', 'pappardelle', 'cooked spaghetti', 'plain pasta', 'white pasta'], category: 'grains', fdc: 169737, portionsFrom: [2708357], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'pasta-dry', name: 'Pasta, dry', aliases: ['dry pasta', 'uncooked pasta', 'raw pasta', 'dry spaghetti', 'uncooked spaghetti', 'dry penne', 'uncooked penne', 'dry macaroni', 'uncooked macaroni', 'dried pasta'], category: 'grains', fdc: 169736, serving: { qty: 2, unit: 'oz' }, state: 'dry' },
  { id: 'pasta-whole-wheat', name: 'Pasta, whole wheat', aliases: ['whole wheat pasta', 'whole grain pasta', 'whole wheat spaghetti', 'whole wheat penne', 'wholemeal pasta', 'wheat pasta'], category: 'grains', fdc: 168910, portionsFrom: [2708358], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'pasta-whole-wheat-dry', name: 'Pasta, whole wheat, dry', aliases: ['dry whole wheat pasta', 'uncooked whole wheat pasta', 'dry whole grain pasta'], category: 'grains', fdc: 169738, serving: { qty: 2, unit: 'oz' }, state: 'dry' },
  { id: 'pasta-gluten-free', name: 'Pasta, gluten-free', aliases: ['gluten free pasta', 'gf pasta', 'corn pasta', 'gluten free spaghetti'], category: 'grains', fdc: 168900, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "noodles" → egg noodles: FNDDS's own "Noodles, cooked" is egg noodles
  { id: 'egg-noodles', name: 'Egg noodles', aliases: ['noodles', 'cooked egg noodles', 'cooked noodles'], category: 'grains', fdc: 169732, portionsFrom: [2708352], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'egg-noodles-dry', name: 'Egg noodles, dry', aliases: ['dry egg noodles', 'uncooked egg noodles', 'dry noodles', 'uncooked noodles'], category: 'grains', fdc: 169731, serving: { qty: 2, unit: 'oz' }, state: 'dry' },
  { id: 'rice-noodles', name: 'Rice noodles', aliases: ['cooked rice noodles', 'rice vermicelli', 'pad thai noodles', 'pho noodles', 'rice sticks'], category: 'grains', fdc: 168914, portionsFrom: [2708356], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'glass-noodles', name: 'Glass noodles', aliases: ['cellophane noodles', 'bean thread noodles', 'mung bean noodles'], category: 'grains', fdc: 2708355, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "ramen" → instant ramen (restaurant ramen bowls are mixed dishes for the estimate path).
  // packet: SR 171177's "package without flavor packet" (81 g) + its flavor "packet" (5.8 g) = one whole pack
  { id: 'instant-ramen', name: 'Instant ramen', aliases: ['ramen', 'ramen noodles', 'instant noodles', 'instant ramen noodles', 'packet ramen', 'ramen packet', 'top ramen'], category: 'grains', fdc: 171177, serving: { qty: 1, unit: 'packet' }, state: 'dry', units: { packet: 86.8, each: 86.8 } },
  { id: 'gnocchi', name: 'Gnocchi', aliases: ['potato gnocchi'], category: 'grains', fdc: 2708722, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },

  // ---- Oats and hot cereals ----
  // "oats"/"rolled oats" → DRY: people measure oats before cooking. Quick oats share the row.
  // Steel-cut oats: Foundation 2346397 has no fiber value or portions, so they aren't here yet.
  { id: 'oats', name: 'Oats, rolled', aliases: ['oats', 'rolled oats', 'old fashioned oats', 'oldfashioned oats', 'quick oats', 'dry oats', 'uncooked oats', 'raw oats', 'oat flakes', 'porridge oats', 'dry oatmeal', 'uncooked oatmeal'], category: 'grains', fdc: 173904, portionsFrom: [2708489], serving: { qty: 0.5, unit: 'cup' }, state: 'dry' },
  // "oatmeal"/"porridge" → cooked with water
  { id: 'oatmeal', name: 'Oatmeal', aliases: ['porridge', 'cooked oatmeal', 'cooked oats', 'oat porridge', 'hot oatmeal'], category: 'grains', fdc: 173905, portionsFrom: [2708381], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'instant-oatmeal', name: 'Instant oatmeal packet, plain', aliases: ['instant oatmeal', 'instant oats', 'oatmeal packet', 'instant oatmeal packet'], category: 'grains', fdc: 171661, serving: { qty: 1, unit: 'packet' }, state: 'dry' },
  { id: 'cream-of-wheat', name: 'Cream of wheat', aliases: ['farina', 'cream of wheat cereal', 'semolina porridge'], category: 'grains', fdc: 171659, portionsFrom: [2708434], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'grits', name: 'Grits', aliases: ['corn grits', 'hominy grits', 'cooked grits'], category: 'grains', fdc: 171655, portionsFrom: [2708365], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'polenta', name: 'Polenta', aliases: ['cornmeal mush', 'cooked polenta', 'cornmeal porridge'], category: 'grains', fdc: 2708374, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },

  // ---- Other grains (plain name = cooked) ----
  { id: 'quinoa', name: 'Quinoa', aliases: ['cooked quinoa'], category: 'grains', fdc: 168917, portionsFrom: [2708400], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'quinoa-dry', name: 'Quinoa, dry', aliases: ['dry quinoa', 'uncooked quinoa', 'raw quinoa'], category: 'grains', fdc: 168874, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'couscous', name: 'Couscous', aliases: ['cooked couscous', 'cous cous'], category: 'grains', fdc: 169700, portionsFrom: [2708441], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'couscous-dry', name: 'Couscous, dry', aliases: ['dry couscous', 'uncooked couscous'], category: 'grains', fdc: 169699, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'barley', name: 'Barley', aliases: ['pearl barley', 'pearled barley', 'cooked barley'], category: 'grains', fdc: 170285, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'barley-dry', name: 'Barley, dry', aliases: ['dry barley', 'uncooked barley', 'dry pearl barley'], category: 'grains', fdc: 170284, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'bulgur', name: 'Bulgur', aliases: ['bulgur wheat', 'bulghur', 'burghul', 'cooked bulgur'], category: 'grains', fdc: 170287, portionsFrom: [2708438], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'bulgur-dry', name: 'Bulgur, dry', aliases: ['dry bulgur', 'uncooked bulgur'], category: 'grains', fdc: 170688, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  // USDA has farro only dry and without portions. cup: SR 169745 "Spelt, uncooked" 1 cup (174 g), the
  // closest grain USDA weighs (farro is emmer, a spelt relative of the same kernel size).
  { id: 'farro-dry', name: 'Farro, dry', aliases: ['farro', 'dry farro', 'uncooked farro', 'emmer'], category: 'grains', fdc: 2710828, serving: { qty: 0.25, unit: 'cup' }, state: 'dry', units: { cup: 174 } },
  { id: 'millet', name: 'Millet', aliases: ['cooked millet'], category: 'grains', fdc: 168871, portionsFrom: [2708377], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'buckwheat', name: 'Buckwheat', aliases: ['kasha', 'buckwheat groats', 'cooked buckwheat'], category: 'grains', fdc: 170686, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'wheat-germ', name: 'Wheat germ', aliases: ['toasted wheat germ'], category: 'grains', fdc: 173896, portionsFrom: [2708477], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'flour', name: 'Flour, all-purpose', aliases: ['flour', 'all purpose flour', 'white flour', 'plain flour', 'wheat flour', 'ap flour'], category: 'grains', fdc: 168894, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'flour-whole-wheat', name: 'Flour, whole wheat', aliases: ['whole wheat flour', 'wholemeal flour', 'whole grain flour'], category: 'grains', fdc: 168893, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'cornmeal', name: 'Cornmeal', aliases: ['corn meal', 'yellow cornmeal'], category: 'grains', fdc: 168867, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'masa-harina', name: 'Masa harina', aliases: ['masa flour', 'corn masa flour', 'masa harina flour'], category: 'grains', fdc: 169694, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'breadcrumbs', name: 'Breadcrumbs', aliases: ['bread crumbs', 'dry breadcrumbs'], category: 'grains', fdc: 174928, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'croutons', name: 'Croutons', aliases: ['seasoned croutons'], category: 'grains', fdc: 172752, serving: { qty: 0.5, unit: 'cup' } },

  // ---- Bread ----
  // "bread"/"toast" → white: the most eaten US bread. Toast has its own (drier) rows.
  { id: 'bread-white', name: 'Bread, white', aliases: ['bread', 'white bread', 'sandwich bread', 'sliced bread', 'white sandwich bread'], category: 'grains', fdc: 325871, portionsFrom: [2707598], serving: { qty: 1, unit: 'slice' } },
  { id: 'toast', name: 'Toast, white', aliases: ['toast', 'white toast', 'toasted bread', 'toasted white bread'], category: 'grains', fdc: 2707599, serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-whole-wheat', name: 'Bread, whole wheat', aliases: ['whole wheat bread', 'whole grain bread', '100 whole wheat bread', 'wholemeal bread', 'brown bread'], category: 'grains', fdc: 335240, portionsFrom: [2707709], serving: { qty: 1, unit: 'slice' } },
  { id: 'toast-whole-wheat', name: 'Toast, whole wheat', aliases: ['whole wheat toast', 'wheat toast', 'brown toast', 'whole grain toast', 'toasted whole wheat bread'], category: 'grains', fdc: 2707710, serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-wheat', name: 'Bread, wheat', aliases: ['wheat bread', 'cracked wheat bread', 'honey wheat bread'], category: 'grains', fdc: 172686, portionsFrom: [2707720], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-multigrain', name: 'Bread, multigrain', aliases: ['multigrain bread', 'multi grain bread', 'seeded bread', '7 grain bread', '12 grain bread', 'grain bread'], category: 'grains', fdc: 168013, portionsFrom: [2707777], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-sourdough', name: 'Bread, sourdough', aliases: ['sourdough', 'sourdough bread', 'sour dough bread', 'sourdough toast'], category: 'grains', fdc: 2707646, serving: { qty: 1, unit: 'slice' } },
  // FNDDS row (same numbers as SR 172675) so SR's odd 139 g "slice" isn't used
  { id: 'bread-french', name: 'Bread, French', aliases: ['french bread', 'baguette', 'vienna bread', 'crusty bread'], category: 'grains', fdc: 2707610, serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-italian', name: 'Bread, Italian', aliases: ['italian bread', 'ciabatta', 'ciabatta bread'], category: 'grains', fdc: 174913, portionsFrom: [2707614], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-rye', name: 'Bread, rye', aliases: ['rye bread', 'jewish rye', 'rye toast', 'seeded rye'], category: 'grains', fdc: 172684, portionsFrom: [2707755], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-pumpernickel', name: 'Bread, pumpernickel', aliases: ['pumpernickel', 'pumpernickel bread', 'black bread'], category: 'grains', fdc: 174918, portionsFrom: [2707760], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-raisin', name: 'Bread, raisin', aliases: ['raisin bread', 'cinnamon raisin bread', 'raisin toast'], category: 'grains', fdc: 172680, portionsFrom: [2707644], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-challah', name: 'Bread, challah', aliases: ['challah', 'challah bread', 'egg bread'], category: 'grains', fdc: 172673, portionsFrom: [2707624], serving: { qty: 1, unit: 'slice' } },
  { id: 'brioche', name: 'Brioche', aliases: ['brioche bread', 'brioche bun', 'brioche roll'], category: 'grains', fdc: 2707682, serving: { qty: 1, unit: 'piece' } },
  // no state: a baked bread (the checker's rice/oat name rule doesn't apply)
  { id: 'bread-oatmeal', name: 'Bread, oatmeal', aliases: ['oatmeal bread', 'oat bread'], category: 'grains', fdc: 172678, portionsFrom: [2707768], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-potato', name: 'Bread, potato', aliases: ['potato bread', 'potato roll'], category: 'grains', fdc: 167943, portionsFrom: [2707642], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-sprouted', name: 'Bread, sprouted grain', aliases: ['sprouted bread', 'sprouted grain bread', 'sprouted wheat bread', 'ezekiel bread'], category: 'grains', fdc: 171850, portionsFrom: [2707718], serving: { qty: 1, unit: 'slice' } },
  { id: 'bread-gluten-free', name: 'Bread, gluten-free', aliases: ['gluten free bread', 'gf bread'], category: 'grains', fdc: 2707797, serving: { qty: 1, unit: 'slice' } },

  // ---- Bagels, muffins, flatbreads, tortillas ----
  // Bagel portions from SR only: FNDDS's "Bagel Thin" (46 g) would otherwise become 'each'
  { id: 'bagel', name: 'Bagel', aliases: ['plain bagel', 'everything bagel', 'sesame bagel', 'poppy seed bagel', 'onion bagel', 'white bagel'], category: 'grains', fdc: 174899, serving: { qty: 1, unit: 'each' } },
  { id: 'bagel-whole-wheat', name: 'Bagel, whole wheat', aliases: ['whole wheat bagel', 'wheat bagel', 'whole grain bagel'], category: 'grains', fdc: 167533, serving: { qty: 1, unit: 'each' } },
  { id: 'bagel-cinnamon-raisin', name: 'Bagel, cinnamon raisin', aliases: ['cinnamon raisin bagel', 'raisin bagel'], category: 'grains', fdc: 172664, serving: { qty: 1, unit: 'each' } },
  // each: SR 171852's only portion, "piece" (one bagel)
  { id: 'bagel-multigrain', name: 'Bagel, multigrain', aliases: ['multigrain bagel', 'multi grain bagel'], category: 'grains', fdc: 171852, serving: { qty: 1, unit: 'each' }, units: { each: 81 } },
  { id: 'english-muffin', name: 'English muffin', aliases: ['sourdough english muffin', 'toasted english muffin'], category: 'grains', fdc: 174994, portionsFrom: [2707698], serving: { qty: 1, unit: 'each' } },
  { id: 'english-muffin-whole-wheat', name: 'English muffin, whole wheat', aliases: ['whole wheat english muffin', 'wheat english muffin'], category: 'grains', fdc: 172762, portionsFrom: [2707741], serving: { qty: 1, unit: 'each' } },
  { id: 'pita', name: 'Pita', aliases: ['pita bread', 'white pita', 'pita pocket'], category: 'grains', fdc: 174915, portionsFrom: [2707616], serving: { qty: 1, unit: 'each' } },
  { id: 'pita-whole-wheat', name: 'Pita, whole wheat', aliases: ['whole wheat pita', 'wheat pita', 'whole wheat pita bread'], category: 'grains', fdc: 174916, portionsFrom: [2707730], serving: { qty: 1, unit: 'each' } },
  // each: SR 171845's "piece" is one whole naan (FNDDS's 177 g restaurant naan left out)
  { id: 'naan', name: 'Naan', aliases: ['naan bread', 'nan bread', 'plain naan'], category: 'grains', fdc: 171845, serving: { qty: 1, unit: 'each' }, units: { each: 90 } },
  // each: SR 171844's "piece" is one whole roti
  { id: 'roti', name: 'Roti', aliases: ['chapati', 'chapatti', 'roti bread', 'phulka'], category: 'grains', fdc: 171844, serving: { qty: 1, unit: 'each' }, units: { each: 68 } },
  // "tortilla"/"wrap" → flour tortilla
  { id: 'tortilla-flour', name: 'Tortilla, flour', aliases: ['tortilla', 'flour tortilla', 'wrap', 'tortilla wrap', 'burrito tortilla', 'soft taco shell', 'white tortilla'], category: 'grains', fdc: 175037, portionsFrom: [2707824], serving: { qty: 1, unit: 'each' } },
  { id: 'tortilla-corn', name: 'Tortilla, corn', aliases: ['corn tortilla', 'street taco tortilla'], category: 'grains', fdc: 175036, portionsFrom: [2707823], serving: { qty: 1, unit: 'each' } },
  { id: 'tortilla-whole-wheat', name: 'Tortilla, whole wheat', aliases: ['whole wheat tortilla', 'wheat tortilla', 'whole wheat wrap', 'wheat wrap', 'whole grain wrap'], category: 'grains', fdc: 174081, portionsFrom: [2707825], serving: { qty: 1, unit: 'each' } },
  { id: 'taco-shell', name: 'Taco shell, hard', aliases: ['taco shell', 'hard taco shell', 'crunchy taco shell', 'corn taco shell'], category: 'grains', fdc: 172800, serving: { qty: 1, unit: 'each' } },

  // ---- Rolls and buns ----
  // each: FNDDS 2707657 "hamburger bun" (52 g); the normalizer doesn't read that wording
  { id: 'hamburger-bun', name: 'Hamburger bun', aliases: ['burger bun', 'hamburger roll', 'sandwich bun', 'bun'], category: 'grains', fdc: 172796, serving: { qty: 1, unit: 'each' }, units: { each: 52 } },
  // each: FNDDS 2707656 "hot dog bun" (45 g)
  { id: 'hot-dog-bun', name: 'Hot dog bun', aliases: ['hotdog bun', 'hot dog roll', 'frankfurter roll'], category: 'grains', fdc: 172796, serving: { qty: 1, unit: 'each' }, units: { each: 45 } },
  { id: 'dinner-roll', name: 'Dinner roll', aliases: ['roll', 'bread roll', 'soft roll', 'white roll', 'yeast roll'], category: 'grains', fdc: 172793, serving: { qty: 1, unit: 'each' } },
  { id: 'hard-roll', name: 'Roll, hard', aliases: ['hard roll', 'kaiser roll', 'crusty roll', 'bolillo'], category: 'grains', fdc: 175031, serving: { qty: 1, unit: 'each' } },
  { id: 'hoagie-roll', name: 'Hoagie roll', aliases: ['sub roll', 'sub bun', 'hoagie bun', 'submarine roll', 'hero roll'], category: 'grains', fdc: 2707663, serving: { qty: 1, unit: 'each' } },
  { id: 'croissant', name: 'Croissant', aliases: ['butter croissant', 'plain croissant'], category: 'grains', fdc: 174987, portionsFrom: [2707678], serving: { qty: 1, unit: 'each' } },
  { id: 'biscuit', name: 'Biscuit', aliases: ['buttermilk biscuit', 'plain biscuit', 'southern biscuit'], category: 'grains', fdc: 172667, portionsFrom: [2707801], serving: { qty: 1, unit: 'each' } },

  // ---- Pancakes, waffles ----
  { id: 'pancake', name: 'Pancake', aliases: ['plain pancake', 'buttermilk pancake', 'hotcake', 'flapjack'], category: 'grains', fdc: 2708304, serving: { qty: 1, unit: 'each' } },
  { id: 'waffle', name: 'Waffle', aliases: ['plain waffle', 'homemade waffle', 'belgian waffle'], category: 'grains', fdc: 2708325, serving: { qty: 1, unit: 'each' } },
  { id: 'waffle-frozen', name: 'Waffle, frozen', aliases: ['frozen waffle', 'toaster waffle', 'eggo waffle', 'eggo'], category: 'grains', fdc: 175038, portionsFrom: [2708313], serving: { qty: 1, unit: 'each' } },

  // ---- Muffins, donuts (sweet bakery) ----
  // "muffin" → blueberry, the most common muffin. each: SR 172765 "medium" (113 g); its "muffin" portion (31 g) is a small toaster-size muffin
  { id: 'muffin-blueberry', name: 'Muffin, blueberry', aliases: ['blueberry muffin', 'muffin'], category: 'sweets_snacks', fdc: 172765, serving: { qty: 1, unit: 'each' }, units: { each: 113 } },
  { id: 'muffin-corn', name: 'Muffin, corn', aliases: ['corn muffin', 'cornbread muffin', 'cornbread'], category: 'sweets_snacks', fdc: 175002, serving: { qty: 1, unit: 'each' } },
  // "donut"/"doughnut" → glazed yeast donut, the default donut
  // each: 64 g, its own SR 'doughnut medium (approx 3-3/4" dia)'; the first plain 'doughnut (approx 1-1/2 oz)' (42 g) is a small one
  { id: 'donut-glazed', name: 'Donut, glazed', aliases: ['donut', 'doughnut', 'glazed donut', 'glazed doughnut', 'yeast donut', 'honey glazed donut'], category: 'sweets_snacks', fdc: 172758, serving: { qty: 1, unit: 'each' }, units: { each: 64 } },
  { id: 'donut-cake', name: 'Donut, cake', aliases: ['cake donut', 'cake doughnut', 'old fashioned donut', 'plain donut', 'plain doughnut'], category: 'sweets_snacks', fdc: 174990, serving: { qty: 1, unit: 'each' } },

  // ---- Breakfast cereal ----
  // "cereal" → USDA's own unspecified ready-to-eat cereal (FNDDS "Cereal, ready-to-eat, NFS").
  // Brand names here map to the generic row with the same recipe numbers.
  { id: 'cereal', name: 'Cereal', aliases: ['breakfast cereal', 'cold cereal', 'dry cereal'], category: 'grains', fdc: 2708445, serving: { qty: 1, unit: 'cup' } },
  { id: 'corn-flakes', name: 'Corn flakes', aliases: ['cornflakes', 'corn flake cereal'], category: 'grains', fdc: 2708453, serving: { qty: 1, unit: 'cup' } },
  { id: 'frosted-flakes', name: 'Corn flakes, frosted', aliases: ['frosted flakes', 'frosted corn flakes', 'sugar frosted flakes'], category: 'grains', fdc: 2708474, serving: { qty: 1, unit: 'cup' } },
  // no state on ready-to-eat cereals, rice crackers and rice cakes: eaten as sold (checker's rice/oat name rule doesn't apply)
  { id: 'toasted-oat-cereal', name: 'Toasted oat cereal', aliases: ['cheerios', 'oat os', 'plain cheerios', 'oat cereal'], category: 'grains', fdc: 2708448, serving: { qty: 1, unit: 'cup' } },
  { id: 'honey-nut-oat-cereal', name: 'Toasted oat cereal, honey nut', aliases: ['honey nut cheerios', 'honey nut os', 'honey nut oat cereal'], category: 'grains', fdc: 2708464, serving: { qty: 1, unit: 'cup' } },
  { id: 'rice-crisp-cereal', name: 'Rice crisp cereal', aliases: ['rice krispies', 'crispy rice cereal', 'rice crispies', 'rice crisps'], category: 'grains', fdc: 2708455, serving: { qty: 1, unit: 'cup' } },
  { id: 'bran-flakes', name: 'Bran flakes', aliases: ['bran flakes cereal', 'bran cereal'], category: 'grains', fdc: 2708456, serving: { qty: 1, unit: 'cup' } },
  { id: 'shredded-wheat', name: 'Shredded wheat', aliases: ['shredded wheat cereal', 'shredded wheat biscuits'], category: 'grains', fdc: 2708479, serving: { qty: 1, unit: 'cup' } },
  { id: 'puffed-rice', name: 'Puffed rice cereal', aliases: ['puffed rice'], category: 'grains', fdc: 173912, serving: { qty: 1, unit: 'cup' } },
  { id: 'granola', name: 'Granola', aliases: ['granola cereal', 'toasted granola'], category: 'grains', fdc: 2708461, serving: { qty: 0.5, unit: 'cup' } },

  // ---- Crackers, rice cakes, popcorn ----
  // "crackers" → saltines, the plainest
  { id: 'crackers-saltine', name: 'Crackers, saltine', aliases: ['crackers', 'saltines', 'saltine crackers', 'soda crackers', 'premium crackers'], category: 'grains', fdc: 172746, portionsFrom: [2708167], serving: { qty: 1, unit: 'oz' } },
  { id: 'crackers-wheat', name: 'Crackers, wheat', aliases: ['wheat crackers', 'wheat thins'], category: 'grains', fdc: 2708184, serving: { qty: 1, unit: 'oz' } },
  { id: 'crackers-whole-wheat', name: 'Crackers, whole wheat', aliases: ['whole wheat crackers', 'triscuit', 'woven wheat crackers', 'whole grain crackers'], category: 'grains', fdc: 172749, serving: { qty: 1, unit: 'oz' } },
  { id: 'crackers-butter', name: 'Crackers, butter', aliases: ['butter crackers', 'ritz crackers', 'ritz', 'round crackers', 'club crackers'], category: 'grains', fdc: 174982, portionsFrom: [2708146], serving: { qty: 1, unit: 'oz' } },
  { id: 'crackers-cheese', name: 'Crackers, cheese', aliases: ['cheese crackers', 'cheez it', 'goldfish', 'goldfish crackers', 'cheddar crackers'], category: 'grains', fdc: 174975, portionsFrom: [2708150], serving: { qty: 1, unit: 'oz' } },
  { id: 'graham-crackers', name: 'Graham crackers', aliases: ['grahams', 'honey graham crackers'], category: 'grains', fdc: 174957, portionsFrom: [2708133], serving: { qty: 1, unit: 'oz' } },
  // no state: eaten as sold (checker's rice/oat name rule doesn't apply here or on rice-cake)
  { id: 'crackers-rice', name: 'Crackers, rice', aliases: ['rice crackers', 'senbei'], category: 'grains', fdc: 2708163, serving: { qty: 1, unit: 'oz' } },
  // each: SR 172740's "matzo" portion (one sheet)
  { id: 'matzo', name: 'Matzo', aliases: ['matzah', 'matza', 'matzo cracker'], category: 'grains', fdc: 172740, serving: { qty: 1, unit: 'each' }, units: { each: 28 } },
  { id: 'rice-cake', name: 'Rice cake', aliases: ['puffed rice cake', 'brown rice cake', 'plain rice cake'], category: 'grains', fdc: 170250, serving: { qty: 1, unit: 'each' } },
  // "popcorn" → FNDDS "Popcorn, NFS" (USDA's unspecified popcorn: oil/microwave-popped). 3 cups ≈ 1 oz, the label serving.
  { id: 'popcorn', name: 'Popcorn', aliases: ['microwave popcorn', 'oil popped popcorn', 'salted popcorn'], category: 'grains', fdc: 2708216, serving: { qty: 3, unit: 'cup' } },
  { id: 'popcorn-air-popped', name: 'Popcorn, air-popped', aliases: ['air popped popcorn', 'plain popcorn', 'air popcorn', 'skinny popcorn'], category: 'grains', fdc: 167959, serving: { qty: 3, unit: 'cup' } },
  { id: 'popcorn-buttered', name: 'Popcorn, buttered', aliases: ['buttered popcorn', 'butter popcorn', 'popcorn with butter'], category: 'grains', fdc: 2708222, serving: { qty: 3, unit: 'cup' } },

  // ---- Less common grains, wrappers, pastries ----
  { id: 'spelt', name: 'Spelt', aliases: ['cooked spelt', 'spelt berries'], category: 'grains', fdc: 169746, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'amaranth', name: 'Amaranth', aliases: ['cooked amaranth', 'amaranth grain'], category: 'grains', fdc: 170683, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'teff', name: 'Teff', aliases: ['cooked teff'], category: 'grains', fdc: 168918, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'cream-of-rice', name: 'Cream of rice', aliases: ['rice porridge', 'cream of rice cereal', 'cooked cream of rice'], category: 'grains', fdc: 2708415, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // each: SR 172802 "wrapper, wonton (3-1/2" square)" (8 g); the normalizer skips "wrapper"
  { id: 'wonton-wrapper', name: 'Wonton wrapper', aliases: ['dumpling wrapper', 'gyoza wrapper', 'wonton skin'], category: 'grains', fdc: 172802, serving: { qty: 1, unit: 'each' }, units: { each: 8 } },
  // each: FNDDS 2708342 "crepe, any size" (65 g)
  { id: 'crepe', name: 'Crepe', aliases: ['plain crepe', 'french crepe'], category: 'grains', fdc: 2708342, serving: { qty: 1, unit: 'each' }, units: { each: 65 } },
  { id: 'scone', name: 'Scone', aliases: ['plain scone', 'english scone'], category: 'sweets_snacks', fdc: 2707808, serving: { qty: 1, unit: 'each' } },

  // ======== FRUIT & VEGETABLES ========

  // ---- FRUIT ----
  // Whole fruit: SR macros + the FNDDS raw twin for everyday counts ("1 banana", "1 slice"). Servings: a count fruit is 1 medium (or 1 each
  // when USDA gives no sizes); berries, grapes, cherries, melon and chopped fruit 1 cup; dried fruit 1/4 cup or 1 piece; canned fruit 1/2 cup.
  { id: 'banana', name: 'Banana', aliases: ['ripe banana'], category: 'fruit', fdc: 173944, portionsFrom: [2709224], serving: { qty: 1, unit: 'medium' } },
  { id: 'apple', name: 'Apple', aliases: ['red apple', 'green apple', 'raw apple', 'granny smith', 'granny smith apple', 'gala apple', 'fuji apple', 'honeycrisp', 'honeycrisp apple', 'pink lady apple', 'red delicious apple', 'golden delicious apple', 'mcintosh apple'], category: 'fruit', fdc: 171688, portionsFrom: [2709215], serving: { qty: 1, unit: 'medium' } },
  { id: 'orange', name: 'Orange', aliases: ['navel orange', 'naval orange', 'valencia orange', 'blood orange', 'cara cara orange'], category: 'fruit', fdc: 169097, portionsFrom: [2709171], serving: { qty: 1, unit: 'each' } },
  { id: 'clementine', name: 'Clementine', aliases: ['cutie', 'cuties', 'clementine orange'], category: 'fruit', fdc: 168195, portionsFrom: [2709164], serving: { qty: 1, unit: 'each' } },
  { id: 'tangerine', name: 'Tangerine', aliases: ['mandarin', 'mandarin orange', 'satsuma', 'satsuma mandarin'], category: 'fruit', fdc: 169105, portionsFrom: [2709175], serving: { qty: 1, unit: 'medium' } },
  // Light syrup: the usual canned/cup pack
  { id: 'mandarin-oranges-canned', name: 'Mandarin oranges, canned', aliases: ['canned mandarin oranges', 'canned mandarins', 'mandarin orange cup'], category: 'fruit', fdc: 169924, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'grapes', name: 'Grapes', aliases: ['red grapes', 'green grapes', 'seedless grapes', 'black grapes'], category: 'fruit', fdc: 174683, portionsFrom: [2709237], serving: { qty: 1, unit: 'cup' } },
  { id: 'strawberries', name: 'Strawberries', aliases: ['fresh strawberries', 'frozen strawberries', 'sliced strawberries'], category: 'fruit', fdc: 167762, serving: { qty: 1, unit: 'cup' } },
  { id: 'blueberries', name: 'Blueberries', aliases: ['fresh blueberries', 'frozen blueberries', 'wild blueberries'], category: 'fruit', fdc: 171711, serving: { qty: 1, unit: 'cup' } },
  { id: 'raspberries', name: 'Raspberries', aliases: ['red raspberries', 'frozen raspberries'], category: 'fruit', fdc: 167755, serving: { qty: 1, unit: 'cup' } },
  { id: 'blackberries', name: 'Blackberries', aliases: ['frozen blackberries'], category: 'fruit', fdc: 173946, serving: { qty: 1, unit: 'cup' } },
  // "berries" alone: a mix is the likeliest meaning; FNDDS "Berries, NFS" (SR has no generic berry mix)
  { id: 'mixed-berries', name: 'Mixed berries', aliases: ['berries', 'berry mix', 'berry medley', 'frozen berries', 'frozen mixed berries'], category: 'fruit', fdc: 2709271, serving: { qty: 1, unit: 'cup' } },
  { id: 'cranberries', name: 'Cranberries', aliases: ['fresh cranberries', 'raw cranberries'], category: 'fruit', fdc: 171722, serving: { qty: 1, unit: 'cup' } },
  { id: 'cranberries-dried', name: 'Cranberries, dried', aliases: ['dried cranberries', 'craisins', 'sweetened dried cranberries'], category: 'fruit', fdc: 171723, portionsFrom: [2709202], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'mango', name: 'Mango', aliases: ['mangoes', 'fresh mango', 'frozen mango', 'mango chunks'], category: 'fruit', fdc: 169910, portionsFrom: [2709242], serving: { qty: 1, unit: 'each' } },
  { id: 'mango-dried', name: 'Mango, dried', aliases: ['dried mango'], category: 'fruit', fdc: 169091, portionsFrom: [2709205], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'pineapple', name: 'Pineapple', aliases: ['fresh pineapple', 'pineapple chunks', 'frozen pineapple'], category: 'fruit', fdc: 169124, portionsFrom: [2709260], serving: { qty: 1, unit: 'cup' } },
  { id: 'pineapple-canned', name: 'Pineapple, canned', aliases: ['canned pineapple', 'pineapple rings', 'crushed pineapple', 'pineapple tidbits'], category: 'fruit', fdc: 169126, portionsFrom: [2709263], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'watermelon', name: 'Watermelon', aliases: ['seedless watermelon'], category: 'fruit', fdc: 167765, portionsFrom: [2709270], serving: { qty: 1, unit: 'cup' } },
  { id: 'cantaloupe', name: 'Cantaloupe', aliases: ['cantaloupe melon', 'muskmelon', 'rockmelon'], category: 'fruit', fdc: 169092, portionsFrom: [2709226], serving: { qty: 1, unit: 'cup' } },
  { id: 'honeydew', name: 'Honeydew', aliases: ['honeydew melon', 'honey dew'], category: 'fruit', fdc: 169911, portionsFrom: [2709241], serving: { qty: 1, unit: 'cup' } },
  { id: 'peach', name: 'Peach', aliases: ['yellow peach', 'white peach', 'fresh peach'], category: 'fruit', fdc: 169928, portionsFrom: [2709249], serving: { qty: 1, unit: 'medium' } },
  // Juice pack: the usual "in 100% juice" can/cup
  { id: 'peaches-canned', name: 'Peaches, canned', aliases: ['canned peaches', 'peach cup'], category: 'fruit', fdc: 169930, portionsFrom: [2709252], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'nectarine', name: 'Nectarine', aliases: [], category: 'fruit', fdc: 169914, portionsFrom: [2709245], serving: { qty: 1, unit: 'medium' } },
  { id: 'pear', name: 'Pear', aliases: ['bartlett pear', 'anjou pear', 'bosc pear', 'green pear', 'red pear'], category: 'fruit', fdc: 169118, portionsFrom: [2709254], serving: { qty: 1, unit: 'medium' } },
  { id: 'plum', name: 'Plum', aliases: ['red plum', 'black plum'], category: 'fruit', fdc: 169949, portionsFrom: [2709265], serving: { qty: 1, unit: 'each' } },
  { id: 'apricot', name: 'Apricot', aliases: ['fresh apricot'], category: 'fruit', fdc: 171697, portionsFrom: [2709221], serving: { qty: 1, unit: 'each' } },
  // each: FNDDS 2709197 "1 slice/chunk" = 8 g (a whole pitted dried apricot; SR's "1 half" is 3.5 g)
  { id: 'apricots-dried', name: 'Apricots, dried', aliases: ['dried apricots', 'dried apricot halves'], category: 'fruit', fdc: 173941, portionsFrom: [2709197], serving: { qty: 0.25, unit: 'cup' }, units: { each: 8 } },
  { id: 'cherries', name: 'Cherries', aliases: ['sweet cherries', 'bing cherries', 'fresh cherries'], category: 'fruit', fdc: 171719, portionsFrom: [2709231], serving: { qty: 1, unit: 'cup' } },
  { id: 'kiwi', name: 'Kiwi', aliases: ['kiwifruit', 'kiwi fruit', 'green kiwi'], category: 'fruit', fdc: 168153, portionsFrom: [2709239], serving: { qty: 1, unit: 'each' } },
  { id: 'avocado', name: 'Avocado', aliases: ['hass avocado', 'avo'], category: 'fruit', fdc: 171705, portionsFrom: [2709223], serving: { qty: 1, unit: 'each' } },
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'lemon', name: 'Lemon', aliases: ['fresh lemon'], category: 'fruit', fdc: 167746, portionsFrom: [2709168], serving: { qty: 1, unit: 'each' } },
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'lime', name: 'Lime', aliases: ['fresh lime'], category: 'fruit', fdc: 168155, portionsFrom: [2709170], serving: { qty: 1, unit: 'each' } },
  // No FNDDS twin: its "1 grapefruit" (308 g) disagrees with SR's medium (256 g)
  { id: 'grapefruit', name: 'Grapefruit', aliases: ['pink grapefruit', 'red grapefruit', 'ruby red grapefruit', 'white grapefruit'], category: 'fruit', fdc: 173033, serving: { qty: 1, unit: 'medium' } },
  // Serving 1/2 cup of arils: that's how it's eaten; "a pomegranate" is 1 each (FNDDS)
  { id: 'pomegranate', name: 'Pomegranate', aliases: ['pomegranate seeds', 'pomegranate arils', 'arils'], category: 'fruit', fdc: 169134, portionsFrom: [2709267], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'dates', name: 'Dates', aliases: ['deglet noor dates', 'pitted dates', 'dried dates'], category: 'fruit', fdc: 171726, portionsFrom: [2709203], serving: { qty: 1, unit: 'each' } },
  { id: 'dates-medjool', name: 'Dates, medjool', aliases: ['medjool dates', 'medjool'], category: 'fruit', fdc: 168191, serving: { qty: 1, unit: 'each' } },
  { id: 'raisins', name: 'Raisins', aliases: ['golden raisins', 'dark raisins', 'sultanas'], category: 'fruit', fdc: 168165, portionsFrom: [2709212], serving: { qty: 0.25, unit: 'cup' } },
  // each: SR 168162 "1 prune, pitted" = 9.5 g ("prune" isn't a count word for the build)
  { id: 'prunes', name: 'Prunes', aliases: ['dried plums'], category: 'fruit', fdc: 168162, serving: { qty: 1, unit: 'each' }, units: { each: 9.5 } },
  { id: 'figs', name: 'Figs', aliases: ['fresh figs'], category: 'fruit', fdc: 173021, portionsFrom: [2709235], serving: { qty: 1, unit: 'medium' } },
  { id: 'figs-dried', name: 'Figs, dried', aliases: ['dried figs'], category: 'fruit', fdc: 174665, portionsFrom: [2709204], serving: { qty: 1, unit: 'each' } },
  { id: 'papaya', name: 'Papaya', aliases: ['fresh papaya'], category: 'fruit', fdc: 169926, portionsFrom: [2709246], serving: { qty: 1, unit: 'cup' } },
  // Serving: SR's "1 piece (2" x 2" x 1/2")" = 45 g
  { id: 'coconut', name: 'Coconut', aliases: ['fresh coconut', 'coconut meat', 'raw coconut'], category: 'fruit', fdc: 170169, serving: { qty: 1, unit: 'piece' } },
  { id: 'coconut-shredded', name: 'Coconut, shredded, sweetened', aliases: ['shredded coconut', 'sweetened coconut', 'sweetened shredded coconut', 'coconut flakes', 'flaked coconut'], category: 'fruit', fdc: 168586, serving: { qty: 2, unit: 'tbsp' } },
  // cup: SR has no portion for desiccated coconut; uses SR 170169 raw coconut "1 cup, shredded" = 80 g
  { id: 'coconut-unsweetened', name: 'Coconut, shredded, unsweetened', aliases: ['unsweetened coconut', 'desiccated coconut', 'unsweetened shredded coconut', 'unsweetened coconut flakes'], category: 'fruit', fdc: 170170, serving: { qty: 2, unit: 'tbsp' }, units: { cup: 80 } },
  { id: 'guava', name: 'Guava', aliases: ['guayaba'], category: 'fruit', fdc: 173044, portionsFrom: [2709238], serving: { qty: 1, unit: 'each' } },
  { id: 'passion-fruit', name: 'Passion fruit', aliases: ['passionfruit', 'granadilla', 'maracuya'], category: 'fruit', fdc: 169108, portionsFrom: [2709248], serving: { qty: 1, unit: 'each' } },
  // each: SR 169086 "1 fruit without refuse" = 9.6 g (the build skips "refuse" portions)
  { id: 'lychee', name: 'Lychee', aliases: ['litchi', 'lichee'], category: 'fruit', fdc: 169086, serving: { qty: 1, unit: 'cup' }, units: { each: 9.6 } },
  { id: 'persimmon', name: 'Persimmon', aliases: ['fuyu persimmon', 'hachiya persimmon', 'kaki'], category: 'fruit', fdc: 169941, portionsFrom: [2709259], serving: { qty: 1, unit: 'each' } },
  { id: 'star-fruit', name: 'Star fruit', aliases: ['starfruit', 'carambola'], category: 'fruit', fdc: 171715, portionsFrom: [2709228], serving: { qty: 1, unit: 'medium' } },
  // FNDDS: SR has no dragon fruit
  { id: 'dragon-fruit', name: 'Dragon fruit', aliases: ['dragonfruit', 'pitaya', 'pitahaya'], category: 'fruit', fdc: 2709234, serving: { qty: 1, unit: 'cup' } },
  // Plantain = cooked (ripe, baked); FNDDS cooked twin for "1 plantain" and slices
  { id: 'plantain', name: 'Plantain', aliases: ['cooked plantain', 'baked plantain', 'boiled plantain', 'platano'], category: 'fruit', fdc: 169131, portionsFrom: [2709558], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'plantain-raw', name: 'Plantain, raw', aliases: ['raw plantain'], category: 'fruit', fdc: 169130, portionsFrom: [2709560], serving: { qty: 1, unit: 'each' }, state: 'raw' },
  { id: 'plantains-fried', name: 'Plantains, fried', aliases: ['fried plantains', 'tostones', 'patacones'], category: 'fruit', fdc: 168199, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'applesauce', name: 'Applesauce', aliases: ['apple sauce', 'unsweetened applesauce', 'applesauce cup'], category: 'fruit', fdc: 171695, portionsFrom: [2709217], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'applesauce-sweetened', name: 'Applesauce, sweetened', aliases: ['sweetened applesauce', 'sweetened apple sauce'], category: 'fruit', fdc: 171696, serving: { qty: 0.5, unit: 'cup' } },
  // Light syrup: the usual canned pack
  { id: 'fruit-cocktail', name: 'Fruit cocktail', aliases: ['canned fruit cocktail', 'fruit cocktail in light syrup'], category: 'fruit', fdc: 173027, portionsFrom: [2709289], serving: { qty: 0.5, unit: 'cup' } },

  // ---- VEGETABLES ----
  // Plain name = raw for salad/snack vegetables, cooked for vegetables mostly eaten cooked (potatoes, squash, green beans, peas, corn,
  // asparagus, brussels sprouts, artichoke, eggplant, okra, beets, turnips, parsnips, collards); the twin says so in its name.
  // Servings: chopped, leafy or cooked veg 1 cup (cooked spinach and mushrooms 1/2 cup: they shrink to a quarter); count veg 1 medium.

  // Leafy greens and salad
  { id: 'spinach', name: 'Spinach', aliases: ['baby spinach', 'raw spinach', 'fresh spinach'], category: 'vegetables', fdc: 168462, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'spinach-cooked', name: 'Spinach, cooked', aliases: ['cooked spinach', 'sauteed spinach', 'steamed spinach', 'wilted spinach'], category: 'vegetables', fdc: 168463, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'kale', name: 'Kale', aliases: ['raw kale', 'baby kale', 'curly kale', 'lacinato kale', 'tuscan kale', 'dinosaur kale'], category: 'vegetables', fdc: 168421, portionsFrom: [2709599], serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'kale-cooked', name: 'Kale, cooked', aliases: ['cooked kale', 'sauteed kale', 'steamed kale'], category: 'vegetables', fdc: 169238, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "lettuce" alone → romaine, the most eaten salad lettuce
  { id: 'lettuce-romaine', name: 'Lettuce, romaine', aliases: ['romaine', 'romaine lettuce', 'romaine hearts', 'cos lettuce', 'lettuce'], category: 'vegetables', fdc: 169247, portionsFrom: [2709590], serving: { qty: 1, unit: 'cup' } },
  { id: 'lettuce-iceberg', name: 'Lettuce, iceberg', aliases: ['iceberg', 'iceberg lettuce', 'head lettuce'], category: 'vegetables', fdc: 169248, serving: { qty: 1, unit: 'cup' } },
  { id: 'lettuce-green-leaf', name: 'Lettuce, green leaf', aliases: ['green leaf lettuce', 'green leaf', 'leaf lettuce'], category: 'vegetables', fdc: 169249, serving: { qty: 1, unit: 'cup' } },
  { id: 'lettuce-red-leaf', name: 'Lettuce, red leaf', aliases: ['red leaf lettuce', 'red leaf'], category: 'vegetables', fdc: 168431, serving: { qty: 1, unit: 'cup' } },
  { id: 'lettuce-butterhead', name: 'Lettuce, butterhead', aliases: ['butterhead', 'butter lettuce', 'boston lettuce', 'bibb lettuce'], category: 'vegetables', fdc: 168429, serving: { qty: 1, unit: 'cup' } },
  // "salad"/"greens" alone → plain mixed greens (dressing and toppings are separate items); FNDDS: SR has no mix.
  // Serving 2 cups: a side salad's worth of greens
  { id: 'mixed-greens', name: 'Mixed greens', aliases: ['salad', 'greens', 'green salad', 'garden salad', 'side salad', 'salad greens', 'salad mix', 'spring mix', 'mesclun', 'baby greens', 'lettuce mix'], category: 'vegetables', fdc: 2709792, serving: { qty: 2, unit: 'cup' } },
  { id: 'arugula', name: 'Arugula', aliases: ['rocket', 'baby arugula', 'roquette'], category: 'vegetables', fdc: 169387, portionsFrom: [2709791], serving: { qty: 1, unit: 'cup' } },
  { id: 'watercress', name: 'Watercress', aliases: ['cress'], category: 'vegetables', fdc: 170068, serving: { qty: 1, unit: 'cup' } },
  // SR's raw "endive" is the curly/escarole kind
  { id: 'endive', name: 'Endive', aliases: ['curly endive', 'frisee', 'escarole'], category: 'vegetables', fdc: 168412, serving: { qty: 1, unit: 'cup' } },
  { id: 'radicchio', name: 'Radicchio', aliases: [], category: 'vegetables', fdc: 168564, serving: { qty: 1, unit: 'cup' } },
  { id: 'cabbage', name: 'Cabbage', aliases: ['green cabbage', 'white cabbage', 'raw cabbage', 'shredded cabbage'], category: 'vegetables', fdc: 169975, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'cabbage-cooked', name: 'Cabbage, cooked', aliases: ['cooked cabbage', 'boiled cabbage', 'steamed cabbage'], category: 'vegetables', fdc: 169976, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'cabbage-red', name: 'Cabbage, red', aliases: ['red cabbage', 'purple cabbage'], category: 'vegetables', fdc: 169977, serving: { qty: 1, unit: 'cup' } },
  { id: 'cabbage-napa', name: 'Cabbage, napa', aliases: ['napa cabbage', 'nappa cabbage', 'chinese cabbage', 'wombok'], category: 'vegetables', fdc: 169979, serving: { qty: 1, unit: 'cup' } },
  { id: 'bok-choy', name: 'Bok choy', aliases: ['bok choi', 'pak choi', 'pak choy', 'baby bok choy'], category: 'vegetables', fdc: 170390, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'bok-choy-cooked', name: 'Bok choy, cooked', aliases: ['cooked bok choy', 'steamed bok choy', 'sauteed bok choy'], category: 'vegetables', fdc: 170391, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'collard-greens', name: 'Collard greens', aliases: ['collards', 'cooked collard greens', 'cooked collards'], category: 'vegetables', fdc: 170407, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'collard-greens-raw', name: 'Collard greens, raw', aliases: ['raw collard greens', 'raw collards'], category: 'vegetables', fdc: 170406, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'swiss-chard', name: 'Swiss chard', aliases: ['chard', 'rainbow chard', 'silverbeet'], category: 'vegetables', fdc: 169991, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'swiss-chard-cooked', name: 'Swiss chard, cooked', aliases: ['cooked chard', 'cooked swiss chard', 'sauteed chard'], category: 'vegetables', fdc: 170401, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },

  // Cruciferous and green veg
  { id: 'broccoli', name: 'Broccoli', aliases: ['raw broccoli', 'broccoli florets', 'broccoli crowns'], category: 'vegetables', fdc: 170379, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'broccoli-cooked', name: 'Broccoli, cooked', aliases: ['cooked broccoli', 'steamed broccoli', 'boiled broccoli', 'roasted broccoli', 'frozen broccoli'], category: 'vegetables', fdc: 169967, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'cauliflower', name: 'Cauliflower', aliases: ['raw cauliflower', 'cauliflower florets'], category: 'vegetables', fdc: 169986, portionsFrom: [2709777], serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  // Riced cauliflower is eaten cooked
  { id: 'cauliflower-cooked', name: 'Cauliflower, cooked', aliases: ['cooked cauliflower', 'steamed cauliflower', 'roasted cauliflower', 'cauliflower rice', 'riced cauliflower'], category: 'vegetables', fdc: 170397, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'brussels-sprouts', name: 'Brussels sprouts', aliases: ['brussels', 'roasted brussels sprouts', 'cooked brussels sprouts'], category: 'vegetables', fdc: 169971, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'brussels-sprouts-raw', name: 'Brussels sprouts, raw', aliases: ['raw brussels sprouts', 'shaved brussels sprouts'], category: 'vegetables', fdc: 170383, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  // spear: SR 168390 "4 spears (1/2" base)" = 60 g (the build doesn't read the plural)
  { id: 'asparagus', name: 'Asparagus', aliases: ['asparagus spears', 'cooked asparagus', 'steamed asparagus', 'roasted asparagus', 'grilled asparagus'], category: 'vegetables', fdc: 168390, serving: { qty: 1, unit: 'cup' }, state: 'cooked', units: { spear: 15 } },
  { id: 'asparagus-raw', name: 'Asparagus, raw', aliases: ['raw asparagus'], category: 'vegetables', fdc: 168389, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'green-beans', name: 'Green beans', aliases: ['string beans', 'snap beans', 'haricots verts', 'cooked green beans', 'steamed green beans', 'frozen green beans'], category: 'vegetables', fdc: 169141, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'green-beans-raw', name: 'Green beans, raw', aliases: ['raw green beans', 'fresh green beans'], category: 'vegetables', fdc: 169961, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'peas', name: 'Peas', aliases: ['green peas', 'sweet peas', 'garden peas', 'english peas', 'frozen peas', 'cooked peas'], category: 'vegetables', fdc: 170420, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'peas-raw', name: 'Peas, raw', aliases: ['raw peas', 'fresh peas'], category: 'vegetables', fdc: 170419, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  // Snow peas and sugar snaps are both USDA's "edible-podded" peas
  { id: 'snap-peas', name: 'Snap peas', aliases: ['sugar snap peas', 'sugar snaps', 'snow peas', 'snowpeas', 'pea pods', 'mangetout'], category: 'vegetables', fdc: 170010, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'snap-peas-cooked', name: 'Snap peas, cooked', aliases: ['cooked snap peas', 'cooked snow peas', 'stir fried snow peas'], category: 'vegetables', fdc: 170011, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // Serving 1 ear (103 g, about 2/3 cup of kernels): covers both "corn on the cob" and a side of kernels
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'corn', name: 'Corn', aliases: ['sweet corn', 'corn kernels', 'corn on the cob', 'ear of corn', 'corn cob', 'boiled corn', 'frozen corn', 'yellow corn'], category: 'vegetables', fdc: 169999, serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'corn-canned', name: 'Corn, canned', aliases: ['canned corn', 'whole kernel corn'], category: 'vegetables', fdc: 169214, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'artichoke', name: 'Artichoke', aliases: ['globe artichoke', 'steamed artichoke', 'boiled artichoke'], category: 'vegetables', fdc: 168386, portionsFrom: [2709766], serving: { qty: 1, unit: 'each' }, state: 'cooked' },
  { id: 'artichoke-hearts', name: 'Artichoke hearts', aliases: ['canned artichoke hearts', 'frozen artichoke hearts'], category: 'vegetables', fdc: 168388, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'celery', name: 'Celery', aliases: ['celery stalk', 'celery sticks', 'celery ribs'], category: 'vegetables', fdc: 169988, serving: { qty: 1, unit: 'stalk' } },
  { id: 'okra', name: 'Okra', aliases: ['cooked okra', 'ladies fingers', 'bhindi'], category: 'vegetables', fdc: 169261, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'okra-raw', name: 'Okra, raw', aliases: ['raw okra'], category: 'vegetables', fdc: 169260, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'fennel', name: 'Fennel', aliases: ['fennel bulb', 'finocchio', 'anise bulb'], category: 'vegetables', fdc: 169385, portionsFrom: [2709779], serving: { qty: 1, unit: 'cup' } },
  { id: 'leeks', name: 'Leeks', aliases: ['raw leeks'], category: 'vegetables', fdc: 169246, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'leeks-cooked', name: 'Leeks, cooked', aliases: ['cooked leeks', 'sauteed leeks'], category: 'vegetables', fdc: 168426, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'bean-sprouts', name: 'Bean sprouts', aliases: ['mung bean sprouts', 'beansprouts'], category: 'vegetables', fdc: 169957, serving: { qty: 1, unit: 'cup' } },
  { id: 'alfalfa-sprouts', name: 'Alfalfa sprouts', aliases: ['alfalfa'], category: 'vegetables', fdc: 168384, serving: { qty: 1, unit: 'cup' } },

  // Fruiting veg
  // tomato each/cup: the build reads SR's "1 cherry" (17 g) as one tomato and "1 cup cherry tomatoes" (149 g) as the cup;
  // set to SR 170457's own "1 medium whole (2-3/5" dia)" = 123 g and "1 cup, chopped or sliced" = 180 g
  { id: 'tomato', name: 'Tomato', aliases: ['tomatoes', 'fresh tomato', 'roma tomato', 'plum tomato', 'beefsteak tomato', 'vine tomato', 'sliced tomato', 'tomato slices'], category: 'vegetables', fdc: 170457, serving: { qty: 1, unit: 'medium' }, units: { each: 123, cup: 180 } },
  // Foundation grape tomatoes (has its own "1 tomato" and cup); stands in for cherry tomatoes too
  { id: 'tomatoes-cherry', name: 'Tomatoes, cherry', aliases: ['cherry tomatoes', 'grape tomatoes'], category: 'vegetables', fdc: 321360, serving: { qty: 1, unit: 'cup' } },
  { id: 'tomatoes-canned', name: 'Tomatoes, canned', aliases: ['canned tomatoes', 'diced tomatoes', 'canned diced tomatoes', 'whole peeled tomatoes'], category: 'vegetables', fdc: 170051, serving: { qty: 0.5, unit: 'cup' } },
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'tomato-paste', name: 'Tomato paste', aliases: [], category: 'vegetables', fdc: 170459, serving: { qty: 1, unit: 'tbsp' } },
  // kcal below 4P+4C+9F: USDA's specific Atwater factors (low for this food's carbs/fiber); 4P+4(C-fiber)+9F fits
  { id: 'sun-dried-tomatoes', name: 'Sun-dried tomatoes', aliases: ['sundried tomatoes'], category: 'vegetables', fdc: 168567, serving: { qty: 0.25, unit: 'cup' } },
  // Serving 1/2 cup sliced: cucumber is eaten in slices; "a cucumber" is 1 each (SR's 8-1/4" cucumber)
  { id: 'cucumber', name: 'Cucumber', aliases: ['english cucumber', 'persian cucumber', 'cucumber slices', 'sliced cucumber', 'cukes'], category: 'vegetables', fdc: 168409, portionsFrom: [2709784], serving: { qty: 0.5, unit: 'cup' } },
  // "bell pepper" alone → red, the most bought colour
  { id: 'bell-pepper-red', name: 'Bell pepper, red', aliases: ['bell pepper', 'red pepper', 'red bell pepper', 'sweet pepper', 'capsicum', 'red capsicum'], category: 'vegetables', fdc: 170108, portionsFrom: [2709801], serving: { qty: 1, unit: 'medium' } },
  { id: 'bell-pepper-green', name: 'Bell pepper, green', aliases: ['green pepper', 'green bell pepper', 'green capsicum'], category: 'vegetables', fdc: 170427, portionsFrom: [2709800], serving: { qty: 1, unit: 'medium' } },
  // SR only weighs a large yellow pepper (186 g); medium/each use the red pepper's SR 170108 "1 medium" = 119 g
  { id: 'bell-pepper-yellow', name: 'Bell pepper, yellow', aliases: ['yellow pepper', 'yellow bell pepper', 'orange pepper', 'orange bell pepper'], category: 'vegetables', fdc: 169383, serving: { qty: 1, unit: 'medium' }, units: { each: 119, medium: 119, large: 186 } },
  { id: 'jalapeno', name: 'Jalapeño', aliases: ['jalapeno', 'jalapeno pepper'], category: 'vegetables', fdc: 168576, portionsFrom: [2709798], serving: { qty: 1, unit: 'each' } },
  { id: 'chili-pepper', name: 'Chili pepper', aliases: ['hot pepper', 'chile pepper', 'chili pepper green', 'green chili', 'green chile', 'hot chili pepper'], category: 'vegetables', fdc: 170497, serving: { qty: 1, unit: 'each' } },
  { id: 'eggplant', name: 'Eggplant', aliases: ['aubergine', 'brinjal', 'cooked eggplant', 'roasted eggplant', 'grilled eggplant'], category: 'vegetables', fdc: 169229, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'eggplant-raw', name: 'Eggplant, raw', aliases: ['raw eggplant'], category: 'vegetables', fdc: 169228, portionsFrom: [2709785], serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  // Zucchini = raw ("a zucchini" is a whole raw one); cooked twin below
  { id: 'zucchini', name: 'Zucchini', aliases: ['courgette', 'raw zucchini', 'zucchini squash'], category: 'vegetables', fdc: 169291, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'zucchini-cooked', name: 'Zucchini, cooked', aliases: ['cooked zucchini', 'grilled zucchini', 'sauteed zucchini', 'roasted zucchini', 'steamed zucchini', 'zucchini noodles', 'zoodles'], category: 'vegetables', fdc: 169292, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'yellow-squash', name: 'Yellow squash', aliases: ['summer squash', 'crookneck squash', 'straightneck squash', 'yellow zucchini'], category: 'vegetables', fdc: 168464, portionsFrom: [2709807], serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'yellow-squash-cooked', name: 'Yellow squash, cooked', aliases: ['cooked yellow squash', 'cooked summer squash'], category: 'vegetables', fdc: 168465, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'butternut-squash', name: 'Butternut squash', aliases: ['butternut', 'roasted butternut squash', 'baked butternut squash'], category: 'vegetables', fdc: 169296, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'butternut-squash-raw', name: 'Butternut squash, raw', aliases: ['raw butternut squash'], category: 'vegetables', fdc: 169295, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'acorn-squash', name: 'Acorn squash', aliases: ['baked acorn squash', 'roasted acorn squash'], category: 'vegetables', fdc: 169293, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'spaghetti-squash', name: 'Spaghetti squash', aliases: ['cooked spaghetti squash'], category: 'vegetables', fdc: 169299, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "pumpkin" alone → canned puree, what people cook and bake with
  { id: 'pumpkin-canned', name: 'Pumpkin, canned', aliases: ['pumpkin', 'canned pumpkin', 'pumpkin puree', 'pureed pumpkin'], category: 'vegetables', fdc: 168450, serving: { qty: 0.5, unit: 'cup' } },

  // Roots, bulbs, alliums
  { id: 'carrot', name: 'Carrot', aliases: ['raw carrots', 'carrot sticks', 'shredded carrots', 'grated carrot'], category: 'vegetables', fdc: 170393, serving: { qty: 1, unit: 'medium' }, state: 'raw' },
  { id: 'carrots-cooked', name: 'Carrots, cooked', aliases: ['cooked carrots', 'steamed carrots', 'boiled carrots', 'roasted carrots'], category: 'vegetables', fdc: 170394, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // Serving 3 oz: the bag's label serving (about 8 baby carrots)
  { id: 'baby-carrots', name: 'Baby carrots', aliases: ['mini carrots'], category: 'vegetables', fdc: 168568, serving: { qty: 3, unit: 'oz' } },
  // beets each: SR 169146 "2 beets (2" dia, sphere)" = 100 g
  { id: 'beets', name: 'Beets', aliases: ['beetroot', 'cooked beets', 'boiled beets', 'roasted beets'], category: 'vegetables', fdc: 169146, serving: { qty: 1, unit: 'cup' }, state: 'cooked', units: { each: 50 } },
  // each: SR 169145 "1 beet (2" dia)" = 82 g
  { id: 'beets-raw', name: 'Beets, raw', aliases: ['raw beets', 'raw beetroot'], category: 'vegetables', fdc: 169145, serving: { qty: 1, unit: 'cup' }, state: 'raw', units: { each: 82 } },
  { id: 'radishes', name: 'Radishes', aliases: ['red radishes'], category: 'vegetables', fdc: 169276, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'daikon', name: 'Daikon', aliases: ['daikon radish', 'oriental radish', 'chinese radish', 'white radish', 'mooli'], category: 'vegetables', fdc: 168451, serving: { qty: 1, unit: 'cup' } },
  { id: 'turnips', name: 'Turnips', aliases: ['cooked turnips', 'boiled turnips'], category: 'vegetables', fdc: 170058, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'turnips-raw', name: 'Turnips, raw', aliases: ['raw turnips'], category: 'vegetables', fdc: 170465, serving: { qty: 1, unit: 'medium' }, state: 'raw' },
  { id: 'parsnips', name: 'Parsnips', aliases: ['cooked parsnips', 'roasted parsnips'], category: 'vegetables', fdc: 170009, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  { id: 'parsnips-raw', name: 'Parsnips, raw', aliases: ['raw parsnips'], category: 'vegetables', fdc: 170417, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'jicama', name: 'Jicama', aliases: ['yam bean', 'yambean', 'mexican turnip'], category: 'vegetables', fdc: 170073, serving: { qty: 1, unit: 'cup' } },
  // Serving 1/4 cup chopped: onion is an add-in; "an onion" is 1 each (medium, 110 g)
  { id: 'onion', name: 'Onion', aliases: ['yellow onion', 'white onion', 'brown onion', 'sweet onion', 'vidalia onion', 'spanish onion', 'raw onion', 'chopped onion', 'diced onion'], category: 'vegetables', fdc: 170000, serving: { qty: 0.25, unit: 'cup' }, state: 'raw' },
  { id: 'onion-cooked', name: 'Onion, cooked', aliases: ['cooked onion', 'boiled onion'], category: 'vegetables', fdc: 170001, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'onions-sauteed', name: 'Onions, sauteed', aliases: ['sauteed onions', 'caramelized onions', 'grilled onions'], category: 'vegetables', fdc: 170004, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  // Foundation macros; cup/tbsp/slice/sizes from SR 170000 raw onion (same state)
  { id: 'onion-red', name: 'Onion, red', aliases: ['red onion', 'purple onion'], category: 'vegetables', fdc: 790577, portionsFrom: [170000], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'green-onion', name: 'Green onion', aliases: ['scallion', 'spring onion'], category: 'vegetables', fdc: 170005, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'shallot', name: 'Shallot', aliases: [], category: 'vegetables', fdc: 170499, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'garlic', name: 'Garlic', aliases: ['garlic clove', 'minced garlic', 'fresh garlic'], category: 'vegetables', fdc: 169230, serving: { qty: 1, unit: 'clove' } },
  { id: 'ginger', name: 'Ginger', aliases: ['ginger root', 'fresh ginger', 'grated ginger', 'minced ginger'], category: 'vegetables', fdc: 169231, serving: { qty: 1, unit: 'tsp' } },

  // Mushrooms
  { id: 'mushrooms', name: 'Mushrooms', aliases: ['white mushrooms', 'button mushrooms', 'raw mushrooms', 'sliced mushrooms', 'champignons'], category: 'vegetables', fdc: 169251, serving: { qty: 1, unit: 'cup' }, state: 'raw' },
  { id: 'mushrooms-cooked', name: 'Mushrooms, cooked', aliases: ['cooked mushrooms', 'sauteed mushrooms', 'boiled mushrooms', 'grilled mushrooms'], category: 'vegetables', fdc: 169252, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'mushrooms-cremini', name: 'Mushrooms, cremini', aliases: ['cremini', 'crimini', 'cremini mushrooms', 'crimini mushrooms', 'baby bella', 'baby bella mushrooms', 'brown mushrooms'], category: 'vegetables', fdc: 168434, serving: { qty: 1, unit: 'cup' } },
  // each: SR 169255's own "1 piece whole" = 84 g (one cap)
  { id: 'mushroom-portobello', name: 'Mushroom, portobello', aliases: ['portobello', 'portabella', 'portobello mushroom', 'portabella mushroom', 'portobello cap'], category: 'vegetables', fdc: 169255, serving: { qty: 1, unit: 'each' }, units: { each: 84 } },
  // Cooked: shiitake is rarely eaten raw
  { id: 'mushrooms-shiitake', name: 'Mushrooms, shiitake', aliases: ['shiitake', 'shiitake mushrooms', 'shitake', 'shitake mushrooms'], category: 'vegetables', fdc: 168437, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'mushrooms-oyster', name: 'Mushrooms, oyster', aliases: ['oyster mushrooms'], category: 'vegetables', fdc: 168580, serving: { qty: 1, unit: 'cup' } },
  { id: 'mushrooms-enoki', name: 'Mushrooms, enoki', aliases: ['enoki', 'enoki mushrooms'], category: 'vegetables', fdc: 169382, serving: { qty: 1, unit: 'cup' } },

  // Potatoes and starchy veg
  // "potato"/"potatoes" alone → baked (plain, the most common way it's logged).
  // Sizes: SR 170093's own "1 potato small/medium/large" (the build reads them as plain 'each'); FNDDS's baked medium (285 g) is
  // far above the 148-173 g a "medium potato" usually means, so no FNDDS twin
  { id: 'potato-baked', name: 'Potato, baked', aliases: ['potato', 'potatoes', 'baked potato', 'baked potatoes', 'jacket potato', 'russet potato', 'idaho potato'], category: 'vegetables', fdc: 170093, serving: { qty: 1, unit: 'medium' }, state: 'cooked', units: { small: 138, medium: 173, large: 299 } },
  { id: 'potato-boiled', name: 'Potato, boiled', aliases: ['boiled potato', 'boiled potatoes', 'steamed potatoes', 'new potatoes', 'baby potatoes', 'red potato', 'red potatoes', 'yukon gold', 'yukon gold potatoes', 'gold potatoes'], category: 'vegetables', fdc: 170440, serving: { qty: 1, unit: 'medium' }, state: 'cooked' },
  // FNDDS: SR has no roasted fresh potato; "made with oil" is how they're roasted
  // each: FNDDS's "1 baby potato" (60 g) gets read as one potato; set to the same food's "1 medium" = 170 g
  { id: 'potato-roasted', name: 'Potato, roasted', aliases: ['roasted potato', 'roasted potatoes', 'roast potatoes', 'oven roasted potatoes', 'home fries', 'breakfast potatoes', 'potato wedges'], category: 'vegetables', fdc: 2709406, serving: { qty: 1, unit: 'cup' }, state: 'cooked', units: { each: 170 } },
  // Sizes: SR 170026's own "1 Potato small/medium/large"
  { id: 'potato-raw', name: 'Potato, raw', aliases: ['raw potato', 'raw potatoes', 'uncooked potato'], category: 'vegetables', fdc: 170026, serving: { qty: 1, unit: 'medium' }, state: 'raw', units: { small: 170, medium: 213, large: 369 } },
  { id: 'mashed-potatoes', name: 'Mashed potatoes', aliases: ['mashed potato', 'potato mash', 'mash'], category: 'vegetables', fdc: 168555, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // Home oven fries (restaurant fries go to the estimate path). each: FNDDS 2709460 "1 straight cut" fry = 5 g
  // (the build takes its "1 waffle" fry). Serving 3 oz: between FDA's 70 g reference amount and a medium order
  { id: 'french-fries', name: 'French fries', aliases: ['fries', 'oven fries', 'frozen fries', 'potato fries', 'steak fries'], category: 'vegetables', fdc: 169264, portionsFrom: [2709460], serving: { qty: 3, unit: 'oz' }, state: 'cooked', units: { each: 5 } },
  { id: 'hash-browns', name: 'Hash browns', aliases: ['hashbrown', 'hash brown patty', 'shredded hash browns'], category: 'vegetables', fdc: 170044, portionsFrom: [2709486], serving: { qty: 1, unit: 'patty' }, state: 'cooked' },
  // FNDDS: SR has no oven-baked tots. Serving 3 oz, as for fries (about 10 tots)
  { id: 'tater-tots', name: 'Tater tots', aliases: ['tots', 'potato tots', 'potato puffs'], category: 'vegetables', fdc: 2709515, serving: { qty: 3, unit: 'oz' }, state: 'cooked' },
  { id: 'sweet-potato', name: 'Sweet potato', aliases: ['sweet potatoes', 'baked sweet potato', 'baked sweet potatoes', 'roasted sweet potato', 'roasted sweet potatoes', 'mashed sweet potatoes', 'kumara'], category: 'vegetables', fdc: 168483, portionsFrom: [2709699], serving: { qty: 1, unit: 'medium' }, state: 'cooked' },
  // each/medium: SR 168482's own "1 sweetpotato, 5" long" = 130 g
  { id: 'sweet-potato-raw', name: 'Sweet potato, raw', aliases: ['raw sweet potato', 'raw sweet potatoes'], category: 'vegetables', fdc: 168482, serving: { qty: 1, unit: 'medium' }, state: 'raw', units: { each: 130, medium: 130 } },
  // The true yam (sweet potatoes sold as "yams" in the US are sweet-potato)
  { id: 'yam', name: 'Yam', aliases: ['cooked yam', 'true yam'], category: 'vegetables', fdc: 170072, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "veggies"/"vegetables" alone → frozen mixed vegetables, cooked
  { id: 'mixed-vegetables', name: 'Mixed vegetables', aliases: ['vegetables', 'veggies', 'mixed veggies', 'mixed veg', 'frozen mixed vegetables', 'frozen vegetables', 'vegetable medley'], category: 'vegetables', fdc: 170472, serving: { qty: 1, unit: 'cup' }, state: 'cooked' },

  // Herbs (fresh)
  { id: 'cilantro', name: 'Cilantro', aliases: ['fresh cilantro', 'cilantro leaves', 'coriander leaves', 'chinese parsley'], category: 'vegetables', fdc: 169997, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'parsley', name: 'Parsley', aliases: ['fresh parsley', 'italian parsley', 'flat leaf parsley', 'curly parsley'], category: 'vegetables', fdc: 170416, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'basil', name: 'Basil', aliases: ['fresh basil', 'basil leaves', 'sweet basil'], category: 'vegetables', fdc: 172232, serving: { qty: 1, unit: 'tbsp' } },
  // Named "Mint, fresh": plain "mint" is a breath mint (sweets)
  { id: 'mint', name: 'Mint, fresh', aliases: ['fresh mint', 'mint leaves', 'spearmint'], category: 'vegetables', fdc: 173475, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'dill', name: 'Dill', aliases: ['fresh dill', 'dill weed'], category: 'vegetables', fdc: 172233, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'chives', name: 'Chives', aliases: ['fresh chives', 'chopped chives'], category: 'vegetables', fdc: 169994, serving: { qty: 1, unit: 'tbsp' } },

  // Canned, pickled and other
  // kcal below 4P+4C+9F: USDA's own energy value (specific factors; seaweed protein and carbs are poorly digested)
  // FNDDS dried seaweed (nori/wakame-type); serving 5 g = FNDDS's own default amount for it (no sheet weight in USDA)
  { id: 'seaweed', name: 'Seaweed, dried', aliases: ['nori', 'dried seaweed', 'seaweed sheets', 'nori sheets'], category: 'vegetables', fdc: 2709988, serving: { qty: 5, unit: 'g' } },
  { id: 'water-chestnuts', name: 'Water chestnuts', aliases: ['waterchestnuts', 'canned water chestnuts', 'sliced water chestnuts'], category: 'vegetables', fdc: 170067, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'bamboo-shoots', name: 'Bamboo shoots', aliases: ['canned bamboo shoots'], category: 'vegetables', fdc: 169212, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'hearts-of-palm', name: 'Hearts of palm', aliases: ['palm hearts'], category: 'vegetables', fdc: 168569, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'pickle', name: 'Pickle', aliases: ['dill pickle', 'kosher dill pickle', 'pickle spear', 'gherkin', 'cornichon'], category: 'vegetables', fdc: 168558, portionsFrom: [2710078], serving: { qty: 1, unit: 'medium' } },
  { id: 'pickles-sweet', name: 'Pickles, sweet', aliases: ['sweet pickles', 'bread and butter pickles'], category: 'vegetables', fdc: 169378, portionsFrom: [2710080], serving: { qty: 0.25, unit: 'cup' } },
  // Olives: serving 5 olives
  { id: 'olives-black', name: 'Olives, black', aliases: ['black olives', 'ripe olives', 'sliced black olives'], category: 'vegetables', fdc: 169094, portionsFrom: [2710090], serving: { qty: 5, unit: 'each' } },
  { id: 'olives-green', name: 'Olives, green', aliases: ['green olives', 'manzanilla olives', 'spanish olives', 'stuffed olives', 'pimento stuffed olives', 'castelvetrano olives'], category: 'vegetables', fdc: 169096, portionsFrom: [2710089], serving: { qty: 5, unit: 'each' } },
  { id: 'sauerkraut', name: 'Sauerkraut', aliases: [], category: 'vegetables', fdc: 169279, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'kimchi', name: 'Kimchi', aliases: ['kimchee', 'cabbage kimchi'], category: 'vegetables', fdc: 170392, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'salsa', name: 'Salsa', aliases: ['red salsa', 'salsa roja', 'tomato salsa', 'jarred salsa', 'chunky salsa', 'mild salsa', 'medium salsa', 'hot salsa'], category: 'vegetables', fdc: 174524, portionsFrom: [2709738], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'salsa-verde', name: 'Salsa verde', aliases: ['green salsa', 'tomatillo salsa'], category: 'vegetables', fdc: 171824, portionsFrom: [2709743], serving: { qty: 2, unit: 'tbsp' } },
  // FNDDS: SR has no pico de gallo
  { id: 'pico-de-gallo', name: 'Pico de gallo', aliases: ['pico', 'salsa fresca', 'fresh salsa'], category: 'vegetables', fdc: 2709737, serving: { qty: 0.25, unit: 'cup' } },

  // ======== LEGUMES, NUTS & SEEDS, SWEETENERS, CONDIMENTS & SAUCES ========

  // ---- Legumes & soy (category legumes) ----
  // Beans, lentils, chickpeas and peas default to COOKED (canned and drained counts as cooked); dry
  // variants say so. Serving for cooked legumes is 0.5 cup (the FDA RACC for beans), dry ones 0.25 cup.
  // "beans" alone → black beans: the most logged bean in bowls, burritos and with rice.
  { id: 'black-beans', name: 'Black beans', aliases: ['beans', 'frijoles negros', 'cooked black beans'], category: 'legumes', fdc: 173735, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'black-beans-canned', name: 'Black beans, canned', aliases: ['canned black beans'], category: 'legumes', fdc: 2707363, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'black-beans-dry', name: 'Black beans, dry', aliases: ['dry black beans', 'dried black beans', 'uncooked black beans'], category: 'legumes', fdc: 173734, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'kidney-beans', name: 'Kidney beans', aliases: ['red kidney beans', 'red beans', 'cooked kidney beans'], category: 'legumes', fdc: 175194, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'kidney-beans-canned', name: 'Kidney beans, canned', aliases: ['canned kidney beans', 'canned red kidney beans'], category: 'legumes', fdc: 175243, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'kidney-beans-dry', name: 'Kidney beans, dry', aliases: ['dry kidney beans', 'dried kidney beans'], category: 'legumes', fdc: 173744, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'pinto-beans', name: 'Pinto beans', aliases: ['pintos', 'cooked pinto beans'], category: 'legumes', fdc: 175200, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  // macros: drained solids (174286); its cup and can weights come from the drained-and-rinsed twin 173797
  { id: 'pinto-beans-canned', name: 'Pinto beans, canned', aliases: ['canned pinto beans'], category: 'legumes', fdc: 174286, portionsFrom: [173797], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'pinto-beans-dry', name: 'Pinto beans, dry', aliases: ['dry pinto beans', 'dried pinto beans'], category: 'legumes', fdc: 175199, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'navy-beans', name: 'Navy beans', aliases: ['haricot beans', 'pea beans', 'white navy beans'], category: 'legumes', fdc: 173746, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'great-northern-beans', name: 'Great northern beans', aliases: ['northern beans', 'great northerns'], category: 'legumes', fdc: 175191, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'white-beans', name: 'White beans', aliases: ['cannellini', 'cannellini beans', 'white kidney beans'], category: 'legumes', fdc: 175203, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  // "chickpeas"/"garbanzo beans" → cooked chickpeas
  { id: 'chickpeas', name: 'Chickpeas', aliases: ['garbanzo beans', 'garbanzos', 'chana', 'cooked chickpeas'], category: 'legumes', fdc: 173757, portionsFrom: [2707416], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'chickpeas-canned', name: 'Chickpeas, canned', aliases: ['canned chickpeas', 'canned garbanzo beans'], category: 'legumes', fdc: 173801, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'chickpeas-dry', name: 'Chickpeas, dry', aliases: ['dry chickpeas', 'dried chickpeas', 'dry garbanzo beans'], category: 'legumes', fdc: 173756, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  // "lentils" → cooked lentils (brown/green/red cook to the same numbers)
  { id: 'lentils', name: 'Lentils', aliases: ['cooked lentils', 'brown lentils', 'green lentils', 'red lentils', 'french lentils'], category: 'legumes', fdc: 172421, portionsFrom: [2707425], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'lentils-dry', name: 'Lentils, dry', aliases: ['dry lentils', 'dried lentils', 'uncooked lentils', 'raw lentils'], category: 'legumes', fdc: 172420, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'red-lentils-dry', name: 'Lentils, red, dry', aliases: ['dry red lentils', 'uncooked red lentils', 'masoor dal'], category: 'legumes', fdc: 174284, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'split-peas', name: 'Split peas', aliases: ['yellow split peas', 'green split peas', 'cooked split peas'], category: 'legumes', fdc: 172429, portionsFrom: [2707420], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'split-peas-dry', name: 'Split peas, dry', aliases: ['dry split peas', 'dried split peas'], category: 'legumes', fdc: 172428, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  { id: 'black-eyed-peas', name: 'Black-eyed peas', aliases: ['blackeye peas', 'cowpeas', 'southern peas', 'crowder peas'], category: 'legumes', fdc: 173759, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'lima-beans', name: 'Lima beans', aliases: ['butter beans', 'limas'], category: 'legumes', fdc: 174253, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'mung-beans', name: 'Mung beans', aliases: ['moong beans', 'green gram', 'whole moong'], category: 'legumes', fdc: 174257, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'adzuki-beans', name: 'Adzuki beans', aliases: ['azuki beans', 'aduki beans'], category: 'legumes', fdc: 173728, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'fava-beans', name: 'Fava beans', aliases: ['broad beans', 'faba beans', 'favas'], category: 'legumes', fdc: 173753, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'lupini-beans', name: 'Lupini beans', aliases: ['lupini', 'lupins', 'lupin beans'], category: 'legumes', fdc: 172424, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'soybeans', name: 'Soybeans', aliases: ['soy beans', 'soya beans', 'cooked soybeans'], category: 'legumes', fdc: 174271, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  // "refried beans" = canned traditional (pinto, with lard), as sold
  { id: 'refried-beans', name: 'Refried beans', aliases: ['frijoles refritos', 'refritos'], category: 'legumes', fdc: 172438, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'refried-beans-vegetarian', name: 'Refried beans, vegetarian', aliases: ['vegetarian refried beans', 'vegan refried beans', 'fat free refried beans'], category: 'legumes', fdc: 174296, serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  // "baked beans" = canned with pork in sweet sauce: FNDDS's own default "Baked beans" (2707390) has these exact numbers
  { id: 'baked-beans', name: 'Baked beans', aliases: ['pork and beans', 'canned baked beans'], category: 'legumes', fdc: 173732, portionsFrom: [2707390], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'baked-beans-vegetarian', name: 'Baked beans, vegetarian', aliases: ['vegetarian baked beans', 'vegan baked beans'], category: 'legumes', fdc: 175182, portionsFrom: [2707391], serving: { qty: 0.5, unit: 'cup' }, state: 'cooked' },
  { id: 'hummus', name: 'Hummus', aliases: ['humus', 'houmous', 'hommus'], category: 'legumes', fdc: 321358, portionsFrom: [174289, 2707402], serving: { qty: 2, unit: 'tbsp' } },
  // Edamame: shelled, cooked from frozen; 1 cup of shelled beans (a cup in pods weighs differently)
  { id: 'edamame', name: 'Edamame', aliases: ['shelled edamame', 'edamame beans', 'green soybeans'], category: 'legumes', fdc: 168411, portionsFrom: [2707436], serving: { qty: 1, unit: 'cup' }, state: 'cooked' },
  // "tofu" → firm tofu (the block most people buy): SR 172475 'Tofu, raw, firm, prepared with calcium
  // sulfate' (144 kcal/100 g). SR's nigari firm tofu (172448, 78 kcal) is closer to regular tofu.
  // 3 oz serving = the FDA RACC for tofu
  { id: 'tofu-firm', name: 'Tofu, firm', aliases: ['tofu', 'firm tofu', 'bean curd'], category: 'legumes', fdc: 172475, serving: { qty: 3, unit: 'oz' } },
  // cup: 252 g, the cup weight of firm tofu (SR 172448); USDA gives extra-firm no portion
  { id: 'tofu-extra-firm', name: 'Tofu, extra firm', aliases: ['extra firm tofu', 'super firm tofu'], category: 'legumes', fdc: 174290, serving: { qty: 3, unit: 'oz' }, units: { cup: 252 } },
  { id: 'tofu-soft', name: 'Tofu, soft', aliases: ['soft tofu', 'silken tofu'], category: 'legumes', fdc: 172449, serving: { qty: 3, unit: 'oz' } },
  { id: 'tofu-fried', name: 'Tofu, fried', aliases: ['fried tofu', 'tofu puffs', 'deep fried tofu'], category: 'legumes', fdc: 172451, serving: { qty: 3, unit: 'oz' } },
  { id: 'textured-vegetable-protein', name: 'Textured vegetable protein, dry', aliases: ['tvp', 'textured soy protein', 'dry tvp'], category: 'legumes', fdc: 2707451, serving: { qty: 0.25, unit: 'cup' }, state: 'dry' },
  // natto: 0.25 cup ≈ one small 45 g pack
  { id: 'natto', name: 'Natto', aliases: ['fermented soybeans'], category: 'legumes', fdc: 172443, serving: { qty: 0.25, unit: 'cup' } },
  // Tempeh: SR has no fiber value for it (its real fiber, a few g, is the only number missing); as bought,
  // which is how it's usually weighed. Not included: seitan (USDA only has vital wheat gluten flour 168147).
  { id: 'tempeh', name: 'Tempeh', aliases: [], category: 'legumes', fdc: 174272, serving: { qty: 3, unit: 'oz' }, noFiber: true },

  // ---- Nuts & seeds (category nuts_seeds) ----
  // Serving 1 oz (the FDA RACC for nuts). Every nut and trail mix gets
  // handful: 28 g = 1 oz, the USDA/FDA nut serving (USDA gives no "handful" portion).
  // Raw is the default where nuts are usually eaten raw (almonds, walnuts, pecans…); roasted where
  // they're sold roasted (cashews, pistachios, peanuts). Foundation macros where FF has the nut, with
  // the SR twin's cup weight.
  // "almonds" → raw almonds; "nuts" → mixed nuts
  { id: 'almonds', name: 'Almonds', aliases: ['raw almonds', 'whole almonds', 'natural almonds'], category: 'nuts_seeds', fdc: 2346393, portionsFrom: [170567], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  // piece: 1.2 g, SR 170567 almonds 'almond' (roasting barely changes the weight)
  { id: 'almonds-roasted', name: 'Almonds, roasted', aliases: ['roasted almonds', 'dry roasted almonds', 'salted almonds'], category: 'nuts_seeds', fdc: 323294, serving: { qty: 1, unit: 'oz' }, units: { handful: 28, piece: 1.2 } },
  { id: 'walnuts', name: 'Walnuts', aliases: ['english walnuts', 'walnut halves', 'raw walnuts'], category: 'nuts_seeds', fdc: 2346394, portionsFrom: [170187], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  // piece: 1.5 g, FNDDS 2707494 'Cashews, unroasted' '1 nut'
  { id: 'cashews', name: 'Cashews', aliases: ['cashew nuts', 'roasted cashews', 'salted cashews'], category: 'nuts_seeds', fdc: 170571, serving: { qty: 1, unit: 'oz' }, units: { handful: 28, piece: 1.5 } },
  { id: 'cashews-raw', name: 'Cashews, raw', aliases: ['raw cashews', 'unroasted cashews'], category: 'nuts_seeds', fdc: 2515374, portionsFrom: [2707494], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'pistachios', name: 'Pistachios', aliases: ['pistachio nuts', 'roasted pistachios', 'shelled pistachios'], category: 'nuts_seeds', fdc: 170185, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'pecans', name: 'Pecans', aliases: ['pecan halves', 'raw pecans'], category: 'nuts_seeds', fdc: 2346395, portionsFrom: [170182], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'macadamia-nuts', name: 'Macadamia nuts', aliases: ['macadamia', 'raw macadamias'], category: 'nuts_seeds', fdc: 2515378, portionsFrom: [170178], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'brazil-nuts', name: 'Brazil nuts', aliases: ['brazilnuts'], category: 'nuts_seeds', fdc: 2515373, portionsFrom: [170569], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'hazelnuts', name: 'Hazelnuts', aliases: ['filberts', 'raw hazelnuts'], category: 'nuts_seeds', fdc: 2515375, portionsFrom: [170581], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'pine-nuts', name: 'Pine nuts', aliases: ['pignoli', 'pine kernels', 'pinon nuts'], category: 'nuts_seeds', fdc: 2346392, portionsFrom: [170591], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  // piece: 1.5 g, FNDDS 2707494 cashew '1 nut', a middling nut between a peanut (1 g) and a brazil nut (5 g)
  { id: 'mixed-nuts', name: 'Mixed nuts', aliases: ['nuts', 'nut mix', 'salted mixed nuts'], category: 'nuts_seeds', fdc: 168599, serving: { qty: 1, unit: 'oz' }, units: { handful: 28, piece: 1.5 } },
  { id: 'peanuts', name: 'Peanuts', aliases: ['roasted peanuts', 'dry roasted peanuts', 'salted peanuts'], category: 'nuts_seeds', fdc: 173806, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  // piece: 1 g, SR 173806 dry-roasted peanuts 'peanut'
  { id: 'peanuts-raw', name: 'Peanuts, raw', aliases: ['raw peanuts', 'unroasted peanuts'], category: 'nuts_seeds', fdc: 2515376, portionsFrom: [172430], serving: { qty: 1, unit: 'oz' }, units: { handful: 28, piece: 1 } },
  { id: 'chestnuts', name: 'Chestnuts, roasted', aliases: ['roasted chestnuts', 'chestnuts'], category: 'nuts_seeds', fdc: 170190, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'soy-nuts', name: 'Soy nuts', aliases: ['roasted soybeans', 'soynuts'], category: 'nuts_seeds', fdc: 172441, portionsFrom: [2707433], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'trail-mix', name: 'Trail mix', aliases: ['gorp', 'trail mix with fruit', 'fruit and nut mix'], category: 'nuts_seeds', fdc: 2707576, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'trail-mix-chocolate', name: 'Trail mix with chocolate', aliases: ['chocolate trail mix', 'trail mix with chocolate chips', 'trail mix with m and ms'], category: 'nuts_seeds', fdc: 167969, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  // Nut and seed butters: serving 2 tbsp (FDA RACC). "pb"/"peanut butter" → creamy peanut butter.
  { id: 'peanut-butter', name: 'Peanut butter', aliases: ['pb', 'creamy peanut butter', 'smooth peanut butter', 'natural peanut butter'], category: 'nuts_seeds', fdc: 2262072, portionsFrom: [174294, 2707537], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'peanut-butter-chunky', name: 'Peanut butter, chunky', aliases: ['chunky peanut butter', 'crunchy peanut butter', 'crunchy pb', 'chunky pb'], category: 'nuts_seeds', fdc: 174265, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'almond-butter', name: 'Almond butter', aliases: ['almond nut butter', 'creamy almond butter'], category: 'nuts_seeds', fdc: 2262074, portionsFrom: [168588, 2707533], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'cashew-butter', name: 'Cashew butter', aliases: ['cashew nut butter'], category: 'nuts_seeds', fdc: 170163, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'tahini', name: 'Tahini', aliases: ['tahina', 'sesame paste', 'sesame butter'], category: 'nuts_seeds', fdc: 170189, portionsFrom: [2707587], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'sunflower-seed-butter', name: 'Sunflower seed butter', aliases: ['sunbutter', 'sun butter', 'sunflower butter'], category: 'nuts_seeds', fdc: 170155, serving: { qty: 2, unit: 'tbsp' } },
  // Seeds: serving 1 tbsp (sprinkled on food), except kernels people snack on (1 oz)
  { id: 'chia-seeds', name: 'Chia seeds', aliases: ['chia'], category: 'nuts_seeds', fdc: 170554, portionsFrom: [2707590], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'flaxseed', name: 'Flaxseed', aliases: ['flax', 'flax seeds', 'whole flaxseed', 'linseed'], category: 'nuts_seeds', fdc: 169414, serving: { qty: 1, unit: 'tbsp' } },
  // tbsp 7 g, tsp 2.5 g: SR 169414's own "tbsp, ground" / "tsp, ground" portions (Foundation has none)
  { id: 'flaxseed-ground', name: 'Flaxseed, ground', aliases: ['ground flax', 'ground flaxseed', 'ground flax seeds', 'flaxseed meal', 'flax meal', 'milled flaxseed'], category: 'nuts_seeds', fdc: 2262075, serving: { qty: 1, unit: 'tbsp' }, units: { tbsp: 7, tsp: 2.5 } },
  { id: 'sunflower-seeds', name: 'Sunflower seeds', aliases: ['sunflower kernels', 'sunflower seed kernels', 'shelled sunflower seeds'], category: 'nuts_seeds', fdc: 325524, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'pumpkin-seeds', name: 'Pumpkin seeds', aliases: ['pepitas', 'pumpkin seed kernels', 'raw pumpkin seeds'], category: 'nuts_seeds', fdc: 2515380, portionsFrom: [170556], serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'pumpkin-seeds-roasted', name: 'Pumpkin seeds, roasted', aliases: ['roasted pumpkin seeds', 'roasted pepitas'], category: 'nuts_seeds', fdc: 170557, serving: { qty: 1, unit: 'oz' }, units: { handful: 28 } },
  { id: 'sesame-seeds', name: 'Sesame seeds', aliases: ['sesame', 'toasted sesame seeds'], category: 'nuts_seeds', fdc: 170150, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'hemp-seeds', name: 'Hemp seeds', aliases: ['hemp hearts', 'hulled hemp seeds', 'hemp'], category: 'nuts_seeds', fdc: 170148, serving: { qty: 1, unit: 'tbsp' } },

  // ---- Sweeteners & sweet spreads (category sweets_snacks: they're added sugar, not condiments) ----
  // "sugar" → white granulated; raw/turbinado/cane sugar are the same sucrose numbers (SR 170674
  // turbinado has no fiber value, so it can't be its own entry). Serving 1 tsp (a coffee's worth).
  { id: 'sugar', name: 'Sugar', aliases: ['white sugar', 'granulated sugar', 'table sugar', 'cane sugar', 'raw sugar', 'turbinado sugar'], category: 'sweets_snacks', fdc: 169655, portionsFrom: [2710258], serving: { qty: 1, unit: 'tsp' } },
  { id: 'brown-sugar', name: 'Brown sugar', aliases: ['light brown sugar', 'dark brown sugar'], category: 'sweets_snacks', fdc: 168833, portionsFrom: [2710260], serving: { qty: 1, unit: 'tsp' } },
  { id: 'powdered-sugar', name: 'Powdered sugar', aliases: ['confectioners sugar', 'icing sugar'], category: 'sweets_snacks', fdc: 169656, portionsFrom: [2710259], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'honey', name: 'Honey', aliases: ['raw honey'], category: 'sweets_snacks', fdc: 169640, portionsFrom: [2710281], serving: { qty: 1, unit: 'tbsp' } },
  // Syrups: 2 tbsp (the FDA RACC for syrups: a pour on pancakes). "syrup" alone → pancake (table)
  // syrup, what most people pour; real maple syrup is its own entry.
  { id: 'maple-syrup', name: 'Maple syrup', aliases: ['pure maple syrup', 'real maple syrup'], category: 'sweets_snacks', fdc: 169661, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'pancake-syrup', name: 'Pancake syrup', aliases: ['syrup', 'table syrup', 'waffle syrup'], category: 'sweets_snacks', fdc: 169578, portionsFrom: [2710273], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'pancake-syrup-sugar-free', name: 'Pancake syrup, sugar-free', aliases: ['sugar free syrup', 'sugar free pancake syrup', 'sugar free maple syrup'], category: 'sweets_snacks', fdc: 169878, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'agave', name: 'Agave syrup', aliases: ['agave', 'agave nectar'], category: 'sweets_snacks', fdc: 170277, portionsFrom: [2710282], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'molasses', name: 'Molasses', aliases: ['treacle'], category: 'sweets_snacks', fdc: 168820, portionsFrom: [2710283], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'corn-syrup', name: 'Corn syrup', aliases: ['light corn syrup', 'karo syrup'], category: 'sweets_snacks', fdc: 168837, portionsFrom: [2710274], serving: { qty: 1, unit: 'tbsp' } },
  // "jam"/"jelly"/"preserves" → one entry: SR jams (278 kcal) and jellies (266) differ by ~4%
  { id: 'jam', name: 'Jam', aliases: ['jelly', 'preserves', 'fruit preserves', 'fruit spread', 'strawberry jam', 'grape jelly', 'raspberry jam', 'jam or jelly'], category: 'sweets_snacks', fdc: 169641, portionsFrom: [2710299], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'marmalade', name: 'Marmalade', aliases: ['orange marmalade'], category: 'sweets_snacks', fdc: 168819, serving: { qty: 1, unit: 'tbsp' } },
  // tbsp: 18.5 g = half of SR 168000's own "2 TBSP" serving (37 g)
  { id: 'chocolate-hazelnut-spread', name: 'Chocolate hazelnut spread', aliases: ['nutella', 'hazelnut spread', 'chocolate spread', 'hazelnut cocoa spread'], category: 'sweets_snacks', fdc: 168000, serving: { qty: 1, unit: 'tbsp' }, units: { tbsp: 18.5 } },
  { id: 'chocolate-syrup', name: 'Chocolate syrup', aliases: ['chocolate sauce', 'chocolate topping'], category: 'sweets_snacks', fdc: 174117, portionsFrom: [2710276], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'caramel-sauce', name: 'Caramel sauce', aliases: ['caramel topping', 'butterscotch sauce', 'butterscotch topping'], category: 'sweets_snacks', fdc: 168841, serving: { qty: 1, unit: 'tbsp' } },

  // ---- Condiments, dressings & sauces (category other) ----
  // Serving 1 tbsp unless the FDA RACC says otherwise: mustard, hot sauce, horseradish, wasabi 1 tsp;
  // dressings 2 tbsp; pesto 2 tbsp; pasta sauce 0.5 cup; tomato/pizza/enchilada/alfredo sauce and gravy 0.25 cup.
  { id: 'ketchup', name: 'Ketchup', aliases: ['catsup', 'tomato ketchup'], category: 'other', fdc: 168556, portionsFrom: [2709733], serving: { qty: 1, unit: 'tbsp' } },
  // "mustard" → yellow; dijon and brown mustard are within a few kcal per tsp, so they alias here
  { id: 'mustard', name: 'Mustard', aliases: ['yellow mustard', 'prepared mustard', 'american mustard', 'dijon mustard', 'dijon', 'brown mustard', 'spicy brown mustard'], category: 'other', fdc: 326698, portionsFrom: [2710085], serving: { qty: 1, unit: 'tsp' } },
  { id: 'bbq-sauce', name: 'BBQ sauce', aliases: ['barbecue sauce', 'barbeque sauce', 'bbq'], category: 'other', fdc: 174523, portionsFrom: [2709750], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'soy-sauce', name: 'Soy sauce', aliases: ['shoyu', 'tamari'], category: 'other', fdc: 174277, portionsFrom: [2707442], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'soy-sauce-low-sodium', name: 'Soy sauce, low sodium', aliases: ['low sodium soy sauce', 'reduced sodium soy sauce', 'lite soy sauce'], category: 'other', fdc: 172473, portionsFrom: [2707443], serving: { qty: 1, unit: 'tbsp' } },
  // "hot sauce" → Louisiana-style pepper sauce
  { id: 'hot-sauce', name: 'Hot sauce', aliases: ['hot pepper sauce', 'tabasco', 'louisiana hot sauce', 'pepper sauce'], category: 'other', fdc: 174527, portionsFrom: [2710093], serving: { qty: 1, unit: 'tsp' } },
  { id: 'sriracha', name: 'Sriracha', aliases: ['sriracha sauce', 'rooster sauce'], category: 'other', fdc: 171186, serving: { qty: 1, unit: 'tsp' } },
  { id: 'buffalo-sauce', name: 'Buffalo sauce', aliases: ['buffalo wing sauce', 'wing sauce'], category: 'other', fdc: 2709751, serving: { qty: 1, unit: 'tbsp' } },
  // "dressing"/"salad dressing" → ranch, the most-used US salad dressing
  { id: 'ranch-dressing', name: 'Ranch dressing', aliases: ['ranch', 'dressing', 'salad dressing', 'ranch dip'], category: 'other', fdc: 173592, portionsFrom: [2710212], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'ranch-dressing-light', name: 'Ranch dressing, light', aliases: ['light ranch', 'lite ranch', 'reduced fat ranch'], category: 'other', fdc: 173593, portionsFrom: [2710225], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'caesar-dressing', name: 'Caesar dressing', aliases: ['caesar salad dressing'], category: 'other', fdc: 169055, portionsFrom: [2710199], serving: { qty: 2, unit: 'tbsp' } },
  // vinaigrettes (balsamic, red wine) alias to Italian: oil-and-vinegar dressing with near-identical numbers;
  // USDA has no plain balsamic vinaigrette
  { id: 'italian-dressing', name: 'Italian dressing', aliases: ['vinaigrette', 'balsamic vinaigrette', 'red wine vinaigrette', 'oil and vinegar dressing', 'house vinaigrette'], category: 'other', fdc: 171019, portionsFrom: [2710203], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'italian-dressing-light', name: 'Italian dressing, light', aliases: ['light italian dressing', 'lite italian dressing', 'light vinaigrette'], category: 'other', fdc: 2710224, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'blue-cheese-dressing', name: 'Blue cheese dressing', aliases: ['bleu cheese dressing', 'roquefort dressing'], category: 'other', fdc: 173562, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'thousand-island-dressing', name: 'Thousand island dressing', aliases: ['thousand island', '1000 island'], category: 'other', fdc: 171402, portionsFrom: [2710213], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'honey-mustard-dressing', name: 'Honey mustard dressing', aliases: ['honey mustard', 'honey mustard sauce'], category: 'other', fdc: 171043, portionsFrom: [2710202], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'french-dressing', name: 'French dressing', aliases: ['catalina dressing'], category: 'other', fdc: 171414, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'sesame-dressing', name: 'Sesame dressing', aliases: ['asian sesame dressing', 'sesame ginger dressing'], category: 'other', fdc: 171006, portionsFrom: [2710211], serving: { qty: 2, unit: 'tbsp' } },
  // Vinegars: their few kcal are acetic acid, which isn't protein/carbs/fat, so 4P+4C+9F reads ~0.
  // Balsamic is missing: SR 172241 has no fiber value, so build.ts rejects it.
  { id: 'vinegar', name: 'Vinegar', aliases: ['white vinegar', 'distilled vinegar'], category: 'other', fdc: 172237, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'apple-cider-vinegar', name: 'Apple cider vinegar', aliases: ['acv', 'cider vinegar'], category: 'other', fdc: 173469, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'red-wine-vinegar', name: 'Red wine vinegar', aliases: ['wine vinegar'], category: 'other', fdc: 172240, serving: { qty: 1, unit: 'tbsp' } },
  // Balsamic: SR has no fiber value; its carbs are grape sugars, so 0 is right
  { id: 'balsamic-vinegar', name: 'Balsamic vinegar', aliases: ['balsamic'], category: 'other', fdc: 172241, serving: { qty: 1, unit: 'tbsp' }, noFiber: true },
  { id: 'teriyaki-sauce', name: 'Teriyaki sauce', aliases: ['teriyaki', 'teriyaki marinade'], category: 'other', fdc: 171167, portionsFrom: [2707445], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'hoisin-sauce', name: 'Hoisin sauce', aliases: ['hoisin'], category: 'other', fdc: 172886, portionsFrom: [2707441], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'fish-sauce', name: 'Fish sauce', aliases: ['nam pla', 'nuoc mam'], category: 'other', fdc: 174531, portionsFrom: [2706457], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'oyster-sauce', name: 'Oyster sauce', aliases: [], category: 'other', fdc: 174529, portionsFrom: [2707150], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'worcestershire-sauce', name: 'Worcestershire sauce', aliases: ['worcestershire', 'worcester sauce'], category: 'other', fdc: 171610, portionsFrom: [2707447], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'sweet-and-sour-sauce', name: 'Sweet and sour sauce', aliases: ['sweet n sour sauce', 'sweet and sour'], category: 'other', fdc: 174066, portionsFrom: [2710296], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'tartar-sauce', name: 'Tartar sauce', aliases: ['tartare sauce'], category: 'other', fdc: 171826, portionsFrom: [2710173], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'cocktail-sauce', name: 'Cocktail sauce', aliases: ['seafood sauce', 'shrimp cocktail sauce'], category: 'other', fdc: 174067, portionsFrom: [2709753], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'steak-sauce', name: 'Steak sauce', aliases: ['a1', 'a1 sauce', 'a 1 sauce'], category: 'other', fdc: 171825, serving: { qty: 1, unit: 'tbsp' } },
  { id: 'pickle-relish', name: 'Pickle relish', aliases: ['relish', 'sweet relish', 'sweet pickle relish'], category: 'other', fdc: 168561, portionsFrom: [2710079], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'horseradish', name: 'Horseradish', aliases: ['prepared horseradish'], category: 'other', fdc: 173472, portionsFrom: [2710083], serving: { qty: 1, unit: 'tsp' } },
  { id: 'horseradish-sauce', name: 'Horseradish sauce', aliases: ['creamy horseradish', 'creamy horseradish sauce'], category: 'other', fdc: 171833, portionsFrom: [2710174], serving: { qty: 1, unit: 'tbsp' } },
  { id: 'wasabi', name: 'Wasabi', aliases: ['wasabi paste'], category: 'other', fdc: 2710103, serving: { qty: 1, unit: 'tsp' } },
  { id: 'peanut-sauce', name: 'Peanut sauce', aliases: ['satay sauce', 'thai peanut sauce'], category: 'other', fdc: 174070, portionsFrom: [2707546], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'pesto', name: 'Pesto', aliases: ['basil pesto', 'pesto sauce'], category: 'other', fdc: 171579, portionsFrom: [2710175], serving: { qty: 2, unit: 'tbsp' } },
  { id: 'alfredo-sauce', name: 'Alfredo sauce', aliases: ['alfredo', 'white pasta sauce'], category: 'other', fdc: 2705809, serving: { qty: 0.25, unit: 'cup' } },
  // marinara: Foundation macros; cup from the FNDDS twin "Spaghetti sauce" (FF only has a 1/2-cup serving)
  { id: 'marinara-sauce', name: 'Marinara sauce', aliases: ['marinara', 'pasta sauce', 'spaghetti sauce', 'red sauce', 'tomato basil sauce'], category: 'other', fdc: 332282, portionsFrom: [2709745], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'tomato-sauce', name: 'Tomato sauce', aliases: ['canned tomato sauce'], category: 'other', fdc: 170054, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'pizza-sauce', name: 'Pizza sauce', aliases: [], category: 'other', fdc: 172880, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'enchilada-sauce', name: 'Enchilada sauce', aliases: ['red enchilada sauce'], category: 'other', fdc: 174074, serving: { qty: 0.25, unit: 'cup' } },
  // "gravy" → brown (beef) gravy, FNDDS's own "Gravy, NFS"
  { id: 'gravy', name: 'Gravy', aliases: ['brown gravy', 'beef gravy'], category: 'other', fdc: 2707149, serving: { qty: 0.25, unit: 'cup' } },
  { id: 'chicken-gravy', name: 'Chicken gravy', aliases: ['turkey gravy', 'poultry gravy'], category: 'other', fdc: 171566, portionsFrom: [2707144], serving: { qty: 0.25, unit: 'cup' } },
  { id: 'guacamole', name: 'Guacamole', aliases: ['guac', 'avocado dip'], category: 'other', fdc: 2709307, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'tzatziki', name: 'Tzatziki', aliases: ['tzatziki sauce', 'tzatziki dip'], category: 'other', fdc: 2705448, serving: { qty: 2, unit: 'tbsp' } },
  { id: 'miso', name: 'Miso', aliases: ['miso paste', 'white miso', 'red miso'], category: 'other', fdc: 172442, serving: { qty: 1, unit: 'tbsp' } },
  // cocoa: USDA's 228 kcal uses cocoa's own low Atwater factors and 37 g fiber, so 4P+4C+9F (433) overshoots
  { id: 'cocoa-powder', name: 'Cocoa powder', aliases: ['unsweetened cocoa powder', 'unsweetened cocoa', 'baking cocoa', 'cacao powder'], category: 'other', fdc: 169593, serving: { qty: 1, unit: 'tbsp' } },

  // ======== SNACKS, SWEETS & DRINKS ========

  // ---- Salty snacks ----
  // "chips" → plain potato chips (the US meaning; tortilla chips have their own entry).
  // each: 2 g, FNDDS "Potato chips, plain" '1 chip'; packet: 28 g, its 'small single serving bag' (both ignored by unitsOf).
  { id: 'potato-chips', name: 'Potato chips', aliases: ['chips', 'crisps', 'potato crisps', 'plain chips', 'salted chips', 'kettle chips', 'kettle cooked chips'], category: 'sweets_snacks', fdc: 169677, portionsFrom: [2709422], serving: { qty: 1, unit: 'oz' }, units: { each: 2, packet: 28 } },
  // each/packet: as potato-chips, from this food's FNDDS twin
  { id: 'potato-chips-bbq', name: 'Potato chips, barbecue', aliases: ['bbq chips', 'barbecue chips', 'bbq potato chips', 'barbecue potato chips'], category: 'sweets_snacks', fdc: 167962, portionsFrom: [2709423], serving: { qty: 1, unit: 'oz' }, units: { each: 2, packet: 28 } },
  { id: 'potato-chips-sour-cream-onion', name: 'Potato chips, sour cream and onion', aliases: ['sour cream and onion chips', 'sour cream onion chips', 'sour cream and onion potato chips'], category: 'sweets_snacks', fdc: 167963, portionsFrom: [2709424], serving: { qty: 1, unit: 'oz' }, units: { each: 2, packet: 28 } },
  { id: 'potato-chips-baked', name: 'Potato chips, baked', aliases: ['baked chips', 'baked potato chips', 'baked crisps'], category: 'sweets_snacks', fdc: 169046, portionsFrom: [2709434], serving: { qty: 1, unit: 'oz' }, units: { each: 2, packet: 28 } },
  { id: 'potato-chips-reduced-fat', name: 'Potato chips, reduced fat', aliases: ['reduced fat chips', 'light chips', 'reduced fat potato chips'], category: 'sweets_snacks', fdc: 169683, portionsFrom: [2709436], serving: { qty: 1, unit: 'oz' }, units: { each: 2, packet: 28 } },
  // each: 3 g, FNDDS "Tortilla chips, plain" '1 chip'; packet: 28 g, its 'small single serving bag'
  { id: 'tortilla-chips', name: 'Tortilla chips', aliases: ['corn tortilla chips', 'nacho chips', 'restaurant style tortilla chips'], category: 'sweets_snacks', fdc: 167558, portionsFrom: [2708202], serving: { qty: 1, unit: 'oz' }, units: { each: 3, packet: 28 } },
  // "doritos": generic stand-in for nacho cheese tortilla chips; portions from FNDDS "Tortilla chips, nacho cheese flavor (Doritos)"
  { id: 'tortilla-chips-nacho-cheese', name: 'Tortilla chips, nacho cheese', aliases: ['nacho cheese chips', 'nacho cheese tortilla chips', 'doritos', 'cheese tortilla chips'], category: 'sweets_snacks', fdc: 167559, portionsFrom: [2708206], serving: { qty: 1, unit: 'oz' }, units: { each: 3, packet: 28 } },
  // "fritos": generic stand-in for plain corn chips
  { id: 'corn-chips', name: 'Corn chips', aliases: ['fritos', 'corn chip snacks'], category: 'sweets_snacks', fdc: 167537, portionsFrom: [2708196], serving: { qty: 1, unit: 'oz' } },
  { id: 'pita-chips', name: 'Pita chips', aliases: ['baked pita chips'], category: 'sweets_snacks', fdc: 173147, portionsFrom: [2708215], serving: { qty: 1, unit: 'oz' } },
  { id: 'pretzels', name: 'Pretzels', aliases: ['hard pretzels', 'pretzel twists', 'pretzel sticks', 'pretzel rods', 'mini pretzels'], category: 'sweets_snacks', fdc: 167555, portionsFrom: [2708249], serving: { qty: 1, unit: 'oz' } },
  { id: 'soft-pretzel', name: 'Soft pretzel', aliases: ['big pretzel', 'bavarian pretzel', 'mall pretzel', 'pretzel bites'], category: 'sweets_snacks', fdc: 169064, portionsFrom: [2708268], serving: { qty: 1, unit: 'medium' } },
  // "cheetos": generic stand-in for cheese puffs; portions from FNDDS "Cheese flavored corn snacks (Cheetos)"
  { id: 'cheese-puffs', name: 'Cheese puffs', aliases: ['cheese curls', 'cheese doodles', 'cheetos', 'cheese balls'], category: 'sweets_snacks', fdc: 167949, portionsFrom: [2708203], serving: { qty: 1, unit: 'oz' } },
  { id: 'pork-rinds', name: 'Pork rinds', aliases: ['pork skins', 'chicharrones', 'chicharron', 'pork cracklings'], category: 'sweets_snacks', fdc: 167961, portionsFrom: [2705902], serving: { qty: 1, unit: 'oz' } },

  // ---- Chocolate & candy ----
  // "chocolate" → milk chocolate: USDA's own generic "Chocolate candy, NFS" uses milk chocolate numbers.
  // "candy bar" → milk chocolate too (closest generic; filled bars like Snickers are brands → AI estimate).
  { id: 'milk-chocolate', name: 'Milk chocolate', aliases: ['chocolate', 'chocolate bar', 'milk chocolate bar', 'candy bar', 'chocolate candy', 'hershey bar'], category: 'sweets_snacks', fdc: 167587, portionsFrom: [2710328], serving: { qty: 1, unit: 'oz' } },
  { id: 'dark-chocolate', name: 'Dark chocolate', aliases: ['dark chocolate bar', '70 dark chocolate', '85 dark chocolate', '72 dark chocolate', 'bittersweet chocolate', 'extra dark chocolate'], category: 'sweets_snacks', fdc: 170273, portionsFrom: [2710336], serving: { qty: 1, unit: 'oz' } },
  { id: 'dark-chocolate-60', name: 'Dark chocolate, 60-69%', aliases: ['60 dark chocolate', '65 dark chocolate', 'semi dark chocolate'], category: 'sweets_snacks', fdc: 170272, portionsFrom: [2710336], serving: { qty: 1, unit: 'oz' } },
  { id: 'white-chocolate', name: 'White chocolate', aliases: ['white chocolate bar', 'white chocolate chips'], category: 'sweets_snacks', fdc: 167571, portionsFrom: [2710339], serving: { qty: 1, unit: 'oz' } },
  { id: 'chocolate-chips', name: 'Chocolate chips', aliases: ['semisweet chocolate chips', 'semi sweet chocolate chips', 'semisweet chocolate', 'chocolate morsels', 'baking chips'], category: 'sweets_snacks', fdc: 167976, portionsFrom: [2710333], serving: { qty: 1, unit: 'tbsp' } },
  // "candy" → USDA's generic "Candy, NFS"
  { id: 'candy', name: 'Candy', aliases: ['sweets'], category: 'sweets_snacks', fdc: 2710325, serving: { qty: 1, unit: 'oz' } },
  // macros: SR gumdrops (starch jelly pieces, same values as FNDDS "Candy, gummy"); portions from FNDDS "Candy, gummy"
  { id: 'gummy-candy', name: 'Gummy candy', aliases: ['gummies', 'gummy bears', 'gummy worms', 'gumdrops', 'gummi bears', 'sour gummies'], category: 'sweets_snacks', fdc: 167989, portionsFrom: [2710359], serving: { qty: 1, unit: 'oz' } },
  { id: 'hard-candy', name: 'Hard candy', aliases: ['mints', 'peppermints', 'breath mints', 'candy cane', 'butterscotch candy', 'jolly ranchers'], category: 'sweets_snacks', fdc: 167990, portionsFrom: [2710360], serving: { qty: 1, unit: 'piece' } },
  { id: 'lollipop', name: 'Lollipop', aliases: ['sucker', 'lolly'], category: 'sweets_snacks', fdc: 2710361, serving: { qty: 1, unit: 'piece' } },
  { id: 'jelly-beans', name: 'Jelly beans', aliases: ['jellybeans', 'jelly bean candy'], category: 'sweets_snacks', fdc: 167991, serving: { qty: 1, unit: 'oz' } },
  { id: 'licorice', name: 'Licorice', aliases: ['red licorice', 'black licorice', 'liquorice', 'twizzlers', 'red vines'], category: 'sweets_snacks', fdc: 2710352, serving: { qty: 1, unit: 'oz' } },
  { id: 'marshmallows', name: 'Marshmallows', aliases: ['mini marshmallows', 'jumbo marshmallows'], category: 'sweets_snacks', fdc: 167995, portionsFrom: [2710353], serving: { qty: 1, unit: 'oz' } },
  { id: 'caramel-candy', name: 'Caramel candy', aliases: ['caramels', 'caramel chews', 'chewy caramels'], category: 'sweets_snacks', fdc: 167974, portionsFrom: [2710354], serving: { qty: 1, unit: 'piece' } },
  { id: 'fudge', name: 'Fudge', aliases: ['chocolate fudge'], category: 'sweets_snacks', fdc: 167987, portionsFrom: [2710340], serving: { qty: 1, unit: 'piece' } },
  // macros: SR fruit leather pieces (= fruit snacks); portions also from FNDDS "Candy, fruit snacks"
  { id: 'fruit-snacks', name: 'Fruit snacks', aliases: ['fruit gummies', 'fruit snack pouch', 'gushers', 'welchs fruit snacks'], category: 'sweets_snacks', fdc: 167540, portionsFrom: [2710367], serving: { qty: 1, unit: 'packet' } },
  // each: 14 g, SR "Snacks, fruit leather, rolls" '1 small' (the standard roll)
  { id: 'fruit-leather', name: 'Fruit leather', aliases: ['fruit roll up', 'fruit rollup', 'fruit by the foot'], category: 'sweets_snacks', fdc: 167541, serving: { qty: 1, unit: 'each' }, units: { each: 14 } },

  // ---- Frozen desserts ----
  // "ice cream" → vanilla. Servings 1/2 cup: the long-standing US label size.
  { id: 'ice-cream-vanilla', name: 'Ice cream, vanilla', aliases: ['ice cream', 'vanilla ice cream', 'french vanilla ice cream'], category: 'sweets_snacks', fdc: 167575, portionsFrom: [2705630], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'ice-cream-chocolate', name: 'Ice cream, chocolate', aliases: ['chocolate ice cream'], category: 'sweets_snacks', fdc: 168809, portionsFrom: [2705632], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'ice-cream-strawberry', name: 'Ice cream, strawberry', aliases: ['strawberry ice cream'], category: 'sweets_snacks', fdc: 168810, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'ice-cream-light', name: 'Ice cream, light', aliases: ['light ice cream', 'low fat ice cream', 'reduced fat ice cream', 'lite ice cream'], category: 'sweets_snacks', fdc: 167572, portionsFrom: [2705665], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'soft-serve', name: 'Soft serve ice cream', aliases: ['soft serve', 'soft serve vanilla', 'soft ice cream', 'ice cream cone soft serve'], category: 'sweets_snacks', fdc: 2705634, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'frozen-yogurt', name: 'Frozen yogurt', aliases: ['froyo', 'fro yo', 'frozen yoghurt', 'vanilla frozen yogurt'], category: 'sweets_snacks', fdc: 168105, portionsFrom: [2705452], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'sherbet', name: 'Sherbet', aliases: ['sherbert', 'orange sherbet', 'rainbow sherbet'], category: 'sweets_snacks', fdc: 167577, portionsFrom: [2705677], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'sorbet', name: 'Sorbet', aliases: ['fruit sorbet', 'mango sorbet', 'lemon sorbet'], category: 'sweets_snacks', fdc: 2709314, serving: { qty: 0.5, unit: 'cup' } },
  { id: 'italian-ice', name: 'Italian ice', aliases: ['water ice', 'shaved ice', 'snow cone'], category: 'sweets_snacks', fdc: 2710317, serving: { qty: 0.5, unit: 'cup' } },
  // each: 50 g, FNDDS "Popsicle" 'single stick' (ignored by unitsOf)
  { id: 'ice-pop', name: 'Ice pop', aliases: ['popsicle', 'ice lolly', 'freezer pop', 'freeze pop'], category: 'sweets_snacks', fdc: 2710320, serving: { qty: 1, unit: 'each' }, units: { each: 50 } },
  { id: 'frozen-fruit-bar', name: 'Frozen fruit bar', aliases: ['fruit bar frozen', 'fruit popsicle', 'frozen juice bar', 'fruit juice bar'], category: 'sweets_snacks', fdc: 169632, portionsFrom: [2709312], serving: { qty: 1, unit: 'bar' } },
  { id: 'ice-cream-bar', name: 'Ice cream bar', aliases: ['chocolate covered ice cream bar', 'chocolate coated ice cream bar', 'klondike bar'], category: 'sweets_snacks', fdc: 2705639, serving: { qty: 1, unit: 'bar' } },
  // each: 75 g, FNDDS "Ice cream sandwich, vanilla" '1 sandwich' (sandwich wordings are skipped by unitsOf)
  { id: 'ice-cream-sandwich', name: 'Ice cream sandwich', aliases: ['vanilla ice cream sandwich'], category: 'sweets_snacks', fdc: 2705642, serving: { qty: 1, unit: 'each' }, units: { each: 75 } },

  // ---- Pudding & gelatin ----
  // "pudding" → chocolate: the best-selling pudding cup flavour
  { id: 'pudding-chocolate', name: 'Pudding, chocolate', aliases: ['pudding', 'pudding cup', 'chocolate pudding', 'chocolate pudding cup'], category: 'sweets_snacks', fdc: 168778, portionsFrom: [2705679], serving: { qty: 1, unit: 'container' } },
  { id: 'pudding-vanilla', name: 'Pudding, vanilla', aliases: ['vanilla pudding', 'vanilla pudding cup', 'banana pudding cup'], category: 'sweets_snacks', fdc: 169608, portionsFrom: [2705692], serving: { qty: 1, unit: 'container' } },
  { id: 'gelatin', name: 'Gelatin dessert', aliases: ['jello', 'jell o', 'jelly dessert', 'gelatin', 'jello cup'], category: 'sweets_snacks', fdc: 169596, portionsFrom: [2710310], serving: { qty: 0.5, unit: 'cup' } },
  { id: 'gelatin-sugar-free', name: 'Gelatin dessert, sugar free', aliases: ['sugar free jello', 'diet jello', 'sugar free gelatin', 'sugar free jello cup'], category: 'sweets_snacks', fdc: 169598, portionsFrom: [2710313], serving: { qty: 0.5, unit: 'cup' } },

  // ---- Cookies, cakes & bars ----
  // "cookie"/"cookies" → chocolate chip. each: 30 g, FNDDS "Cookie, chocolate chip" '1 medium' (FNDDS has no plain
  // '1 cookie'; SR's '1 cookie' is a 12.9 g packaged cookie).
  { id: 'cookie-chocolate-chip', name: 'Cookie, chocolate chip', aliases: ['cookie', 'cookies', 'chocolate chip cookie', 'chocolate chip cookies', 'choc chip cookie', 'chips ahoy'], category: 'sweets_snacks', fdc: 172716, portionsFrom: [2707909], serving: { qty: 1, unit: 'each' }, units: { each: 30 } },
  { id: 'cookie-oatmeal-raisin', name: 'Cookie, oatmeal raisin', aliases: ['oatmeal raisin cookie', 'oatmeal raisin cookies', 'oatmeal cookie', 'oatmeal cookies'], category: 'sweets_snacks', fdc: 172725, portionsFrom: [2707946], serving: { qty: 1, unit: 'each' } },
  // SR only: FNDDS "Cookie, butter or sugar" maps its 'Lemon Cooler' wording to each (6 g)
  { id: 'cookie-sugar', name: 'Cookie, sugar', aliases: ['sugar cookie', 'sugar cookies', 'butter cookie', 'butter cookies', 'snickerdoodle'], category: 'sweets_snacks', fdc: 172735, serving: { qty: 1, unit: 'each' } },
  { id: 'cookie-peanut-butter', name: 'Cookie, peanut butter', aliases: ['peanut butter cookie', 'peanut butter cookies', 'pb cookie', 'pb cookies'], category: 'sweets_snacks', fdc: 172727, portionsFrom: [2707952], serving: { qty: 1, unit: 'each' } },
  // "oreo": generic stand-in for chocolate sandwich cookies
  { id: 'cookie-sandwich', name: 'Cookie, chocolate sandwich', aliases: ['oreo', 'sandwich cookie', 'sandwich cookies', 'chocolate sandwich cookie', 'chocolate sandwich cookies', 'cream filled cookie', 'cream filled cookies'], category: 'sweets_snacks', fdc: 172718, serving: { qty: 1, unit: 'each' } },
  { id: 'cookie-shortbread', name: 'Cookie, shortbread', aliases: ['shortbread', 'shortbread cookie', 'shortbread cookies', 'scottish shortbread'], category: 'sweets_snacks', fdc: 174967, serving: { qty: 1, unit: 'each' } },
  // SR only: FNDDS "Cookie, fig bar" maps its 'Fig bar (2 square halves)' wording to each (43 g)
  { id: 'fig-bar', name: 'Fig bar', aliases: ['fig newton', 'fig cookie', 'fig cookies'], category: 'sweets_snacks', fdc: 172721, serving: { qty: 1, unit: 'each' } },
  { id: 'vanilla-wafers', name: 'Vanilla wafers', aliases: ['nilla wafers', 'vanilla wafer cookies', 'vanilla wafer cookie'], category: 'sweets_snacks', fdc: 174974, portionsFrom: [2707981], serving: { qty: 1, unit: 'oz' } },
  { id: 'animal-crackers', name: 'Animal crackers', aliases: ['animal cookies', 'animal cookie'], category: 'sweets_snacks', fdc: 168014, portionsFrom: [2707968], serving: { qty: 1, unit: 'oz' } },
  { id: 'brownie', name: 'Brownie', aliases: ['brownies', 'chocolate brownie', 'chocolate brownies', 'fudge brownie', 'fudge brownies'], category: 'sweets_snacks', fdc: 172713, portionsFrom: [2707904], serving: { qty: 1, unit: 'each' } },
  // "cake"/"birthday cake" → yellow cake with chocolate frosting, the classic frosted layer cake.
  // Cakes: each = one piece (SR '1 piece (1/12 of a cake)'), not SR's '1 cake' (~1.7 kg): "a cake" in a log is a slice.
  { id: 'cake-yellow', name: 'Cake, yellow, frosted', aliases: ['cake', 'birthday cake', 'yellow cake', 'vanilla cake', 'frosted cake', 'layer cake'], category: 'sweets_snacks', fdc: 174944, serving: { qty: 1, unit: 'piece' }, units: { each: 144 } },
  { id: 'cake-chocolate', name: 'Cake, chocolate, frosted', aliases: ['chocolate cake', 'chocolate layer cake', 'devils food cake', 'chocolate birthday cake'], category: 'sweets_snacks', fdc: 174934, serving: { qty: 1, unit: 'piece' }, units: { each: 138 } },
  { id: 'cheesecake', name: 'Cheesecake', aliases: ['new york cheesecake', 'plain cheesecake'], category: 'sweets_snacks', fdc: 172711, serving: { qty: 1, unit: 'piece' } },
  // "pie" → apple, the most eaten US pie
  { id: 'pie-apple', name: 'Pie, apple', aliases: ['apple pie', 'pie'], category: 'sweets_snacks', fdc: 175011, portionsFrom: [2707995], serving: { qty: 1, unit: 'piece' } },
  { id: 'granola-bar', name: 'Granola bar', aliases: ['chewy granola bar', 'soft granola bar', 'cereal bar', 'oat bar'], category: 'sweets_snacks', fdc: 167954, serving: { qty: 1, unit: 'bar' } },
  { id: 'granola-bar-chocolate-chip', name: 'Granola bar, chocolate chip', aliases: ['chocolate chip granola bar', 'chewy chocolate chip granola bar', 'quaker chewy'], category: 'sweets_snacks', fdc: 169674, serving: { qty: 1, unit: 'bar' } },
  // "nature valley": generic stand-in for crunchy granola bars
  { id: 'granola-bar-crunchy', name: 'Granola bar, crunchy', aliases: ['crunchy granola bar', 'hard granola bar', 'nature valley', 'nature valley bar', 'oats and honey bar'], category: 'sweets_snacks', fdc: 167542, serving: { qty: 1, unit: 'bar' } },
  // USDA's generic "Nutrition bar or meal replacement bar, NFS" (22 g protein/100 g)
  { id: 'protein-bar', name: 'Protein bar', aliases: ['nutrition bar', 'meal replacement bar', 'high protein bar', 'protein snack bar'], category: 'sweets_snacks', fdc: 2708127, serving: { qty: 1, unit: 'bar' } },

  // ---- Water, coffee & tea ----
  { id: 'water', name: 'Water', aliases: ['tap water', 'bottled water', 'plain water', 'still water', 'h2o', 'drinking water'], category: 'drinks', fdc: 2710707, serving: { qty: 1, unit: 'cup' } },
  // "la croix": generic stand-in for unsweetened flavored sparkling water (also 0 kcal)
  { id: 'sparkling-water', name: 'Sparkling water', aliases: ['seltzer', 'seltzer water', 'club soda', 'soda water', 'carbonated water', 'mineral water', 'fizzy water', 'la croix', 'flavored sparkling water', 'bubly'], category: 'drinks', fdc: 174842, portionsFrom: [2710539], serving: { qty: 1, unit: 'can' } },
  // "coffee" → black brewed coffee
  { id: 'coffee', name: 'Coffee', aliases: ['black coffee', 'brewed coffee', 'drip coffee', 'americano', 'cold brew', 'cold brew coffee', 'decaf', 'decaf coffee', 'filter coffee'], category: 'drinks', fdc: 171890, portionsFrom: [2710375], serving: { qty: 1, unit: 'cup' } },
  // shot: 30 g = FNDDS "Coffee, espresso" 'fl oz' (a single shot is 1 fl oz; its "espresso cup (2 fl oz)" is a double)
  { id: 'espresso', name: 'Espresso', aliases: ['espresso shot', 'double espresso', 'doppio', 'ristretto'], category: 'drinks', fdc: 171891, portionsFrom: [2710378], serving: { qty: 1, unit: 'shot' }, units: { shot: 30 } },
  // Coffee-shop drinks: FNDDS generics (made with reduced-fat milk); a name alone is a medium (16 fl oz)
  { id: 'latte', name: 'Latte', aliases: ['cafe latte', 'caffe latte', 'coffee latte', 'hot latte'], category: 'drinks', fdc: 2710386, serving: { qty: 1, unit: 'medium' } },
  { id: 'latte-nonfat', name: 'Latte, nonfat', aliases: ['skinny latte', 'nonfat latte', 'skim latte', 'non fat latte', 'skim milk latte'], category: 'drinks', fdc: 2710387, serving: { qty: 1, unit: 'medium' } },
  { id: 'latte-non-dairy', name: 'Latte, non-dairy milk', aliases: ['oat milk latte', 'oat latte', 'almond milk latte', 'soy latte', 'non dairy latte', 'oatmilk latte'], category: 'drinks', fdc: 2710388, serving: { qty: 1, unit: 'medium' } },
  { id: 'latte-flavored', name: 'Latte, flavored', aliases: ['vanilla latte', 'caramel latte', 'flavored latte', 'pumpkin spice latte', 'hazelnut latte', 'caramel macchiato'], category: 'drinks', fdc: 2710389, serving: { qty: 1, unit: 'medium' } },
  { id: 'iced-latte', name: 'Iced latte', aliases: ['iced coffee latte', 'iced cafe latte'], category: 'drinks', fdc: 2710431, serving: { qty: 1, unit: 'medium' } },
  { id: 'cappuccino', name: 'Cappuccino', aliases: ['cappucino', 'capuccino', 'flat white'], category: 'drinks', fdc: 2710472, serving: { qty: 1, unit: 'medium' } },
  { id: 'mocha', name: 'Mocha', aliases: ['cafe mocha', 'mocha latte', 'mochaccino', 'caffe mocha'], category: 'drinks', fdc: 2710410, serving: { qty: 1, unit: 'medium' } },
  // "tea" → hot brewed black tea
  { id: 'tea', name: 'Tea', aliases: ['black tea', 'hot tea', 'brewed tea', 'english breakfast tea', 'earl grey', 'oolong tea'], category: 'drinks', fdc: 173227, portionsFrom: [2710488], serving: { qty: 1, unit: 'cup' } },
  { id: 'green-tea', name: 'Green tea', aliases: ['hot green tea', 'sencha', 'brewed green tea'], category: 'drinks', fdc: 171917, portionsFrom: [2710490], serving: { qty: 1, unit: 'cup' } },
  { id: 'herbal-tea', name: 'Herbal tea', aliases: ['chamomile tea', 'chamomile', 'peppermint tea', 'mint tea', 'rooibos', 'hibiscus tea', 'ginger tea', 'herb tea'], category: 'drinks', fdc: 2710502, serving: { qty: 1, unit: 'cup' } },
  { id: 'iced-tea', name: 'Iced tea, unsweetened', aliases: ['iced tea', 'unsweetened iced tea', 'unsweet tea', 'unsweetened tea'], category: 'drinks', fdc: 2710517, serving: { qty: 1, unit: 'cup' } },
  { id: 'sweet-tea', name: 'Sweet tea', aliases: ['sweetened iced tea', 'southern sweet tea', 'sweet iced tea'], category: 'drinks', fdc: 2710515, serving: { qty: 1, unit: 'cup' } },
  { id: 'bubble-tea', name: 'Bubble tea', aliases: ['boba', 'boba tea', 'boba milk tea', 'pearl milk tea', 'tapioca tea'], category: 'drinks', fdc: 2710508, serving: { qty: 1, unit: 'each' } },
  { id: 'kombucha', name: 'Kombucha', aliases: ['booch', 'kombucha tea'], category: 'drinks', fdc: 2710509, serving: { qty: 1, unit: 'cup' } },
  { id: 'hot-chocolate', name: 'Hot chocolate', aliases: ['hot cocoa', 'drinking chocolate', 'hot chocolate with milk', 'cocoa with milk'], category: 'drinks', fdc: 2705473, serving: { qty: 1, unit: 'cup' } },
  { id: 'hot-chocolate-mix', name: 'Hot chocolate, from mix with water', aliases: ['hot cocoa mix', 'instant hot chocolate', 'swiss miss', 'hot chocolate packet', 'hot chocolate with water'], category: 'drinks', fdc: 2705483, serving: { qty: 1, unit: 'cup' } },

  // ---- Juice ----
  // "juice"/"oj" → orange juice
  { id: 'orange-juice', name: 'Orange juice', aliases: ['juice', 'oj', 'fresh orange juice', 'fresh squeezed orange juice', 'orange juice from concentrate'], category: 'drinks', fdc: 169100, portionsFrom: [2709188], serving: { qty: 1, unit: 'cup' } },
  // "apple cider" here is the US non-alcoholic cider (≈ apple juice); hard cider is its own entry
  { id: 'apple-juice', name: 'Apple juice', aliases: ['apple cider'], category: 'drinks', fdc: 173933, portionsFrom: [2709320], serving: { qty: 1, unit: 'cup' } },
  { id: 'grape-juice', name: 'Grape juice', aliases: ['concord grape juice', 'purple grape juice'], category: 'drinks', fdc: 173042, portionsFrom: [2709325], serving: { qty: 1, unit: 'cup' } },
  // "cranberry juice" → the cocktail: what most bottles labelled cranberry juice are
  { id: 'cranberry-juice-cocktail', name: 'Cranberry juice cocktail', aliases: ['cranberry juice', 'cran juice', 'cranberry juice drink', 'ocean spray'], category: 'drinks', fdc: 171903, portionsFrom: [2710579], serving: { qty: 1, unit: 'cup' } },
  { id: 'cranberry-juice-unsweetened', name: 'Cranberry juice, unsweetened', aliases: ['unsweetened cranberry juice', 'pure cranberry juice', '100 cranberry juice'], category: 'drinks', fdc: 168117, portionsFrom: [2709324], serving: { qty: 1, unit: 'cup' } },
  { id: 'grapefruit-juice', name: 'Grapefruit juice', aliases: ['ruby red grapefruit juice', 'pink grapefruit juice'], category: 'drinks', fdc: 174678, portionsFrom: [2709178], serving: { qty: 1, unit: 'cup' } },
  { id: 'pineapple-juice', name: 'Pineapple juice', aliases: [], category: 'drinks', fdc: 168187, portionsFrom: [2709329], serving: { qty: 1, unit: 'cup' } },
  { id: 'tomato-juice', name: 'Tomato juice', aliases: [], category: 'drinks', fdc: 170458, portionsFrom: [2709728], serving: { qty: 1, unit: 'cup' } },
  // "v8": generic stand-in for vegetable juice cocktail
  { id: 'vegetable-juice', name: 'Vegetable juice', aliases: ['v8', 'veggie juice', 'vegetable juice cocktail', 'v8 juice'], category: 'drinks', fdc: 170063, serving: { qty: 1, unit: 'cup' } },
  { id: 'lemonade', name: 'Lemonade', aliases: ['pink lemonade', 'homemade lemonade'], category: 'drinks', fdc: 173217, portionsFrom: [2710570], serving: { qty: 1, unit: 'cup' } },
  { id: 'fruit-punch', name: 'Fruit punch', aliases: ['punch', 'hawaiian punch', 'juice drink', 'fruit drink'], category: 'drinks', fdc: 2710569, serving: { qty: 1, unit: 'cup' } },
  { id: 'coconut-water', name: 'Coconut water', aliases: ['coco water', 'natural coconut water', 'unsweetened coconut water'], category: 'drinks', fdc: 170174, portionsFrom: [2707572], serving: { qty: 1, unit: 'cup' } },

  // ---- Soft drinks ----
  // "soda"/"pop"/"coke"/"pepsi" → regular cola (generic stand-ins)
  { id: 'cola', name: 'Cola', aliases: ['soda', 'pop', 'soft drink', 'coke', 'coca cola', 'pepsi', 'regular soda', 'cola soda', 'soda pop'], category: 'drinks', fdc: 174852, portionsFrom: [2710541], serving: { qty: 1, unit: 'can' } },
  { id: 'cola-diet', name: 'Cola, diet', aliases: ['diet soda', 'diet coke', 'diet pepsi', 'coke zero', 'pepsi zero', 'diet cola', 'zero sugar soda', 'diet pop', 'coke zero sugar', 'zero soda'], category: 'drinks', fdc: 175099, portionsFrom: [2710542], serving: { qty: 1, unit: 'can' } },
  { id: 'lemon-lime-soda', name: 'Lemon-lime soda', aliases: ['sprite', '7up', '7 up', 'seven up', 'lemonade soda', 'lemon soda'], category: 'drinks', fdc: 173205, portionsFrom: [2710551], serving: { qty: 1, unit: 'can' } },
  { id: 'root-beer', name: 'Root beer', aliases: ['a and w root beer', 'rootbeer'], category: 'drinks', fdc: 171871, portionsFrom: [2710557], serving: { qty: 1, unit: 'can' } },
  { id: 'ginger-ale', name: 'Ginger ale', aliases: ['canada dry', 'ginger soda'], category: 'drinks', fdc: 174846, portionsFrom: [2710555], serving: { qty: 1, unit: 'can' } },
  { id: 'orange-soda', name: 'Orange soda', aliases: ['fanta', 'sunkist', 'orange pop'], category: 'drinks', fdc: 174854, portionsFrom: [2710551], serving: { qty: 1, unit: 'can' } },
  // "dr pepper": generic stand-in for pepper-type soda
  { id: 'pepper-soda', name: 'Pepper-type soda', aliases: ['dr pepper', 'doctor pepper', 'mr pibb', 'pepper soda'], category: 'drinks', fdc: 173209, portionsFrom: [2710545], serving: { qty: 1, unit: 'can' } },
  { id: 'tonic-water', name: 'Tonic water', aliases: ['tonic', 'indian tonic water'], category: 'drinks', fdc: 171869, portionsFrom: [2710538], serving: { qty: 1, unit: 'can' } },
  // "gatorade"/"powerade": generic stand-ins for sports drinks
  { id: 'sports-drink', name: 'Sports drink', aliases: ['gatorade', 'powerade', 'electrolyte drink', 'isotonic drink', 'body armor', 'bodyarmor'], category: 'drinks', fdc: 2710771, serving: { qty: 1, unit: 'bottle' } },
  { id: 'sports-drink-zero', name: 'Sports drink, low calorie', aliases: ['gatorade zero', 'g2', 'powerade zero', 'zero sugar sports drink', 'low calorie sports drink', 'propel'], category: 'drinks', fdc: 2710774, serving: { qty: 1, unit: 'bottle' } },
  // "red bull"/"monster": generic stand-ins for energy drinks
  { id: 'energy-drink', name: 'Energy drink', aliases: ['red bull', 'monster', 'monster energy', 'rockstar'], category: 'drinks', fdc: 2710756, serving: { qty: 1, unit: 'can' } },
  { id: 'energy-drink-sugar-free', name: 'Energy drink, sugar free', aliases: ['sugar free energy drink', 'sugar free red bull', 'zero sugar energy drink', 'monster zero', 'celsius', 'diet energy drink'], category: 'drinks', fdc: 2710768, serving: { qty: 1, unit: 'can' } },

  // ---- Smoothies & shakes ----
  // each: 540 g, FNDDS 'small' (~20 fl oz), the smallest whole smoothie USDA lists; its medium (864 g) is a 32 oz shop size
  { id: 'smoothie', name: 'Fruit smoothie', aliases: ['smoothie', 'fruit smoothie with yogurt', 'berry smoothie', 'strawberry banana smoothie'], category: 'drinks', fdc: 2705513, serving: { qty: 1, unit: 'each' }, units: { each: 540 } },
  { id: 'smoothie-protein', name: 'Fruit smoothie, with protein', aliases: ['protein smoothie', 'smoothie with protein powder', 'protein fruit smoothie'], category: 'drinks', fdc: 2705515, serving: { qty: 1, unit: 'each' }, units: { each: 540 } },
  // each: 280 g, FNDDS "Milk shake, home recipe" '1 milkshake (10 fl oz)'
  { id: 'milkshake-vanilla', name: 'Milkshake, vanilla', aliases: ['milkshake', 'milk shake', 'vanilla milkshake', 'vanilla shake', 'strawberry milkshake'], category: 'drinks', fdc: 2705504, serving: { qty: 1, unit: 'each' }, units: { each: 280 } },
  // each: 280 g, FNDDS "Milk shake, home recipe, chocolate" '1 milkshake (10 fl oz)'
  { id: 'milkshake-chocolate', name: 'Milkshake, chocolate', aliases: ['chocolate milkshake', 'chocolate shake', 'chocolate milk shake'], category: 'drinks', fdc: 2705503, serving: { qty: 1, unit: 'each' }, units: { each: 280 } },

  // ---- Alcohol ----
  // alcohol: kcal includes 7 kcal/g ethanol, so these fail 4P+4C+9F by design.
  // "beer" → regular beer. bottle: 360 g, FNDDS "Beer" 'can or bottle (12 fl oz)' (unitsOf only reads it as can; its
  // only bottle portion is a 40 fl oz bottle).
  { id: 'beer', name: 'Beer', aliases: ['lager', 'ale', 'pilsner', 'regular beer', 'draft beer'], category: 'drinks', fdc: 168746, portionsFrom: [2710616], serving: { qty: 1, unit: 'can' }, units: { bottle: 360 } },
  // "bud light"/"coors light"/"miller lite"/"michelob ultra": generic stand-ins for light beer. bottle: as beer.
  { id: 'beer-light', name: 'Beer, light', aliases: ['light beer', 'lite beer', 'bud light', 'coors light', 'miller lite', 'michelob ultra', 'low carb beer'], category: 'drinks', fdc: 168749, portionsFrom: [2710617], serving: { qty: 1, unit: 'can' }, units: { bottle: 360 } },
  { id: 'beer-strong', name: 'Beer, higher alcohol', aliases: ['ipa', 'craft beer', 'double ipa', 'strong beer', 'imperial stout', 'high abv beer'], category: 'drinks', fdc: 171906, portionsFrom: [2710618], serving: { qty: 1, unit: 'can' } },
  { id: 'beer-non-alcoholic', name: 'Beer, non-alcoholic', aliases: ['non alcoholic beer', 'na beer', 'alcohol free beer', 'nonalcoholic beer'], category: 'drinks', fdc: 2710610, serving: { qty: 1, unit: 'can' } },
  // "wine" → red wine (and a glass is FNDDS's 6 fl oz glass)
  { id: 'wine-red', name: 'Wine, red', aliases: ['wine', 'red wine', 'cabernet', 'cabernet sauvignon', 'merlot', 'pinot noir', 'malbec', 'shiraz', 'syrah', 'zinfandel'], category: 'drinks', fdc: 173190, portionsFrom: [2710688], serving: { qty: 1, unit: 'glass' } },
  { id: 'wine-white', name: 'Wine, white', aliases: ['white wine', 'chardonnay', 'sauvignon blanc', 'pinot grigio', 'pinot gris', 'riesling', 'moscato'], category: 'drinks', fdc: 2710689, serving: { qty: 1, unit: 'glass' } },
  { id: 'wine-rose', name: 'Wine, rose', aliases: ['rose', 'rose wine'], category: 'drinks', fdc: 171908, portionsFrom: [2710690], serving: { qty: 1, unit: 'glass' } },
  { id: 'sparkling-wine', name: 'Sparkling wine', aliases: ['champagne', 'prosecco', 'cava', 'bubbly'], category: 'drinks', fdc: 2710687, serving: { qty: 1, unit: 'glass' } },
  // "liquor" → 80-proof distilled spirits (vodka, gin, rum, whiskey and tequila share these numbers)
  { id: 'liquor', name: 'Liquor', aliases: ['spirits', 'hard liquor', 'vodka', 'whiskey', 'whisky', 'rum', 'gin', 'tequila', 'bourbon', 'scotch', 'brandy', 'cognac', 'mezcal'], category: 'drinks', fdc: 174815, portionsFrom: [2710704], serving: { qty: 1, unit: 'shot' } },
  // "white claw"/"truly": generic stand-ins for hard seltzer
  { id: 'hard-seltzer', name: 'Hard seltzer', aliases: ['spiked seltzer', 'white claw', 'alcoholic seltzer'], category: 'drinks', fdc: 2710622, serving: { qty: 1, unit: 'can' } },
  { id: 'hard-cider', name: 'Hard cider', aliases: ['alcoholic cider', 'hard apple cider', 'cider beer'], category: 'drinks', fdc: 2710621, serving: { qty: 1, unit: 'can' } },
];
