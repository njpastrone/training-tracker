// Deterministic checks on one planner reply (or one template parse). Every plan runs the fixed checks
// (usable, short reply, 3-5 chips, first week only, sane weights) plus the case's own; a template
// parse scores its exercises field by field. A score is checks passed ÷ checks run; an unusable
// reply scores 0.
import { addDays, format, getDay, parseISO } from 'date-fns';
import { parsePlannerText } from '../../services/planner.ts';
import type { PlannerResponse } from '../../types/plan.ts';
import type { PlanCase, TemplateCase } from './cases.ts';

export interface Check {
  name: string;
  pass: boolean;
}

export interface CaseScore {
  checks: Check[];
  score: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dow = (date: string) => DAYS[getDay(parseISO(date))];

export const days = (r: PlannerResponse) => Object.values(r.plan.days);
export const all = (r: PlannerResponse) => days(r).flatMap(d => d.exercises);
export const byName = (r: PlannerResponse, name: RegExp) => all(r).filter(e => name.test(e.name));
export const onDays = (r: PlannerResponse, allowed: string[]) => r.plan.sessions.every(s => allowed.includes(dow(s.date)));
// Each session with the date after it, for back-to-back checks
export const sessionsOn = (r: PlannerResponse) => r.plan.sessions.map(s => ({ ...s, next: format(addDays(parseISO(s.date), 1), 'yyyy-MM-dd') }));

const sentences = (s: string) => s.split(/[.!?](?:\s|$)/).filter(x => x.trim()).length;

export function scorePlanCase(c: PlanCase, text: string, today: string, windowEnd: string): CaseScore & { plan: PlannerResponse | null } {
  const plan = parsePlannerText(text, today, windowEnd);
  const own = plan && c.checks ? c.checks(plan) : {};
  const checks: Check[] = [
    { name: 'usable', pass: plan !== null },
    ...(plan
      ? [
          { name: 'shortReply', pass: sentences(plan.reply) <= 2 },
          { name: 'chips', pass: plan.chips.length >= 3 && plan.chips.length <= 5 },
          { name: 'firstWeekOnly', pass: plan.plan.sessions.length <= 7 && (parseISO(plan.plan.sessions[plan.plan.sessions.length - 1].date).getTime() - parseISO(plan.plan.sessions[0].date).getTime()) / 86_400_000 <= 6 },
          { name: 'saneWeights', pass: all(plan).every(e => e.weight === undefined || e.weight <= (c.history.units === 'kg' ? 320 : 700)) },
        ]
      : []),
    ...Object.entries(own).map(([name, pass]) => ({ name, pass })),
  ];
  // An unusable plan fails every check the case has, so models that return nothing don't score on brevity
  const total = plan ? checks.length : 5 + Object.keys(c.checks?.(emptyPlan) ?? {}).length;
  return { plan, checks, score: plan ? checks.filter(x => x.pass).length / total : 0 };
}

const emptyPlan: PlannerResponse = { reply: '', plan: { name: '', days: {}, sessions: [], repeatWeeks: 1 }, chips: [] };

// The template screen's own reading of the reply (services/claude.ts parseTemplateFromNL)
export function readTemplateText(text: string): Record<string, unknown>[] | null {
  try {
    const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function scoreTemplateCase(c: TemplateCase, text: string): CaseScore {
  const got = readTemplateText(text);
  const checks: Check[] = [{ name: 'usable', pass: got !== null }, { name: 'count', pass: got?.length === c.expect.length }];
  for (const e of c.expect) {
    const x = got?.find(g => e.name.test(String(g.name)));
    checks.push({ name: `${e.name.source}: found`, pass: !!x });
    for (const f of ['sets', 'reps', 'weight', 'weightUnit'] as const) {
      if (e[f] === undefined) continue;
      const v = x?.[f];
      checks.push({ name: `${e.name.source}: ${f}`, pass: !!x && (f === 'reps' ? String(v) === String(e[f]) : v == e[f]) });
    }
  }
  return { checks, score: checks.filter(x => x.pass).length / checks.length };
}
