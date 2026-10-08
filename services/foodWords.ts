// Food words people type that the USDA table doesn't spell: emoji and common foods in Spanish,
// French, Italian, Portuguese and German. They're turned into the table's English words before the
// app looks foods up, so "2 huevos y arroz" or "🍳🍳 + 🥑" still finds egg, rice and avocado for the
// AI to pick from. The AI still reads the message as typed.

const EMOJI: Record<string, string> = {
  '🍳': 'egg', '🥚': 'egg', '🥓': 'bacon', '🍌': 'banana', '🍎': 'apple', '🍏': 'apple', '🍐': 'pear', '🍊': 'orange',
  '🍋': 'lemon', '🍉': 'watermelon', '🍇': 'grapes', '🍓': 'strawberries', '🫐': 'blueberries', '🍒': 'cherries',
  '🍑': 'peach', '🥭': 'mango', '🍍': 'pineapple', '🥥': 'coconut', '🥝': 'kiwi', '🥑': 'avocado', '🍅': 'tomato',
  '🥦': 'broccoli', '🥬': 'lettuce', '🥒': 'cucumber', '🌶': 'jalapeno', '🫑': 'bell pepper', '🌽': 'corn', '🥕': 'carrot',
  '🧄': 'garlic', '🧅': 'onion', '🥔': 'potato', '🍠': 'sweet potato', '🍄': 'mushrooms', '🥜': 'peanuts', '🌰': 'chestnuts',
  '🍞': 'bread', '🥐': 'croissant', '🥖': 'bread', '🥯': 'bagel', '🥞': 'pancakes', '🧇': 'waffle', '🧀': 'cheese',
  '🍗': 'chicken', '🍖': 'meat', '🥩': 'steak', '🍔': 'burger', '🍟': 'fries', '🍕': 'pizza', '🌭': 'hot dog',
  '🥪': 'sandwich', '🌮': 'taco', '🌯': 'burrito', '🥗': 'salad', '🍝': 'pasta', '🍜': 'ramen', '🍣': 'sushi', '🍤': 'shrimp',
  '🦐': 'shrimp', '🐟': 'fish', '🍚': 'rice', '🍙': 'rice', '🥛': 'milk', '☕': 'coffee', '🍵': 'tea', '🧃': 'juice',
  '🥤': 'soda', '🍺': 'beer', '🍻': 'beer', '🍷': 'wine', '🥂': 'champagne', '🍸': 'cocktail', '🥃': 'whiskey',
  '🍦': 'ice cream', '🍨': 'ice cream', '🍩': 'donut', '🍪': 'cookie', '🍫': 'chocolate', '🍰': 'cake', '🧁': 'cupcake',
  '🍯': 'honey', '🥣': 'cereal', '🥫': 'canned', '🍿': 'popcorn', '🥨': 'pretzel',
};

// One meaning only: words that are also English food words ("pan", "latte", "pain") are left out
const WORDS: Record<string, string> = {
  // Spanish
  huevo: 'egg', huevos: 'eggs', pollo: 'chicken', arroz: 'rice', frijoles: 'beans', frijol: 'beans', leche: 'milk',
  queso: 'cheese', platano: 'banana', plátano: 'banana', manzana: 'apple', papa: 'potato', papas: 'potatoes',
  patata: 'potato', patatas: 'potatoes', pescado: 'fish', atun: 'tuna', atún: 'tuna', pavo: 'turkey', cerdo: 'pork',
  res: 'beef', carne: 'beef', avena: 'oatmeal', yogur: 'yogurt', mantequilla: 'butter', aceite: 'oil', jamon: 'ham',
  jamón: 'ham', salmon: 'salmon', salmón: 'salmon', camarones: 'shrimp', aguacate: 'avocado', tomate: 'tomato',
  cebolla: 'onion', zanahoria: 'carrot', lechuga: 'lettuce', espinaca: 'spinach', fresas: 'strawberries', uvas: 'grapes',
  naranja: 'orange', jugo: 'juice', zumo: 'juice', cafe: 'coffee', café: 'coffee', cerveza: 'beer', vino: 'wine',
  agua: 'water', azucar: 'sugar', azúcar: 'sugar', miel: 'honey', nueces: 'walnuts', almendras: 'almonds', mani: 'peanuts',
  maní: 'peanuts', tocino: 'bacon', salchicha: 'sausage', lentejas: 'lentils', garbanzos: 'chickpeas', maiz: 'corn',
  maíz: 'corn',
  // French
  oeuf: 'egg', oeufs: 'eggs', œuf: 'egg', œufs: 'eggs', poulet: 'chicken', riz: 'rice', lait: 'milk', fromage: 'cheese',
  beurre: 'butter', pomme: 'apple', pommes: 'apples', poisson: 'fish', boeuf: 'beef', bœuf: 'beef', porc: 'pork',
  jambon: 'ham', saumon: 'salmon', thon: 'tuna', haricots: 'beans', lentilles: 'lentils', fraises: 'strawberries',
  banane: 'banana', yaourt: 'yogurt', biere: 'beer', bière: 'beer', vin: 'wine', sucre: 'sugar',
  // Italian
  uovo: 'egg', uova: 'eggs', riso: 'rice', formaggio: 'cheese', pane: 'bread', burro: 'butter', mela: 'apple',
  pesce: 'fish', manzo: 'beef', maiale: 'pork', prosciutto: 'ham', tonno: 'tuna', fagioli: 'beans', fragole: 'strawberries',
  // Portuguese
  ovo: 'egg', ovos: 'eggs', frango: 'chicken', feijao: 'beans', feijão: 'beans', leite: 'milk', queijo: 'cheese',
  manteiga: 'butter', peixe: 'fish', batata: 'potato', batatas: 'potatoes',
  // German
  ei: 'egg', eier: 'eggs', hähnchen: 'chicken', haehnchen: 'chicken', huhn: 'chicken', reis: 'rice', milch: 'milk',
  käse: 'cheese', kaese: 'cheese', brot: 'bread', apfel: 'apple', kartoffel: 'potato',
  kartoffeln: 'potatoes', fisch: 'fish', rindfleisch: 'beef', schinken: 'ham', lachs: 'salmon', haferflocken: 'oats',
  joghurt: 'yogurt', bier: 'beer', wein: 'wine', zucker: 'sugar', honig: 'honey',
};

const emojiPattern = new RegExp(Object.keys(EMOJI).map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');

// The message with emoji and foreign food words in the table's English, for looking foods up
export function englishFoodWords(text: string): string {
  return text
    .replace(emojiPattern, (e) => ` ${EMOJI[e]} `)
    .replace(/[\p{L}]+/gu, (w) => {
      const t = WORDS[w.toLowerCase()];
      return t ?? w;
    });
}
