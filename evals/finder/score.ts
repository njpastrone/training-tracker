// Scores one finder reply against a gold case. The fixed checks are the rules the app holds every reply
// to (server/src/finder.ts): readable JSON, places from the list, a verdict per preference, numbers that
// make sense, no health claim anywhere in the raw text, the never list honoured. The case's own checks
// say which places or builds a good answer picks or skips, which verdict a known fact forces, and the
// published numbers for the items the model tends to pick, at the 20% bar of evals/food.

import { HEALTH_CLAIM, readFinderReply, SHOW_FROM, tally, withoutNegated, type FinderPick, type FinderReply } from '../../server/src/finder.ts';
import { within } from '../food/score.ts';
import type { FinderCase } from './cases.ts';

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface CaseScore {
  reply: FinderReply | null;
  checks: Check[];
  score: number; // checks passed ÷ checks run
  refHit?: { kcal: boolean; protein: boolean; item: string }; // when a reference matched a pick
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const named = (pick: FinderPick, places: string[]) => places.some((p) => fold(pick.place).includes(fold(p)) || fold(p).includes(fold(pick.place)));

// Strings the model wrote in the raw reply, before the app's cleanup, so a claim counts against the
// prompt. Place names are copied from the list, so they're left out (a list can hold anything).
const rawStrings = (text: string, picksOnly = false): string[] => {
  try {
    const out: string[] = [];
    const walk = (v: unknown, key = '') => {
      if (typeof v === 'string') {
        if (key !== 'place') out.push(v);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
    };
    const raw = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    walk(picksOnly ? raw.picks : raw);
    return out;
  } catch {
    return [text];
  }
};

export function scoreFinderCase(c: FinderCase, text: string): CaseScore {
  const reply = readFinderReply(text, { preferences: c.input.preferences, budget: c.input.budget, places: c.input.places, never: c.input.never });
  const checks: Check[] = [{ name: 'readable', pass: !!reply && (reply.picks.length > 0 || !!c.allowEmpty), detail: reply ? `${reply.picks.length} picks` : 'no JSON' }];
  if (!reply || !reply.picks.length) return { reply, checks, score: checks[0].pass ? 1 : 0 };
  const best = reply.picks[0];
  const picks = reply.picks;
  const listed = c.input.places.map((p) => p.name);
  const claim = rawStrings(text).find((s) => HEALTH_CLAIM.test(s));
  checks.push(
    { name: 'no health claims', pass: !claim, detail: claim },
    { name: 'places from the list', pass: !listed.length || picks.every((p) => listed.includes(p.place)), detail: picks.map((p) => p.place).join(', ') },
    { name: 'numbers make sense', pass: picks.every((p) => p.kcal >= 80 && p.kcal <= 2500 && p.protein <= p.kcal / 2 && p.price >= 2 && p.price <= 60), detail: picks.map((p) => `${p.kcal} kcal, ${p.protein} g, $${p.price}`).join('; ') },
    { name: 'why is short and plain', pass: picks.every((p) => p.why.split(/\s+/).length <= 30), detail: best.why },
    { name: 'best is sure enough', pass: best.confidence >= SHOW_FROM, detail: String(best.confidence) },
  );
  if (c.input.never?.length) {
    const words = c.input.never.map(fold);
    // The orders and their reasons, not the skipped list (which may name the thing being avoided)
    checks.push({ name: 'never list honoured', pass: rawStrings(text, true).every((s) => !words.some((w) => fold(withoutNegated(s, true)).includes(w))), detail: c.input.never.join(', ') });
  }
  if (c.pickAny) checks.push({ name: `picks one of ${c.pickAny.join('|')}`, pass: picks.some((p) => named(p, c.pickAny!)), detail: picks.map((p) => p.place).join(', ') });
  if (c.bestAny) checks.push({ name: `best is ${c.bestAny.join('|')}`, pass: named(best, c.bestAny), detail: best.place });
  if (c.neverPick) checks.push({ name: `never picks ${c.neverPick.join('|')}`, pass: !picks.some((p) => named(p, c.neverPick!)), detail: picks.map((p) => p.place).join(', ') });
  if (c.skipAny) checks.push({ name: `skips one of ${c.skipAny.join('|')}`, pass: c.skipAny.some((s) => reply.skipped.some((k) => fold(k.place).includes(fold(s))) || !picks.some((p) => named(p, [s]))), detail: reply.skipped.map((s) => s.place).join(', ') });
  if (c.itemMust) checks.push({ name: `best item matches ${c.itemMust}`, pass: c.itemMust.test(best.item), detail: best.item });
  // "No cheese" avoids cheese: the negated phrases don't count against an order
  if (c.itemMustNot) checks.push({ name: `no item matches ${c.itemMustNot}`, pass: !picks.some((p) => c.itemMustNot!.test(withoutNegated(p.item))), detail: picks.map((p) => p.item).join(' | ') });
  if (c.verdict) {
    const on = c.verdict.place ? picks.find((p) => named(p, [c.verdict!.place!])) : best;
    const v = on?.verdicts.find((x) => x.preference === c.verdict!.preference);
    const want = ([] as string[]).concat(c.verdict.verdict);
    checks.push({ name: `${c.verdict.preference} is ${want.join('|')}${c.verdict.place ? ` at ${c.verdict.place}` : ''}`, pass: !!v && want.includes(v.verdict), detail: v ? `${v.verdict}: ${v.reason}` : on ? 'no such verdict' : 'place not picked' });
  }
  if (c.hitsAtLeast !== undefined) checks.push({ name: `best hits at least ${c.hitsAtLeast}`, pass: tally(best.verdicts).hits >= c.hitsAtLeast, detail: `${tally(best.verdicts).hits} of ${best.verdicts.length}` });
  let refHit: CaseScore['refHit'];
  for (const ref of c.refs ?? []) {
    const pick = picks.find((p) => ref.item.test(p.item) && (!ref.place || fold(p.place) === fold(ref.place)));
    if (!pick) continue;
    refHit = { kcal: within('kcal', pick.kcal, ref.kcal), protein: within('protein', pick.protein, ref.protein), item: pick.item };
    checks.push({ name: 'kcal within 20% of published', pass: refHit.kcal, detail: `${pick.kcal} vs ${ref.kcal} (${pick.item})` }, { name: 'protein within 20% of published', pass: refHit.protein, detail: `${pick.protein} vs ${ref.protein}` });
    break;
  }
  return { reply, checks, score: checks.filter((k) => k.pass).length / checks.length, refHit };
}
