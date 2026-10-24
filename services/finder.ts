import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import Places, { type NearbyPlace, type Point } from '../modules/places';
import { buildFinderRequest, MAX_PLACES, readFinderReply, type Category, type Distance, type FinderInput, type FinderPick, type FinderPlace, type Preference } from '../server/src/finder';
import { readFoodPrefs } from './foodPrefs';
import { callWorker } from './claude';
import { sumMacros } from './foods';
import { usePlacesStore, whereChoices, type WhereKey } from '../stores/placesStore';
import { useWorkoutStore } from '../stores/workoutStore';
import type { FoodEntry } from '../types/food';

// Find food near you (data/lt-food-data/report.md §3): the phone finds the places with Apple Maps
// (modules/places), reduces them to names, kinds and distance buckets, and sends those with the food
// preferences to the Worker's finder mode; the model picks an order at a few of them. Where the user is
// never leaves the phone: not the coordinate, not an address, not the area they typed (except the words,
// in area mode with no place list). Results are kept in the Chat thread like a coach answer, without
// distances or where it looked; the places'
// coordinates stay in memory here for Open in Maps and are gone when the app is.

export const WALK_M_PER_MIN = 80; // a brisk walk
export const DRIVING_RADIUS_M = 5000;
const AREA_RADIUS_M = 1500; // a neighbourhood

export class NoWhereError extends Error {
  constructor() {
    super('Pick where to look first.');
  }
}

export interface FinderResult {
  where: WhereKey;
  whereLabel?: string; // in memory only, like the distances: the Chat thread saves neither
  walkMinutes: number;
  preferences: Preference[];
  picks: (FinderPick & { distanceM?: number; minutes?: number })[]; // distance from the phone's own list
  skipped: { place: string; why: string }[];
  searched: number; // places sent
  guessed: boolean; // no place list: the model named places from the area words
  ask?: string;
}

// Apple's category → the kind the Worker accepts
const CATEGORY: Record<string, Category> = { MKPOICategoryRestaurant: 'restaurant', MKPOICategoryCafe: 'cafe', MKPOICategoryBakery: 'bakery', MKPOICategoryFoodMarket: 'food_market' };
export const distanceBucket = (m: number): Distance => (m < 200 ? 'under_200m' : m < 500 ? 'under_500m' : m < 1000 ? 'under_1km' : m < 2000 ? 'under_2km' : 'further');

// What the Worker gets about the places: name, kind and bucket, nearest first, at most MAX_PLACES, one
// per name (a chain with two branches is one entry, the nearer one)
const placeName = (name: string) => name.trim().slice(0, 60);
const placeKey = (name: string) => placeName(name).toLowerCase();

export function reducePlaces(places: NearbyPlace[]): FinderPlace[] {
  const seen = new Set<string>();
  return [...places]
    .sort((a, b) => a.distanceM - b.distanceM)
    .filter((p) => {
      const key = placeKey(p.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_PLACES)
    .map((p) => ({ name: placeName(p.name), category: CATEGORY[p.category] ?? 'other', distance: distanceBucket(p.distanceM) }));
}

export const walkMinutes = (m: number) => Math.max(1, Math.round(m / WALK_M_PER_MIN));

// The last search's places, by name, for Open in Maps: in memory only, as Apple's terms ask
const lastPlaces = new Map<string, NearbyPlace>();

// Apple Maps on a place: its pin when this session found it, else a search for its name near the user
export function mapsUrl(place: string): string {
  const p = lastPlaces.get(placeKey(place));
  const q = encodeURIComponent(place);
  return p ? `maps://?q=${q}&ll=${p.lat},${p.lon}` : `maps://?q=${q}`;
}

// What today's food adds up to, for the "today total" line and the prompt
function eatenToday(entries: FoodEntry[], now: Date) {
  const today = format(now, 'yyyy-MM-dd');
  const items = entries.filter((e) => e.date === today).flatMap((e) => e.items);
  if (!items.length) return undefined;
  const m = sumMacros(items);
  return { kcal: Math.round(m.kcal), protein: Math.round(m.protein) };
}

// Where to search from, for one chip; null when the module is missing or the user said no
async function centerFor(where: WhereKey): Promise<Point | null> {
  const s = usePlacesStore.getState();
  if (where === 'live') return Places ? Places.currentLocation() : null;
  if (where === 'area') return s.area?.lat !== undefined && s.area.lon !== undefined ? { lat: s.area.lat, lon: s.area.lon } : null;
  const saved = s.saved.find((p) => p.label === where);
  return saved ? { lat: saved.lat, lon: saved.lon } : null;
}

// One tap. `where` defaults to the chip used last time, else the first one set up; `ask` is a follow-up
// on the last result ("cheaper"). Throws NoWhereError when nothing is set up, ApiError on a server refusal.
export async function findNearby({ where, ask, now = new Date() }: { where?: WhereKey; ask?: string; now?: Date } = {}): Promise<FinderResult> {
  const places = usePlacesStore.getState();
  const choices = whereChoices(places);
  const chosen = choices.find((c) => c.key === where) ?? choices.find((c) => c.key === places.last) ?? choices[0];
  if (!chosen) throw new NoWhereError();
  const { settings, foodEntries } = useWorkoutStore.getState();
  const prefs = readFoodPrefs(settings);
  const driving = /driv/i.test(ask ?? '');
  const radius = driving ? DRIVING_RADIUS_M : chosen.key === 'area' ? Math.max(AREA_RADIUS_M, prefs.walkMinutes * WALK_M_PER_MIN) : prefs.walkMinutes * WALK_M_PER_MIN;

  const center = await centerFor(chosen.key);
  if (!center && chosen.key !== 'area') throw new Error(chosen.key === 'live' ? 'Location is off for LiftText. Allow it in Settings › Privacy › Location Services, or pick a saved place.' : 'Needs the full app, not Expo Go.');
  const found = center && Places ? await Places.nearby(center.lat, center.lon, radius) : [];
  // The nearest branch of a name is the one the card means
  lastPlaces.clear();
  for (const p of [...found].sort((a, b) => a.distanceM - b.distanceM)) if (!lastPlaces.has(placeKey(p.name))) lastPlaces.set(placeKey(p.name), p);
  const reduced = reducePlaces(found);
  const area = places.area?.text;
  if (!reduced.length && !(chosen.key === 'area' && area)) throw new Error('No food places found around there. Try a wider walk or another place.');

  const proteinGoal = settings.goals?.food?.kind === 'protein' ? settings.goals.food.target : undefined;
  const eaten = eatenToday(foodEntries, now);
  const input: FinderInput = {
    date: format(now, 'yyyy-MM-dd'),
    preferences: prefs.matters,
    budget: prefs.budget,
    ...(prefs.never.length ? { never: prefs.never } : {}),
    places: reduced,
    ...(!reduced.length && area ? { area } : {}),
    ...(ask ? { ask } : {}),
    ...(eaten ? { today: { ...eaten, ...(proteinGoal ? { proteinGoal } : {}) } } : {}),
  };
  // Workers deployed before finder mode read system/messages: they get the same prompt as a pass-through
  const req = buildFinderRequest(input);
  const { text } = await callWorker(req.system, req.messages[0].content, req.max_tokens, { finder: input as unknown as Record<string, unknown> });
  const read = readFinderReply(text, input);
  if (!read || !read.picks.length) throw new Error("Couldn't find an order that fits around there. Try again, or widen the walk.");
  usePlacesStore.getState().setLast(chosen.key);
  return {
    where: chosen.key,
    whereLabel: chosen.label,
    walkMinutes: driving ? 0 : prefs.walkMinutes,
    preferences: prefs.matters,
    picks: read.picks.map((p) => {
      const distanceM = lastPlaces.get(placeKey(p.place))?.distanceM;
      return { ...p, ...(distanceM !== undefined ? { distanceM: Math.round(distanceM), minutes: walkMinutes(distanceM) } : {}) };
    }),
    skipped: read.skipped,
    searched: reduced.length,
    guessed: !reduced.length,
    ...(ask ? { ask } : {}),
  };
}

// "Log it when eaten": the pick as one estimated food, the way restaurant food is logged today
export const pickEntry = (pick: FinderPick, now: Date = new Date()): FoodEntry => ({
  id: uuidv4(),
  date: format(now, 'yyyy-MM-dd'),
  items: [{ id: uuidv4(), name: pick.item.slice(0, 80), said: `${pick.place}: ${pick.item}`, macros: { kcal: pick.kcal, protein: pick.protein, carbs: pick.carbs, fat: pick.fat, ...(pick.fiber !== undefined ? { fiber: pick.fiber } : {}) }, source: 'estimate' }],
  rawInput: `Find nearby: ${pick.place}, ${pick.item}`,
  createdAt: now.toISOString(),
});

// A message that asks for the finder ("find me healthy food near me", "where can I eat near me"): a
// request with a food word and a nearby phrase; anything that reports eating stays a log
export const asksNearby = (text: string) =>
  !/\b(had|ate|eaten|was|were|got|grabbed|picked up|(breakfast|lunch|dinner) at)\b|:/i.test(text) &&
  /\b(find|get me|where|what['’]?s good|what should i eat|any|suggest|recommend|looking for|hungry)\b/i.test(text) &&
  /\b(food|eat|meal|lunch|dinner|breakfast|snack|hungry)\b/i.test(text) &&
  /\b(near ?by|near me|around me|around here|close by)\b/i.test(text);
