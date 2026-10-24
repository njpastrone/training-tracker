/// <reference types="node" />
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// The native module and the Worker, faked: a place list with coordinates, and a recorder of what was sent
const found = [
  { name: "Joe's Pizza", category: 'MKPOICategoryRestaurant', distanceM: 310, lat: 40.7411, lon: -73.9934 },
  { name: 'Chipotle', category: 'MKPOICategoryRestaurant', distanceM: 120, lat: 40.7415, lon: -73.9931 },
  { name: 'chipotle', category: 'MKPOICategoryRestaurant', distanceM: 900, lat: 40.75, lon: -73.99 }, // a second branch
  { name: 'Corner Deli', category: 'MKPOICategoryFoodMarket', distanceM: 60, lat: 40.7419, lon: -73.993 },
  { name: ' ', category: '', distanceM: 10, lat: 0, lon: 0 },
];
const places = { currentLocation: async () => ({ lat: 40.742, lon: -73.9897 }), locationPermission: () => 'allowed', geocode: async () => null, nearby: mock.fn(async (_lat: number, _lon: number, _radius: number) => found) };
const nearbyArgs = (i = places.nearby.mock.calls.length - 1) => places.nearby.mock.calls[i].arguments as unknown as [number, number, number];
mock.module('expo', { namedExports: { requireOptionalNativeModule: (name: string) => (name === 'LiftTextPlaces' ? places : null) } });
const sent: unknown[] = [];
let reply = JSON.stringify({ picks: [{ place: 'Chipotle', item: 'Chicken bowl, no rice', kcal: 520, protein_g: 48, carbs_g: 38, fat_g: 18, fiber_g: 12, price_usd: 11, verdicts: [{ preference: 'high_protein', verdict: 'hit', reason: 'about 48 g' }], why: 'Lower-carb.', confidence: 0.85 }], skipped: [{ place: "Joe's Pizza", why: 'refined carbs' }] });
mock.module('./claude', { namedExports: { callWorker: async (_s: string, _c: string, _m: number, mode: unknown) => { sent.push(mode); return { text: reply }; }, ApiError: class extends Error {} } });
// In-memory AsyncStorage so the real stores run under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', { defaultExport: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k) } });

const { usePlacesStore, whereChoices } = await import('../stores/placesStore.ts');
const { useWorkoutStore } = await import('../stores/workoutStore.ts');
const { findNearby, reducePlaces, distanceBucket, mapsUrl, pickEntry, asksNearby, NoWhereError } = await import('./finder.ts');
const { readFoodPrefs, DEFAULT_PREFS } = await import('./foodPrefs.ts');
// services/backup.ts pulls in expo-file-system; the backup key list is read from its text instead
const backupKeys = (await import('node:fs')).readFileSync(new URL('./backup.ts', import.meta.url), 'utf8').match(/BACKUP_KEYS = \[([\s\S]*?)\];/)![1].replace(/\/\/.*$/gm, '');
const { PLACES_KEY } = await import('../stores/placesStore.ts');

test('reducePlaces: nearest first, one per name, kinds mapped, no coordinates', () => {
  const reduced = reducePlaces(found as any);
  assert.deepEqual(reduced, [
    { name: 'Corner Deli', category: 'food_market', distance: 'under_200m' },
    { name: 'Chipotle', category: 'restaurant', distance: 'under_200m' },
    { name: "Joe's Pizza", category: 'restaurant', distance: 'under_500m' },
  ]);
  assert.deepEqual([distanceBucket(199), distanceBucket(200), distanceBucket(999), distanceBucket(1500), distanceBucket(5000)], ['under_200m', 'under_500m', 'under_1km', 'under_2km', 'further']);
});

test('where to look: nothing set up throws; the chip used last wins; saved, live and area are offered in that order', async () => {
  assert.deepEqual(whereChoices(usePlacesStore.getState()), []);
  await assert.rejects(findNearby(), NoWhereError);
  usePlacesStore.getState().setArea({ text: 'East Village, NYC', lat: 40.727, lon: -73.984 });
  usePlacesStore.getState().setLive(true);
  usePlacesStore.getState().savePlace({ label: 'Work', address: 'x', lat: 1, lon: 2 });
  usePlacesStore.getState().savePlace({ label: 'Home', address: 'y', lat: 3, lon: 4 });
  assert.deepEqual(whereChoices(usePlacesStore.getState()).map((c) => c.label), ['Home', 'Work', 'Where I am', 'East Village']);
  assert.equal(backupKeys.includes(PLACES_KEY), false); // never in a backup file
});

test('findNearby sends names, kinds and buckets with the preferences, never a coordinate, and joins distances back', async () => {
  const result = await findNearby({ where: 'live', now: new Date('2026-10-24T12:00:00') });
  const mode = sent[0] as { finder: Record<string, unknown> };
  assert.deepEqual(Object.keys(mode.finder).sort(), ['budget', 'date', 'places', 'preferences']);
  assert.deepEqual(mode.finder.preferences, DEFAULT_PREFS.matters);
  assert.equal(mode.finder.budget, 12);
  assert.doesNotMatch(JSON.stringify(mode), /lat|lon|40\.7|73\.9/);
  assert.equal(nearbyArgs(0)[2], 800); // a 10-minute walk
  assert.equal(result.where, 'live');
  assert.equal(result.picks[0].place, 'Chipotle');
  assert.equal(result.picks[0].distanceM, 120);
  assert.equal(result.picks[0].minutes, 2);
  assert.deepEqual(result.picks[0].verdicts.map((v) => v.verdict), ['hit', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(result.searched, 3);
  assert.equal(usePlacesStore.getState().last, 'live');
  // Open in Maps: the pin from this session; a name search for a place it doesn't hold
  assert.equal(mapsUrl('Chipotle'), 'maps://?q=Chipotle&ll=40.7415,-73.9931');
  assert.equal(mapsUrl('Nowhere'), 'maps://?q=Nowhere');
});

test('today\'s food, the never list, a follow-up and driving go along; a saved place is used next time', async () => {
  useWorkoutStore.getState().updateSettings({ foodPrefs: { matters: ['cheap', 'high_protein'], budget: 9, never: ['shellfish', ' '], walkMinutes: 5 }, goals: { muscles: [], custom: [], food: { kind: 'protein', target: 160 } } } as any);
  useWorkoutStore.getState().addFoodEntry({ id: 'e1', date: '2026-10-24', items: [{ id: 'i1', name: 'Eggs', macros: { kcal: 300, protein: 25, carbs: 2, fat: 20 }, source: 'usda' }], rawInput: 'eggs', createdAt: '2026-10-24T08:00:00.000Z' });
  await findNearby({ ask: "I'm driving", now: new Date('2026-10-24T12:00:00') });
  const mode = sent[sent.length - 1] as { finder: Record<string, unknown> };
  assert.deepEqual(mode.finder.preferences, ['high_protein', 'cheap']); // card order, not the sheet's
  assert.equal(mode.finder.budget, 9);
  assert.deepEqual(mode.finder.never, ['shellfish']);
  assert.deepEqual(mode.finder.today, { kcal: 300, protein: 25, proteinGoal: 160 });
  assert.equal(mode.finder.ask, "I'm driving");
  assert.equal(nearbyArgs()[2], 5000);
  assert.equal(nearbyArgs()[0], 40.742); // last used: live
  await findNearby({ where: 'Home', now: new Date('2026-10-24T12:00:00') });
  assert.equal(nearbyArgs()[0], 3);
  assert.equal(usePlacesStore.getState().last, 'Home');
});

test('area mode with no places found sends only the words the user typed', async () => {
  const before = places.nearby;
  places.nearby = mock.fn(async () => []) as any;
  reply = reply.replace('"Chipotle"', '"Veselka"');
  const result = await findNearby({ where: 'area', now: new Date('2026-10-24T12:00:00') });
  const mode = sent[sent.length - 1] as { finder: Record<string, unknown> };
  assert.deepEqual(mode.finder.places, []);
  assert.equal(mode.finder.area, 'East Village, NYC');
  assert.equal(result.guessed, true);
  assert.equal(result.picks[0].place, 'Veselka');
  assert.equal(result.picks[0].distanceM, undefined);
  places.nearby = before;
});

test('a pick logs as one estimated food; the chip phrases ask for the finder', () => {
  const entry = pickEntry({ place: 'Chipotle', item: 'Chicken bowl, no rice', kcal: 520, protein: 48, carbs: 38, fat: 18, fiber: 12, price: 11, verdicts: [], why: '', confidence: 0.8 }, new Date('2026-10-24T13:00:00'));
  assert.equal(entry.date, '2026-10-24');
  assert.deepEqual(entry.items[0].macros, { kcal: 520, protein: 48, carbs: 38, fat: 18, fiber: 12 });
  assert.equal(entry.items[0].source, 'estimate');
  assert.equal(entry.items[0].said, 'Chipotle: Chicken bowl, no rice');
  for (const t of ['Find healthy food near me', 'find me food nearby', "what's good around here", 'Find food']) assert.equal(asksNearby(t), true, t);
  for (const t of ['2 eggs and toast', 'what should I eat tonight?', 'bench 3x5 225', 'near miss on the squat']) assert.equal(asksNearby(t), false, t);
});

test('readFoodPrefs: defaults until the sheet sets them, bad values ignored', () => {
  assert.deepEqual(readFoodPrefs({ weightUnit: 'lbs' }), DEFAULT_PREFS);
  assert.deepEqual(readFoodPrefs({ weightUnit: 'lbs', foodPrefs: { matters: ['no_seed_oils', 'bogus'], budget: -3, never: 'x', walkMinutes: 15 } } as any), { matters: ['no_seed_oils'], budget: 12, never: [], walkMinutes: 15 });
});
