/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTool } from './coachTools';
import { JORDAN, NEW_USER, SAM, SAM_NOW } from './coachPack.fixtures';
import { MAX_TOOL_RESULT_CHARS, TOOL_NAMES } from '../server/src/coach';
import { inventedNumbers } from './insights';

const run = (name: string, input: unknown, data = SAM) => runTool(name, input, data, SAM_NOW);

test('query_workouts lists the days in a span, clipped to today and to 31 days', () => {
  const r = run('query_workouts', { from: '2026-10-01', to: '2026-10-12' }) as { days: { date: string; name: string; exercises: string[] }[]; trainingDays: number };
  assert.deepEqual(r.days.map(d => d.date), ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
  assert.equal(r.trainingDays, 5);
  assert.deepEqual(r.days[4], { date: '2026-10-06', name: 'Legs', exercises: ['Squat 185x5 ×3 (felt heavy again)', 'Leg Press', 'Standing Calf Raise'] });
  const long = run('query_workouts', { from: '2026-01-01', to: '2026-12-31' }) as { from: string; to: string };
  assert.deepEqual([long.from, long.to], ['2026-09-12', '2026-10-12']);
  const swapped = run('query_workouts', { from: '2026-10-12', to: '2026-10-01' }) as { from: string };
  assert.equal(swapped.from, '2026-10-01');
  assert.match(String(run('query_workouts', { from: 'tuesday', to: 'today' }).error), /YYYY-MM-DD/);
});

test('exercise_history finds the lift by any of its names and gives sessions, records and the next target', () => {
  const squat = run('exercise_history', { exercise: 'squats' }) as Record<string, unknown>;
  assert.equal(squat.exercise, 'Squat');
  assert.equal(squat.lastDoneDaysAgo, 6);
  assert.deepEqual((squat.sessions as string[]).slice(0, 2), ['2026-10-06 185x5 ×3 (felt heavy again)', '2026-09-29 185x5 ×3']);
  assert.deepEqual(squat.prs, { heaviest: '185 lbs x5 on 2026-10-06', bestEstimated1RM: '215.8 lbs on 2026-10-06' });
  assert.equal(squat.heldSessions, 4);
  assert.equal(squat.next, '165x7 ×3');
  const bench = run('exercise_history', { exercise: 'bench' }) as Record<string, unknown>;
  assert.equal(bench.best, 'latest is the all-time best');
  assert.equal(bench.next, '150x8 ×3');
  const runs = run('exercise_history', { exercise: 'running' }) as Record<string, unknown>;
  assert.equal((runs.sessions as string[])[0], '2026-10-03 26.9 min · 5 km');
  assert.deepEqual(runs.prs, { longestDistance: '5 km on 2026-10-03' });
  // A names-only logger gets dates, no numbers and no records
  const pullUps = run('exercise_history', { exercise: 'pull ups' }, JORDAN) as Record<string, unknown>;
  assert.equal(pullUps.exercise, 'Pull-up');
  assert.deepEqual(pullUps.sessions, ['2026-10-07', '2026-09-30', '2026-09-16', '2026-09-02']);
  assert.equal(pullUps.prs, undefined);
  const none = run('exercise_history', { exercise: 'kettlebell swings' }) as { error: string; logged: string[] };
  assert.match(none.error, /Nothing logged as "kettlebell swings"/);
  assert.equal(none.logged[0], 'Squat');
});

test('muscle_volume gives sets per muscle for each rolling week, oldest first, and what has waited', () => {
  const r = run('muscle_volume', { weeks: 4 }) as { perWeek: { from: string; to: string; trainingDays: number; sets: Record<string, number> }[]; waitingLongerThanUsual: string[]; daysSinceMuscle: Record<string, number> };
  assert.equal(r.perWeek.length, 4);
  assert.deepEqual([r.perWeek[0].from, r.perWeek[3].to], ['2026-09-15', '2026-10-12']);
  assert.deepEqual(r.perWeek[3], { from: '2026-10-06', to: '2026-10-12', trainingDays: 1, sets: { quads: 3, glutes: 1.5 } });
  assert.deepEqual(r.waitingLongerThanUsual, ['biceps', 'hamstrings']);
  assert.equal(r.daysSinceMuscle.quads, 6);
  assert.equal((run('muscle_volume', { weeks: 99 }) as { perWeek: unknown[] }).perWeek.length, 8);
  assert.equal((run('muscle_volume', {}) as { perWeek: unknown[] }).perWeek.length, 4);
});

test('food_log gives each day with its meals and foods, clipped to 14 days', () => {
  const r = run('food_log', { from: '2026-10-11', to: '2026-10-12' }) as { days: { date: string; protein: number; kcal: number; meals: { time: string; foods: string[] }[] }[] };
  assert.equal(r.days.length, 2);
  assert.equal(r.days[0].date, '2026-10-11');
  assert.equal(r.days[0].meals.length, 4);
  assert.equal(r.days[0].meals[1].time, '13:00');
  assert.equal(r.days[0].meals[1].foods[0], 'Chicken breast 200 g: 62 g protein, 330 kcal');
  assert.equal(r.days[1].meals.length, 1); // today: breakfast only
  assert.equal(r.days[1].protein, 29);
  const long = run('food_log', { from: '2026-01-01', to: '2026-10-12' }) as { from: string };
  assert.equal(long.from, '2026-09-29');
  assert.deepEqual(run('food_log', { from: '2026-10-11', to: '2026-10-12' }, JORDAN).days, []);
});

test('food_patterns gives the usual meals, portions, top protein and every food logged', () => {
  const r = run('food_patterns', {}) as Record<string, any>;
  assert.match(r.usualMeals.lunch, /^Chicken breast 62 g protein 330 kcal/);
  assert.ok(r.usualPortions.includes('Chicken breast 200 g: 62 g protein, 330 kcal'));
  assert.deepEqual(r.topProtein, ['chicken breast', 'ground beef', 'egg']);
  assert.ok(r.foodsLogged.includes('Whey protein powder'));
  assert.equal(r.avoid, undefined);
  const withFacts = run('food_patterns', {}, { ...SAM, settings: { ...SAM.settings, profile: { facts: [{ id: 'f1', kind: 'food', text: 'no dairy', quote: 'no dairy please', saidOn: '2026-10-01' }, { id: 'f2', kind: 'injury', text: 'left knee', quote: 'knee', saidOn: '2026-10-01' }] } } }) as { avoid: string[] };
  assert.deepEqual(withFacts.avoid, ['no dairy']);
  assert.deepEqual(run('food_patterns', {}, NEW_USER), { topProtein: [], foodsLogged: [] });
});

test('estimate_meal prices foods the table knows and names the rest', () => {
  const r = run('estimate_meal', { items: ['200 g chicken breast', '1.5 cups white rice', '1 cup broccoli', 'a quest bar'] }) as Record<string, any>;
  assert.deepEqual(r.items.map((i: { food: string; protein: number; kcal: number }) => [i.food, i.protein, i.kcal]), [['Chicken breast', 62, 330], ['Rice, white', 6, 308], ['Broccoli', 3, 31]]);
  assert.deepEqual(r.total, { protein: 71, kcal: 669, carbs: 73, fat: 8 });
  assert.deepEqual(r.unknown, ['a quest bar']);
  assert.match(String(run('estimate_meal', { items: [] }).error), /list of foods/);
  assert.match(String(run('estimate_meal', { items: 'chicken' }).error), /list of foods/);
});

test('every tool result fits the Worker cap and holds only numbers from the log; unknown tools say so', () => {
  for (const name of TOOL_NAMES) {
    const input = { from: '2026-09-12', to: '2026-10-12', exercise: 'squat', weeks: 8, items: ['200 g chicken breast'] };
    const r = run(name, input);
    assert.ok(JSON.stringify(r).length <= MAX_TOOL_RESULT_CHARS, name);
  }
  // A long span is trimmed, not refused
  const trimmed = runTool('query_workouts', { from: '2026-08-01', to: '2026-10-12' }, { ...SAM, workouts: SAM.workouts.map(w => ({ ...w, exercises: Array(6).fill(w.exercises).flat() })) }, SAM_NOW) as { days: unknown[]; truncated?: boolean };
  assert.ok(JSON.stringify(trimmed).length <= MAX_TOOL_RESULT_CHARS);
  assert.equal(trimmed.truncated, true);
  assert.ok(trimmed.days.length > 0);
  // The example answer's numbers trace to a tool result
  const squat = run('exercise_history', { exercise: 'squat' });
  assert.deepEqual(inventedNumbers('Squat 185x5 held 4 sessions; next 165x7.', { squat }), []);
  assert.deepEqual(run('nope', {}), { error: 'No tool called nope' });
});

test('a result too big for the cap loses its oldest days first, and one huge day is cut to fit', () => {
  const day = SAM.foodEntries.find(e => e.date === '2026-10-12') ?? SAM.foodEntries[0];
  const meals = (date: string, n: number) => Array.from({ length: n }, (_, i) => ({ ...day, id: `${date}-${i}`, date, createdAt: `${date}T0${i % 10}:00:00.000Z` }));
  const dates = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`).filter(d => d <= '2026-10-12');
  const many = run('food_log', { from: '2026-09-29', to: '2026-10-12' }, { ...SAM, foodEntries: dates.flatMap(d => meals(d, 4)) }) as { days: { date: string }[]; truncated?: boolean };
  assert.equal(many.truncated, true);
  assert.equal(many.days[many.days.length - 1].date, '2026-10-12'); // the most recent day stays
  assert.notEqual(many.days[0].date, '2026-10-01');
  const huge = run('food_log', { from: '2026-10-12', to: '2026-10-12' }, { ...SAM, foodEntries: meals('2026-10-12', 60) }) as { days: unknown[] };
  assert.ok(JSON.stringify(huge).length <= MAX_TOOL_RESULT_CHARS);
  assert.equal(huge.days.length, 1);
});
