import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exercises } from '../data/exercises.ts';

// Words that name a whole family of lifts, so they must never snap to one exercise.
// ponytail: 'curls' and 'dips' are left out on purpose; the parser prompt still maps them (Dumbbell Curl, Chest Dips). Add them with the identity work.
const AMBIGUOUS = ['row', 'rows', 'press', 'chin', 'chins'];

const words = exercises.flatMap((e) => [e.name, ...e.aliases].map((w) => [w.toLowerCase(), e.name] as const));

test('no name or alias belongs to two exercises', () => {
  const seen = new Map<string, string>();
  for (const [w, owner] of words) {
    assert.ok(!seen.has(w) || seen.get(w) === owner, `"${w}" is on ${seen.get(w)} and ${owner}`);
    seen.set(w, owner);
  }
});

test('no one-word alias is an ambiguous word', () => {
  for (const [w, owner] of words) assert.ok(!AMBIGUOUS.includes(w), `"${w}" on ${owner} is ambiguous`);
});
