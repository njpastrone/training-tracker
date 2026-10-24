import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFinderRequest, dropClaims, finderMessage, FINDER_ESCALATION_MODEL, needsFinderEscalation, readFinderReply, tally, type FinderInput } from './finder.ts';

const input: FinderInput = {
  date: '2026-10-24',
  preferences: ['high_protein', 'low_spike', 'simple', 'no_seed_oils', 'cheap'],
  budget: 12,
  never: ['shellfish'],
  places: [
    { name: 'Chipotle', category: 'restaurant', distance: 'under_200m' },
    { name: "Joe's Pizza", category: 'restaurant', distance: 'under_500m' },
    { name: 'Corner Deli', category: 'food_market', distance: 'under_200m' },
  ],
};

const pick = (over: Record<string, unknown> = {}) => ({
  place: 'Chipotle',
  item: 'Chicken bowl, no rice, extra black beans',
  kcal: 520, protein_g: 48, carbs_g: 38, fat_g: 18, fiber_g: 12, price_usd: 11,
  verdicts: [
    { preference: 'high_protein', verdict: 'hit', reason: 'about 48 g' },
    { preference: 'low_spike', verdict: 'hit', reason: 'no rice' },
    { preference: 'simple', verdict: 'hit', reason: 'chicken, beans, veg' },
    { preference: 'no_seed_oils', verdict: 'miss', reason: 'sunflower or rice bran' },
    { preference: 'cheap', verdict: 'hit', reason: 'about $11' },
  ],
  why: 'Closest high-protein, lower-carb order, but cooked in sunflower oil.',
  confidence: 0.85,
  ...over,
});

test('buildFinderRequest: Haiku with thinking off and a JSON schema; Sonnet keeps thinking, low effort', () => {
  const req = buildFinderRequest(input);
  assert.equal(req.model, 'claude-haiku-5-5');
  assert.deepEqual(req.thinking, { type: 'disabled' });
  assert.equal(req.output_config.effort, 'low');
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.equal('temperature' in req, false);
  const sonnet = buildFinderRequest(input, FINDER_ESCALATION_MODEL);
  assert.equal(sonnet.model, 'claude-sonnet-5-5');
  assert.equal('thinking' in sonnet, false);
});

test('finderMessage sends names, kinds and buckets, the never list and the budget; the area only without places', () => {
  const m = finderMessage({ ...input, today: { kcal: 1100, protein: 80, proteinGoal: 160 }, ask: 'cheaper' });
  assert.match(m, /<preferences>high_protein, low_spike, simple, no_seed_oils, cheap<\/preferences>\n<budget>12<\/budget>\n<never>shellfish<\/never>\n<nearby>\nChipotle, restaurant, under_200m\nJoe's Pizza, restaurant, under_500m\nCorner Deli, food_market, under_200m\n<\/nearby>/);
  assert.match(m, /<today>1100 kcal and 80 g protein eaten so far; protein goal 160 g<\/today>\n<ask>cheaper<\/ask>$/);
  assert.doesNotMatch(m, /<area>/);
  const area = finderMessage({ ...input, places: [], area: 'East Village, NYC' });
  assert.match(area, /<area>East Village, NYC<\/area>/);
  assert.doesNotMatch(area, /<nearby>/);
  assert.match(finderMessage({ date: '2026-10-24', preferences: ['cheap'], places: [] }), /<budget>14<\/budget>/); // the default
});

test('readFinderReply keeps listed places with numbers, fills missing verdicts as unknown, drops the rest', () => {
  const text = 'Here: ' + JSON.stringify({
    picks: [
      pick(),
      pick({ place: 'chipotle ', verdicts: [], confidence: 0.5 }), // a case slip still matches; no verdicts → all unknown
      pick({ place: 'Sweetgreen' }), // not on the list
      pick({ confidence: 0.3 }), // too unsure to show
      pick({ kcal: null }), // no numbers
      pick({ item: 'Shrimp bowl with shellfish broth' }), // the never list is a filter
      pick({ item: 'Chicken bowl, no shellfish, skip the shrimp', confidence: 0.45 }), // avoiding it is fine
      null,
    ],
    skipped: [{ place: "Joe's Pizza", why: 'refined carbs, low protein' }, { place: '', why: 'x' }],
  });
  const read = readFinderReply(text, input)!;
  assert.equal(read.picks.length, 3);
  assert.equal(read.picks[2].item, 'Chicken bowl, no shellfish, skip the shrimp');
  assert.equal(read.picks[0].place, 'Chipotle');
  assert.deepEqual(read.picks[0].verdicts.map((v) => v.verdict), ['hit', 'hit', 'hit', 'miss', 'hit']);
  assert.equal(read.picks[0].fiber, 12);
  assert.deepEqual(tally(read.picks[0].verdicts), { hits: 4, unknown: 0, of: 5 });
  assert.equal(read.picks[1].place, 'Chipotle');
  assert.deepEqual(read.picks[1].verdicts.map((v) => v.verdict), ['unknown', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.deepEqual(read.skipped, [{ place: "Joe's Pizza", why: 'refined carbs, low protein' }]);
  assert.equal(readFinderReply('no json', input), null);
  assert.equal(readFinderReply('{"picks":"x"}', input), null);
  assert.equal(readFinderReply('{"picks":[{"place":"Chipotle","item":"bowl","kcal":1,"protein_g":1,"carbs_g":1,"fat_g":1,"price_usd":1,"confidence":0.9,},],}', input)!.picks.length, 1); // trailing commas
});

test('a hit the numbers contradict becomes a miss; area mode accepts any place', () => {
  const text = JSON.stringify({ picks: [pick({ protein_g: 20, carbs_g: 70, price_usd: 15, verdicts: pick().verdicts.map((v) => ({ ...v, verdict: 'hit' })) })], skipped: [] });
  const read = readFinderReply(text, input)!;
  assert.deepEqual(read.picks[0].verdicts.map((v) => v.verdict), ['miss', 'miss', 'hit', 'hit', 'miss']);
  const area = readFinderReply(JSON.stringify({ picks: [pick({ place: 'Veselka' })], skipped: [] }), { ...input, places: [] })!;
  assert.equal(area.picks[0].place, 'Veselka');
  // high_fiber with no fiber number is unknown, not a hit
  const fiber = readFinderReply(JSON.stringify({ picks: [pick({ fiber_g: undefined, verdicts: [{ preference: 'high_fiber', verdict: 'hit', reason: 'beans' }] })], skipped: [] }), { ...input, preferences: ['high_fiber'] })!;
  assert.equal(fiber.picks[0].verdicts[0].verdict, 'unknown');
});

test('health claims never reach the card', () => {
  assert.equal(dropClaims("Lower-carb and high-protein. It won't spike your blood sugar. Skip the fries."), 'Lower-carb and high-protein. Skip the fries.');
  assert.equal(dropClaims('A healthy pick.'), '');
  const read = readFinderReply(JSON.stringify({ picks: [pick({ why: 'High protein. Keeps your glucose steady.', verdicts: [{ preference: 'low_spike', verdict: 'hit', reason: 'blood sugar friendly' }] })], skipped: [{ place: "Joe's Pizza", why: 'not healthy' }] }), input)!;
  assert.equal(read.picks[0].why, 'High protein.');
  assert.equal(read.picks[0].verdicts[1].reason, '');
  assert.equal(read.skipped[0].why, '');
});

test('needsFinderEscalation: unfinished, unreadable, no picks or an unsure best pick go to Sonnet', () => {
  const good = JSON.stringify({ picks: [pick()], skipped: [] });
  assert.equal(needsFinderEscalation('end_turn', good, input), false);
  assert.equal(needsFinderEscalation('max_tokens', good, input), true);
  assert.equal(needsFinderEscalation('end_turn', 'nope', input), true);
  assert.equal(needsFinderEscalation('end_turn', JSON.stringify({ picks: [], skipped: [] }), input), true);
  assert.equal(needsFinderEscalation('end_turn', JSON.stringify({ picks: [pick({ confidence: 0.5 })], skipped: [] }), input), true);
});
