import type { Case, ExpectedExercise, Keywords } from './cases.ts';

// Field-by-field scoring. Every asserted field is one point: a field counts when the expected
// value or the predicted value is non-empty, so a correct "nothing here" is free and an invented
// value costs a point. Extra predicted exercises add their fields to the denominator.

export interface Predicted {
  exercises: Record<string, unknown>[];
  muscleGroups: string[];
  notes?: string;
}

export interface CaseScore {
  score: number; // 0..1
  points: number;
  total: number;
  misses: string[]; // human-readable diffs
}

const NUMERIC = ['sets', 'reps', 'weight', 'duration'] as const;
const STRINGS = ['unit'] as const;
// Distance is compared in metres, so "5 km" and "5000 m" both match a 5k.
const METRES: Record<string, number> = { mi: 1609.344, km: 1000, m: 1 };
const metres = (e: Record<string, unknown> | undefined) =>
  typeof e?.distance === 'number' ? e.distance * (METRES[e.distanceUnit as string] ?? NaN) : undefined;

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
const has = (v: unknown) => v !== undefined && v !== null && v !== '' && v !== 0;
const numEq = (a: unknown, b: unknown) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.01;

function keywordHits(text: string | undefined, keywords: Keywords): { hit: number; missing: string[] } {
  const t = (text ?? '').toLowerCase();
  const missing = keywords
    .map((k) => (Array.isArray(k) ? k : [k]))
    .filter((alts) => !alts.some((a) => t.includes(a.toLowerCase())))
    .map((alts) => alts.join('|'));
  return { hit: keywords.length - missing.length, missing };
}

function nameMatches(exp: ExpectedExercise, name: unknown) {
  return typeof name === 'string' && [exp.name, ...(exp.alt ?? [])].some((n) => normName(n) === normName(name));
}

function scoreExercise(exp: ExpectedExercise, got: Record<string, unknown> | undefined, label: string) {
  let points = 0;
  let total = 0;
  const misses: string[] = [];
  const check = (field: string, ok: boolean, want: unknown, have: unknown) => {
    total++;
    if (ok) points++;
    else misses.push(`${label}.${field}: want ${JSON.stringify(want ?? null)} got ${JSON.stringify(have ?? null)}`);
  };
  check('name', nameMatches(exp, got?.name), exp.name, got?.name);
  check('muscleGroup', got?.muscleGroup === exp.muscleGroup, exp.muscleGroup, got?.muscleGroup);
  for (const f of NUMERIC) {
    if (has(exp[f]) || has(got?.[f])) check(f, has(exp[f]) ? numEq(exp[f], got?.[f]) : !has(got?.[f]), exp[f], got?.[f]);
  }
  for (const f of STRINGS) {
    if (has(exp[f]) || has(got?.[f])) check(f, (exp[f] ?? null) === (got?.[f] ?? null), exp[f], got?.[f]);
  }
  const [wantM, gotM] = [metres(exp as unknown as Record<string, unknown>), metres(got)];
  if (has(exp.distance) || has(got?.distance)) {
    check('distance', wantM !== undefined && gotM !== undefined && Math.abs(wantM - gotM) <= wantM * 0.01,
      `${exp.distance ?? null} ${exp.distanceUnit ?? ''}`, `${got?.distance ?? null} ${got?.distanceUnit ?? ''}`);
  }
  const wantDay = exp.dayOffset ?? 0;
  const gotDay = typeof got?.dayOffset === 'number' ? got.dayOffset : 0;
  if (wantDay !== 0 || gotDay !== 0) check('dayOffset', wantDay === gotDay, wantDay, gotDay);
  if (exp.notes) {
    const { hit, missing } = keywordHits(got?.notes as string | undefined, exp.notes);
    points += hit;
    total += exp.notes.length;
    if (missing.length) misses.push(`${label}.notes: missing ${missing.join(', ')} in ${JSON.stringify(got?.notes ?? null)}`);
  }
  return { points, total, misses };
}

const extraFields = (got: Record<string, unknown>) =>
  2 + [...NUMERIC, ...STRINGS, 'distance'].filter((f) => has(got[f])).length;

export function scoreCase(c: Case, pred: Predicted | null): CaseScore {
  if (!pred) return { score: 0, points: 0, total: 1, misses: ['no parse result'] };

  if (c.exercises.length === 0) {
    const ok = pred.exercises.length === 0;
    return { score: ok ? 1 : 0, points: ok ? 1 : 0, total: 1, misses: ok ? [] : [`expected no exercises, got ${pred.exercises.map((e) => e.name).join(', ')}`] };
  }

  // Pair expected with predicted: the best-scoring unused prediction with a matching name,
  // then leftovers by position.
  const used = new Set<number>();
  const pairs: (number | undefined)[] = c.exercises.map((exp) => {
    let best: number | undefined;
    let bestPoints = -1;
    pred.exercises.forEach((g, j) => {
      if (used.has(j) || !nameMatches(exp, g.name)) return;
      const { points, total } = scoreExercise(exp, g, '');
      if (points / total > bestPoints) [best, bestPoints] = [j, points / total];
    });
    if (best !== undefined) used.add(best);
    return best;
  });
  const leftovers = pred.exercises.map((_, j) => j).filter((j) => !used.has(j));
  pairs.forEach((p, k) => {
    if (p === undefined && leftovers.length) {
      pairs[k] = leftovers.shift();
      used.add(pairs[k]!);
    }
  });

  let points = 0;
  let total = 0;
  const misses: string[] = [];
  c.exercises.forEach((exp, k) => {
    const got = pairs[k] === undefined ? undefined : pred.exercises[pairs[k]!];
    const r = scoreExercise(exp, got, `${k}:${exp.name}`);
    points += r.points;
    total += r.total;
    misses.push(...(got ? r.misses : [`${k}:${exp.name}: missing`]));
  });
  pred.exercises.forEach((g, j) => {
    if (!used.has(j)) {
      total += extraFields(g);
      misses.push(`extra exercise: ${JSON.stringify(g)}`);
    }
  });

  const want = new Set(c.muscleGroups ?? c.exercises.map((e) => e.muscleGroup));
  const got = new Set(pred.muscleGroups);
  const union = new Set([...want, ...got]);
  const jaccard = union.size === 0 ? 1 : [...want].filter((g) => got.has(g)).length / union.size;
  points += jaccard;
  total += 1;
  if (jaccard < 1) misses.push(`muscleGroups: want ${[...want].join(',')} got ${[...got].join(',')}`);

  if (c.notes !== '*') {
    if (c.notes) {
      const { hit, missing } = keywordHits(pred.notes, c.notes);
      points += hit;
      total += c.notes.length;
      if (missing.length) misses.push(`notes: missing ${missing.join(', ')} in ${JSON.stringify(pred.notes ?? null)}`);
    } else {
      total += 1;
      if (has(pred.notes)) misses.push(`notes: want none got ${JSON.stringify(pred.notes)}`);
      else points += 1;
    }
  }

  return { score: points / total, points, total, misses };
}
