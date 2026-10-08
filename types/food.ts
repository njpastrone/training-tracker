// Food logging: the built-in food table (data/foods.ts), what a parse returns, and what is saved.

// Friendly groups shown as a small coloured dot, like muscle groups
export type FoodCategory =
  | 'meat_fish'
  | 'eggs_dairy'
  | 'grains'
  | 'fruit'
  | 'vegetables'
  | 'legumes'
  | 'nuts_seeds'
  | 'fats_oils'
  | 'drinks'
  | 'sweets_snacks'
  | 'other';

export type MassUnit = 'g' | 'kg' | 'oz' | 'lb';
export type VolumeUnit = 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'fl_oz' | 'pint' | 'quart' | 'gallon';
// 'each' is one whole item ("2 eggs", "a banana"); sizes are one item of that size
export type SizeUnit = 'each' | 'small' | 'medium' | 'large' | 'xl';
export type PortionUnit =
  | 'slice' | 'piece' | 'scoop' | 'handful' | 'serving' | 'bowl' | 'plate' | 'can' | 'bottle'
  | 'glass' | 'packet' | 'bar' | 'stick' | 'clove' | 'strip' | 'link' | 'patty' | 'fillet'
  | 'breast' | 'thigh' | 'drumstick' | 'wing' | 'leaf' | 'stalk' | 'spear' | 'wedge'
  | 'container' | 'shot' | 'pat' | 'square' | 'sheet';
export type FoodUnit = MassUnit | VolumeUnit | SizeUnit | PortionUnit;

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
}

// One entry of the built-in food table, generated from USDA FoodData Central (public domain)
export interface Food {
  id: string; // permanent kebab-case key; never renamed or reused
  name: string; // plain display name: "Chicken breast", "Rice, white"
  aliases: string[]; // other wordings people use, normalized (data/catalog.ts normalizeWords); no alias on two foods
  category: FoodCategory;
  per100g: Required<Macros>;
  // Grams in one of each unit USDA gives a weight for ("cup": 158, "large": 50, "slice": 28).
  // Mass units are universal; other volumes derive from cup/tbsp/tsp/fl_oz/ml (services/foodUnits.ts).
  units: Partial<Record<Exclude<FoodUnit, MassUnit>, number>>;
  serving: { qty: number; unit: FoodUnit }; // what a name alone means ("a banana", "rice")
  state?: 'cooked' | 'raw' | 'dry'; // what the numbers are for, when it changes them
  fdc: number; // FoodData Central id the numbers come from
  source: string; // its USDA description
}

// One food in a parsed log or a saved entry. Macros are for the whole amount.
export interface FoodItem {
  name: string; // the table's name, or the AI's name for an estimate ("Big Mac")
  said?: string; // the user's own words for it
  foodId?: string; // the table entry, when the numbers come from USDA
  qty?: number; // the amount as said; unset means the default serving
  unit?: FoodUnit;
  grams?: number; // total weight, when known
  macros: Macros;
  source: 'usda' | 'estimate'; // USDA numbers, or the AI's best guess (branded, restaurant, homemade)
}

// What a food parse returns for review; dayOffset as in a workout parse (-1 = yesterday)
export interface FoodDraft {
  items: (FoodItem & { dayOffset?: number })[];
  confidence: number; // 0-1
}

// One saved food log for a day: a meal, a snack, or everything typed at once
export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  items: (FoodItem & { id: string })[];
  rawInput: string;
  createdAt: string; // ISO timestamp
}
