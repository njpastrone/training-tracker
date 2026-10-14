import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('@react-native-async-storage/async-storage', { defaultExport: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } });
const { cases, TODAY } = await import('./cases.ts');
const { scorePlanCase, scoreTemplateCase } = await import('./score.ts');
const WINDOW_END = '2026-10-27';

const plan = (c: Extract<(typeof cases)[number], { kind: 'plan' }>) => c;
const tweakMove = plan(cases.find(c => c.id === 'tweak-move-day') as Parameters<typeof plan>[0]);

test('a tweak that moves only Friday scores full marks; one that also changes a lift does not', () => {
  const moved = { reply: 'Moved Friday to Saturday.', chips: ['Easier', 'Harder', 'Shorter'], plan: { ...tweakMove.draft!, sessions: tweakMove.draft!.sessions.map(s => (s.date === '2026-10-16' ? { ...s, date: '2026-10-17' } : s)) } };
  const full = scorePlanCase(tweakMove, JSON.stringify(moved), TODAY, WINDOW_END);
  assert.equal(full.score, 1, full.checks.filter(x => !x.pass).map(x => x.name).join());
  const altered = JSON.parse(JSON.stringify(moved));
  altered.plan.days.UA.exercises[0].weight = 205;
  altered.reply = 'Moved it. Also bumped bench. Enjoy!';
  const partial = scorePlanCase(tweakMove, 'Sure:\n```json\n' + JSON.stringify(altered) + '\n```', TODAY, WINDOW_END);
  assert.deepEqual(partial.checks.filter(x => !x.pass).map(x => x.name), ['shortReply', 'exercisesUntouched']);
  assert.equal(scorePlanCase(tweakMove, 'not a plan', TODAY, WINDOW_END).score, 0);
});

test('a template parse scores each expected field', () => {
  const c = cases.find(c => c.id === 'template-5x5') as Extract<(typeof cases)[number], { kind: 'template' }>;
  const text = JSON.stringify([{ name: 'Squat', sets: 5, reps: '5' }, { name: 'Bench Press', sets: 5, reps: 5 }, { name: 'Barbell Row', sets: 3, reps: 5 }]);
  const s = scoreTemplateCase(c, text);
  assert.deepEqual(s.checks.filter(x => !x.pass).map(x => x.name), ['row: sets']);
  assert.equal(scoreTemplateCase(c, 'nope').score, 0);
});
