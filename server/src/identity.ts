// Exercise identity for the parser, shared by the app (which builds the candidate list and validates
// the model's picks) and evals/parse (which scores them). The Worker only formats the candidates
// into the prompt; it never decides identity.
//
// The model picks from a short candidate list (the user's exercises plus catalog entries the log
// mentions) by per-request key, e1…eN. Code then checks every pick: the key must exist, the user's
// alias table wins, the user's words must appear in the log, marker words (incline, DB, smith…)
// must agree with the pick, and an ambiguous word ("rows") only maps on its own when the user has
// exactly one such exercise. Anything that fails is unsure, never silently saved.

import {
  AMBIGUOUS_WORDS, CATALOG, catalogById, exerciseKey, normalizeWords, singularWords,
  type CatalogExercise,
} from '../../data/catalog.ts';
import type { MuscleGroup } from '../../types/workout.ts';

export interface Candidate {
  id: string; // catalog id or 'custom-…'
  name: string;
  muscleGroup: MuscleGroup;
  also?: string[]; // the user's own wordings for it (at most 3)
  yours?: boolean; // in the user's library
  family?: string;
}

export type Match = 'sure' | 'unsure';

// The user's alias table is keyed by their normalized words ("bb bench"); spellings of the same
// words ("BB-Bench", "bb benches") find the same entry
export const aliasFor = (words: string, aliases: Record<string, string>) => {
  const key = exerciseKey(words);
  return key ? Object.entries(aliases).find(([w]) => exerciseKey(w) === key)?.[1] : undefined;
};

const MAX_YOURS = 80;
const MAX_CATALOG = 40;

// --------------------------------------------------------------------------- retrieval

// Past tenses and slang the log uses for catalog words. Singular forms are handled by exerciseKey.
const LEMMAS: Record<string, string> = {
  ran: 'run', jogged: 'jog', walked: 'walk', hiked: 'hike', biked: 'bike', cycled: 'cycle', swam: 'swim',
  rowed: 'rowing', benched: 'bench', squatted: 'squat', deadlifted: 'deadlift', pressed: 'press',
  curled: 'curl', pulled: 'pull', stretched: 'stretch', rucked: 'ruck', skied: 'ski', climbed: 'climbing',
  skipped: 'skipping', lunged: 'lunge', dipped: 'dip', planked: 'plank', boxed: 'boxing', danced: 'dance',
  curlz: 'curl', ext: 'extension', exts: 'extension', tri: 'tricep', tris: 'tricep', bi: 'bicep', bis: 'bicep',
  pullup: 'pull up', pushup: 'push up', chinup: 'chin up', situp: 'sit up',
};

const catalogNameKeys = new Map<string, string>(); // catalog names and aliases → id
for (const e of CATALOG) {
  if (e.replacedBy) continue;
  for (const w of [e.name, ...e.aliases]) catalogNameKeys.set(exerciseKey(w), e.id);
}
const ambiguousKeys = new Map(Object.entries(AMBIGUOUS_WORDS).map(([w, ids]) => [exerciseKey(w), ids]));
const familyOf = new Map<string, string[]>();
for (const e of CATALOG) if (e.family && !e.replacedBy) familyOf.set(e.family, [...(familyOf.get(e.family) ?? []), e.id]);

export function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

// Typos allowed for a key of this length: one from 5 letters, two from 8
const typos = (key: string) => (key.length >= 8 ? 2 : key.length >= 5 ? 1 : 0);

// The log as words: lowercase, no numbers or punctuation, past tenses and slang expanded
export const logWords = (log: string) =>
  normalizeWords(log.replace(/\d+(\.\d+)?/g, ' ')).split(' ').filter(Boolean).flatMap((w) => (LEMMAS[w] ?? w).split(' '));

// Catalog ids whose names or aliases appear in the log as 1-4 word sequences (allowing typos),
// then the exercises an ambiguous word could mean, then the variants of each hit
export function catalogHits(log: string): string[] {
  const words = logWords(log);
  const direct: string[] = [];
  const ambiguous: string[] = [];
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const key = exerciseKey(words.slice(i, i + n).join(' '));
      if (!key) continue;
      const exact = catalogNameKeys.get(key);
      if (exact) direct.push(exact);
      ambiguous.push(...(ambiguousKeys.get(key) ?? []));
      // A single word only counts as a misspelling letter for letter ("deadz"; "plates" isn't Pilates)
      if (!exact && n <= 3 && typos(key)) {
        for (const [k, id] of catalogNameKeys) if ((n > 1 || k.length === key.length) && editDistance(key, k) <= typos(key)) direct.push(id);
      }
    }
  }
  // Body-part sessions are one family, but "leg day" doesn't make "arm day" a candidate
  const siblings = direct.flatMap((id) => (catalogById.get(id)?.family === 'body-part' ? [] : familyOf.get(catalogById.get(id)?.family ?? '') ?? []));
  return [...new Set([...direct, ...ambiguous, ...siblings])];
}

// The list the model picks from: all of the user's exercises (most recent first) — over the cap,
// only those the log mentions — then catalog entries the log mentions and their variants
export function buildCandidates(log: string, yours: Omit<Candidate, 'yours'>[]): Candidate[] {
  const words = ` ${logWords(log).join(' ')} `;
  const mentioned = (c: Omit<Candidate, 'yours'>) =>
    [c.name, ...(c.also ?? [])].some((w) => words.includes(` ${normalizeWords(w)} `) || words.includes(` ${singularWords(w)} `));
  const own = (yours.length > MAX_YOURS ? yours.filter(mentioned) : yours).slice(0, MAX_YOURS);
  const ownIds = new Set(own.map((c) => c.id));
  const catalog = catalogHits(log)
    .filter((id) => !ownIds.has(id))
    .slice(0, MAX_CATALOG)
    .map((id) => {
      const e = catalogById.get(id)!;
      return { id, name: e.name, muscleGroup: e.primary, family: e.family };
    });
  return [...own.map((c) => ({ ...c, yours: true })), ...catalog];
}

// The candidate block for the prompt. Keys are positions, so they're never real ids.
export function formatCandidates(candidates: Pick<Candidate, 'name' | 'muscleGroup' | 'also' | 'yours'>[]): string {
  const line = (c: Pick<Candidate, 'name' | 'muscleGroup' | 'also'>, i: number) =>
    `e${i + 1} ${c.name} (${c.muscleGroup})${c.also?.length ? ` | also: ${c.also.join(', ')}` : ''}`;
  const yours = candidates.map((c, i) => [c, i] as const).filter(([c]) => c.yours);
  const catalog = candidates.map((c, i) => [c, i] as const).filter(([c]) => !c.yours);
  return [
    '<exercises>',
    ...(yours.length ? ['Yours (most recent first):', ...yours.map(([c, i]) => line(c, i))] : []),
    ...(catalog.length ? ['Catalog:', ...catalog.map(([c, i]) => line(c, i))] : []),
    '</exercises>',
  ].join('\n');
}

// --------------------------------------------------------------------------- validation

// Words that say which variant of a lift it was. Each maps to a canonical marker.
const MARKERS: [RegExp, string][] = [
  [/\b(db|dbs|dumb+e+l+s?)\b/, 'dumbbell'],
  [/\b(bb|barbells?)\b/, 'barbell'],
  [/\b(kb|kbs|kettlebells?)\b/, 'kettlebell'],
  [/\bcables?\b/, 'cable'],
  [/\bmachines?\b/, 'machine'],
  [/\bsmith\b/, 'smith'],
  [/\b(trap|hex) ?bar\b/, 'trap-bar'],
  [/\bez ?(bar)?\b/, 'ez-bar'],
  [/\b(bands?|banded)\b/, 'band'],
  [/\blandmine\b/, 'landmine'],
  [/\bincline\b/, 'incline'],
  [/\bdecline\b/, 'decline'],
  [/\b(single|one|1) ?(arm|leg|hand)?\b|\bunilateral\b/, 'one-side'],
  [/\bassist(ed)?\b/, 'assisted'],
  [/\bfront\b/, 'front'],
  [/\bsumo\b/, 'sumo'],
  [/\bclose ?grip\b/, 'close-grip'],
  [/\b(safety|ssb)\b/, 'safety-bar'],
  [/\bseated\b/, 'seated'],
];
// Said markers that a pick need not repeat in its own name: "cable row" is Seated Cable Row, "chest
// press" is Machine Chest Press
const IMPLICIT = new Set(['cable', 'machine', 'seated']);
const IMPLEMENTS = new Set(['dumbbell', 'barbell', 'kettlebell', 'cable', 'machine', 'smith', 'trap-bar', 'ez-bar', 'band', 'landmine', 'safety-bar']);

const markersIn = (words: string) => {
  const w = ` ${normalizeWords(words)} `;
  return new Set(MARKERS.filter(([re]) => re.test(w)).map(([, m]) => m));
};

// Markers an exercise carries: from its name, angle and one-sidedness, and its implement
function exerciseMarkers(e: CatalogExercise) {
  const m = markersIn(e.name);
  if (e.angle) m.add(e.angle);
  if (e.oneSide) m.add('one-side');
  if (e.equipment === 'specialty-bar') m.add('safety-bar');
  else if (IMPLEMENTS.has(e.equipment)) m.add(e.equipment);
  return m;
}

// The words are one of this exercise's own names: the catalog (or the user) already decided
function namedBy(said: string, pick: Candidate) {
  const key = exerciseKey(said);
  return [pick.name, ...(pick.also ?? []), ...(catalogById.get(pick.id)?.aliases ?? [])].some((n) => exerciseKey(n) === key);
}

// Words that describe how a lift was done, never which lift (the granularity rule's notes)
const NOTE_WORDS = /\b(paused?|tempo|deficit|box|wide|narrow|grip|belt(ed)?|straps?|strapped|touch and go|hammer strength|life fitness|cybex|nautilus|matrix|technogym|precor|panatta|arsenal|rogue|prime)\b/g;

// Does what the user said fit this exercise? Every marker they used must fit it, and it must not
// be a variant they didn't say (incline, one-sided, an implement other than the default…).
// Words that are one of its own names or aliases always fit.
function markersAgree(said: string, pick: Candidate, candidates: Candidate[]) {
  const entry = catalogById.get(pick.id);
  if (namedBy(said, pick)) return true;
  if (!entry) return true; // the user's own exercise: its name is all we know

  const saidMarkers = markersIn(said);
  const fits = exerciseMarkers(entry);
  for (const n of [entry.name, ...entry.aliases]) for (const m of markersIn(n)) fits.add(m);
  if ([...saidMarkers].some((m) => !fits.has(m))) return false;

  // Markers the name itself carries must be said, except the implement of the user's only exercise
  // in this family ("bench" for the one dumbbell bench they always do)
  const onlyOneOfYours = pick.yours && !candidates.some((c) => c.yours && c.id !== pick.id && c.family && c.family === entry.family);
  for (const m of markersIn(entry.name)) {
    if (saidMarkers.has(m) || IMPLICIT.has(m)) continue;
    if (IMPLEMENTS.has(m) && onlyOneOfYours) continue;
    return false;
  }
  if (entry.angle && !saidMarkers.has(entry.angle)) return false;
  if (entry.oneSide && !saidMarkers.has('one-side')) return false;
  return true;
}

// The user's words appear in the log (one typo per word allowed)
export function saidInLog(said: string, log: string) {
  const s = normalizeWords(said);
  const l = normalizeWords(log);
  if (!s) return false;
  if (` ${l} `.includes(` ${s} `)) return true;
  const logW = l.split(' ');
  return s.split(' ').every((w) => logW.some((lw) => lw === w || (w.length >= 4 && editDistance(w, lw) <= 1)));
}

export interface IdentityResult {
  exerciseId?: string; // undefined: a new exercise the user hasn't logged and the catalog doesn't have
  name: string;
  muscleGroup?: MuscleGroup;
  match: Match;
  said?: string;
  alt?: string; // a second choice for an unsure pick
}

export interface IdentityContext {
  input: string; // the whole log
  candidates: Candidate[]; // in key order: e1 is candidates[0]
  aliases?: Record<string, string>; // the user's alias table: normalized words → id
}

// The exercise words in what the model copied: "dips 3x10" → "dips", "rowed 2000m in 7:45" → "rowed"
const NOT_NAME_WORDS = new Set(['x', 'at', 'for', 'in', 'of', 'on', 'with', 'and', 'then', 'set', 'sets', 'rep', 'reps', 'lb', 'lbs', 'kg', 'kgs', 'kilos', 'pounds', 'min', 'mins', 'minute', 'minutes', 'sec', 'secs', 'seconds', 's', 'm', 'km', 'k', 'mi', 'mile', 'miles']);
export const exerciseWords = (said: string) =>
  normalizeWords(said).split(' ').filter((w) => w && !/\d/.test(w) && !NOT_NAME_WORDS.has(w)).join(' ');

// Exercises where the number is help, not load (assisted pull-ups): it belongs in notes
export const isAssisted = (id?: string) => (id ? catalogById.get(id)?.metric === 'assisted-reps' : false);

// Sessions logged by body part ("leg day"): the only entries whose workout lists extra muscle groups
export const isBodyPartSession = (id?: string, name = '') =>
  (id ? catalogById.get(id)?.family === 'body-part' : false) || /\b(workout|day)\b/i.test(name);

// One parsed exercise's identity, from the model's said/ex/alt/name. Never trusts the model's id.
export function resolvePick(
  raw: { said?: string; ex?: string; alt?: string; name?: string },
  { input, candidates, aliases = {} }: IdentityContext,
): IdentityResult {
  const byKey = (k?: string) => (k && /^e\d+$/.test(k) ? candidates[Number(k.slice(1)) - 1] : undefined);
  const said = raw.said && (exerciseWords(raw.said) || undefined); // checked without numbers; stored verbatim
  const words = said ?? raw.name ?? '';
  const result = (c: Candidate | undefined, match: Match, alt?: Candidate): IdentityResult => {
    const entry = c && catalogById.get(c.id);
    return {
      exerciseId: c?.id,
      name: c?.name ?? raw.name ?? said ?? 'Exercise',
      muscleGroup: entry?.primary ?? c?.muscleGroup,
      match,
      said: raw.said,
      ...(alt ? { alt: alt.id } : {}),
    };
  };
  const asCandidate = (id: string): Candidate => {
    const own = candidates.find((c) => c.id === id);
    if (own) return own;
    const e = catalogById.get(id);
    return e ? { id, name: e.name, muscleGroup: e.primary, family: e.family } : { id, name: raw.name ?? said ?? 'Exercise', muscleGroup: 'full_body' };
  };

  // The user's own answer for these words always wins
  const aliasId = said ? aliasFor(said, aliases) : undefined;
  if (aliasId) return result(asCandidate(aliasId), 'sure');

  let pick = byKey(raw.ex);
  const alt = byKey(raw.alt);
  if (!pick) {
    // Nothing listed fit: look the proposed name, then the user's words, up exactly, then without
    // the words that only describe how it was done ("Deficit Deadlift" is Deadlift)
    const plain = (w?: string) => w && normalizeWords(w).replace(NOTE_WORDS, ' ');
    for (const w of [raw.name, said, plain(raw.name), plain(said)]) {
      if (!w) continue;
      const k = exerciseKey(w);
      const hit = candidates.find((c) => [c.name, ...(c.also ?? [])].some((n) => exerciseKey(n) === k)) ?? (catalogNameKeys.get(k) && asCandidate(catalogNameKeys.get(k)!));
      if (hit) {
        pick = hit;
        break;
      }
    }
  }

  // An ambiguous word maps on its own only when the user has exactly one such exercise
  const ambiguous = ambiguousKeys.get(exerciseKey(words)) ?? (!pick && raw.name ? ambiguousKeys.get(exerciseKey(raw.name)) : undefined);
  if (ambiguous) {
    const own = candidates.filter((c) => c.yours && ambiguous.includes(c.id));
    if (own.length === 1 && saidInLog(words, input)) return result(own[0], 'sure');
    const guess = pick && ambiguous.includes(pick.id) ? pick : pick ?? own[0] ?? asCandidate(ambiguous[0]);
    return result(guess, 'unsure', alt ?? own.find((c) => c.id !== guess.id));
  }

  if (!pick) return { name: raw.name ?? raw.said ?? 'Exercise', match: said && saidInLog(said, input) ? 'sure' : 'unsure', said: raw.said };

  // A catalog pick when one of the user's own exercises of the same family fits the words just as
  // well ("bench" from someone who only does dumbbell bench): theirs might be meant
  const rival = !pick.yours && said
    ? candidates.find((c) => c.yours && c.id !== pick!.id && c.family && c.family === pick!.family && markersAgree(said, c, candidates))
    : undefined;
  const sure = !!said && !rival && saidInLog(said, input) && (namedBy(said, pick) || (!alt && markersAgree(said, pick, candidates)));
  return result(pick, sure ? 'sure' : 'unsure', alt ?? rival);
}
