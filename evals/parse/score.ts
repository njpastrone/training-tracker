import type { Case, ExpectedExercise, Keywords, Status } from './cases.ts';
import { catalogById } from '../../data/catalog.ts';

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

// With an expected id the identity is what counts, not the spelling of the name. An expected new
// exercise must come back without an id.
function sameExercise(exp: ExpectedExercise, got: Record<string, unknown> | undefined) {
  if (exp.id) return got?.exerciseId === exp.id || (exp.ids ?? []).includes(got?.exerciseId as string);
  if (exp.status === 'new') return !got?.exerciseId && nameMatches(exp, got?.name);
  return nameMatches(exp, got?.name);
}

export function statusOf(c: Case, got: Record<string, unknown>): Status {
  if (got.match === 'unsure') return 'unsure';
  if (!got.exerciseId) return 'new';
  return c.library?.some((l) => l.id === got.exerciseId) ? 'known' : 'new-for-you';
}

// The user's words for it are in the log and overlap the expected words
const saidMatches = (exp: string, got: unknown) =>
  typeof got === 'string' && got.trim() !== '' && normName(got).length > 0 &&
  (normName(exp).includes(normName(got)) || normName(got).includes(normName(exp)));

function scoreExercise(c: Case, exp: ExpectedExercise, got: Record<string, unknown> | undefined, label: string) {
  let points = 0;
  let total = 0;
  const misses: string[] = [];
  const check = (field: string, ok: boolean, want: unknown, have: unknown) => {
    total++;
    if (ok) points++;
    else misses.push(`${label}.${field}: want ${JSON.stringify(want ?? null)} got ${JSON.stringify(have ?? null)}`);
  };
  if (exp.id) check('id', sameExercise(exp, got), [exp.id, ...(exp.ids ?? [])].join('|'), got?.exerciseId);
  else check('name', sameExercise(exp, got), exp.name, got?.name);
  if (exp.status) check('status', !!got && statusOf(c, got) === exp.status, exp.status, got && statusOf(c, got));
  if (exp.said) check('said', saidMatches(exp.said, got?.said), exp.said, got?.said);
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

// An acceptable alternative guess (one of `ids`) is judged as that exercise, muscle group included
function asPredictedAlternative(c: Case, pred: Predicted): Case {
  const exercises = c.exercises.map((exp) => {
    const got = pred.exercises.find((g) => exp.ids?.includes(g.exerciseId as string));
    const group = got && catalogById.get(got.exerciseId as string)?.primary;
    return group && !pred.exercises.some((g) => g.exerciseId === exp.id) ? { ...exp, muscleGroup: group } : exp;
  });
  return { ...c, exercises };
}

export function scoreCase(original: Case, pred: Predicted | null): CaseScore {
  if (!pred) return { score: 0, points: 0, total: 1, misses: ['no parse result'] };
  const c = asPredictedAlternative(original, pred);

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
      if (used.has(j) || !sameExercise(exp, g)) return;
      const { points, total } = scoreExercise(c, exp, g, '');
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
    const r = scoreExercise(c, exp, got, `${k}:${exp.name}`);
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

// Identity headline counts for one case, over its expected exercises paired as scoreCase pairs them:
// silent: a confident (known or new-for-you) pick of the wrong exercise. The release gate is 0.
// needless: unsure where a sure answer was expected (no ambiguity listed)
// wronglyNew: a new exercise proposed where a known id was expected
export function identityCounts(c: Case, pred: Predicted | null) {
  const counts = { silent: 0, needless: 0, wronglyNew: 0, exercises: 0, mismatches: [] as string[] };
  if (!pred) return counts;
  const used = new Set<number>();
  for (const exp of c.exercises) {
    // Prefer a prediction of the same exercise; otherwise the first unused one with the same words
    let j = pred.exercises.findIndex((g, i) => !used.has(i) && sameExercise(exp, g));
    if (j < 0) j = pred.exercises.findIndex((g, i) => !used.has(i) && (nameMatches(exp, g.name) || (exp.said && saidMatches(exp.said, g.said))));
    if (j < 0 && c.exercises.length === pred.exercises.length) j = c.exercises.indexOf(exp); // same shape: pair by position
    if (j < 0 || used.has(j)) continue;
    used.add(j);
    const got = pred.exercises[j];
    const status = statusOf(c, got);
    counts.exercises++;
    if ((status === 'known' || status === 'new-for-you') && !sameExercise(exp, got)) {
      counts.silent++;
      counts.mismatches.push(`${c.id}: ${String(got.said ?? got.name)} -> ${String(got.exerciseId)}, want ${exp.id ?? exp.name}`);
    }
    const expectsSure = exp.status ? exp.status !== 'unsure' : !exp.ids;
    if (status === 'unsure' && expectsSure) counts.needless++;
    if (status === 'new' && exp.id) counts.wronglyNew++;
  }
  return counts;
}

// A correction's reply: an answer exactly when the fix asked a question, and the offer to call an
// exercise by the user's words exactly when the question showed them. One point each.
export function scoreReply(
  c: { reply?: boolean; callIt?: { exercise: string; words: string } },
  got: { reply?: string; callIt?: { exercise: number; words: string }; exercises: Record<string, unknown>[] } | null,
): Omit<CaseScore, 'score'> {
  const misses: string[] = [];
  if (!!got?.reply !== !!c.reply) misses.push(c.reply ? 'reply: missing' : `reply: want none got ${JSON.stringify(got?.reply)}`);
  const callIt = got?.callIt && { exercise: String(got.exercises[got.callIt.exercise]?.name), words: got.callIt.words };
  const callOk = c.callIt
    ? !!callIt && normName(callIt.exercise) === normName(c.callIt.exercise) && normName(callIt.words) === normName(c.callIt.words)
    : !callIt;
  if (!callOk) misses.push(`callIt: want ${JSON.stringify(c.callIt ?? null)} got ${JSON.stringify(callIt ?? null)}`);
  return { points: 2 - misses.length, total: 2, misses };
}
