import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cases as main } from './cases.ts';
import { cases as holdout } from './holdout.ts';
import { cases as identity, identityFor } from './identity.ts';
import type { Case } from './cases.ts';

// Offline, no API calls: is the right exercise in the list the model picks from?
// An expected new exercise must not be in it under another name (it has no id to find).
function misses(set: Case[]) {
  const out: string[] = [];
  let total = 0;
  for (const c of set) {
    const listed = new Set(identityFor(c).candidates.map((x) => x.id));
    for (const e of c.exercises) {
      if (!e.id) continue;
      total++;
      if (![e.id, ...(e.ids ?? [])].some((id) => listed.has(id))) out.push(`${c.id}: ${e.id}`);
    }
  }
  return { out, total };
}

test('identity set: every expected exercise is a candidate', () => {
  assert.deepEqual(misses(identity).out, []);
});

test('main and holdout sets: every expected exercise is a candidate', () => {
  assert.deepEqual(misses([...main, ...holdout]).out, []);
});

test('candidate lists stay short', () => {
  for (const c of [...identity, ...main, ...holdout]) {
    const n = identityFor(c).candidates.length;
    assert.ok(n <= 120, `${c.id}: ${n} candidates`);
  }
});
