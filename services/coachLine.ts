import { format, parseISO, subDays } from 'date-fns';
import { foodByDay } from './progress';
import { foodValue, muscleName } from './goals';
import { mealName } from './foods';
import { dayWord, weekDates, type MuscleWeekRow, type PlannedDay } from './week';
import type { CheckIn } from './checkin';
import type { FoodEntry } from '../types/food';
import type { FoodGoal, MuscleGroup } from '../types/workout';

// One coach line per tab, written on the phone from rules, no model call: a bold lead and the rest.
// Training: the gap muscle and whether a planned day closes it. Food: the weakest pattern, weekend or
// a meal. Today: what's left and the muscle furthest from its goal that a planned day covers.

export interface CoachLine {
  lead: string;
  rest: string;
}

const PLURAL = new Set<MuscleGroup>(['shoulders', 'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves']);
const are = (g: MuscleGroup) => (PLURAL.has(g) ? 'are' : 'is');

// The goal muscle furthest from its goal: not met this week, the longest since trained first
export function gapMuscle(rows: MuscleWeekRow[], daysSince: Partial<Record<MuscleGroup, number>>): MuscleWeekRow | undefined {
  return rows.filter(r => r.met === false).sort((a, b) => (daysSince[b.group] ?? 999) - (daysSince[a.group] ?? 999))[0];
}

const covers = (planned: PlannedDay[], group: MuscleGroup) => planned.find(p => p.groups.includes(group));

export function trainingLine(rows: MuscleWeekRow[], planned: PlannedDay[], daysSince: Partial<Record<MuscleGroup, number>>, check: CheckIn | null, today: string): CoachLine | undefined {
  const gap = gapMuscle(rows, daysSince);
  if (gap) {
    const plan = covers(planned, gap.group);
    const day = plan && dayWord(plan.date, today);
    return {
      lead: `${muscleName(gap.group)} ${are(gap.group)} the gap.`,
      rest: plan ? `${day === 'today' ? "Today's" : day === 'tomorrow' ? "Tomorrow's" : `${day}'s`} ${plan.name} closes it.` : 'Nothing planned covers it yet.',
    };
  }
  if (rows.some(r => r.met)) return { lead: 'Every goal muscle covered this week.', rest: check?.watch ?? '' };
  return check ? { lead: `${check.headline}.`, rest: check.watch ?? check.days } : undefined;
}

// The weakest pattern over the last 4 weeks: weekends, or one meal that's always light
export function foodLine(entries: FoodEntry[], goal: FoodGoal | undefined, now: Date): CoachLine | undefined {
  if (goal?.kind !== 'protein') return undefined;
  const since = weekDates(subDays(now, 21))[0];
  const today = format(now, 'yyyy-MM-dd');
  const recent = entries.filter(e => e.date >= since && e.date <= today);
  const days = [...foodByDay(recent)].filter(([date]) => date >= since);
  if (days.length < 3) return undefined;
  const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
  const weekend = days.filter(([d]) => [0, 6].includes(parseISO(d).getDay())).map(([, t]) => foodValue(goal, t));
  const weekday = days.filter(([d]) => ![0, 6].includes(parseISO(d).getDay())).map(([, t]) => foodValue(goal, t));
  if (weekend.length >= 2 && weekday.length >= 2 && avg(weekend) < avg(weekday) * 0.85) {
    return { lead: 'Weekends are where you miss.', rest: `Sat and Sun average ${avg(weekend)} g, weekdays ${avg(weekday)}.` };
  }
  // Protein a day per meal slot: the lightest against the heaviest
  const bySlot = new Map<string, Map<string, number>>();
  for (const e of recent) {
    const slot = mealName(e.createdAt);
    const perDay = bySlot.get(slot) ?? new Map<string, number>();
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.items.reduce((s, i) => s + i.macros.protein, 0));
    bySlot.set(slot, perDay);
  }
  const slots = [...bySlot].filter(([, d]) => d.size >= 3).map(([name, d]) => ({ name, avg: avg([...d.values()]) })).sort((a, b) => a.avg - b.avg);
  if (slots.length >= 2 && slots[0].avg < slots[slots.length - 1].avg * 0.5) {
    const [light, heavy] = [slots[0], slots[slots.length - 1]];
    return { lead: `${light.name}s are light.`, rest: `${light.avg} g on average, ${heavy.name.toLowerCase()} ${heavy.avg}.` };
  }
  const all = avg(days.map(([, t]) => foodValue(goal, t)));
  const hit = days.filter(([, t]) => foodValue(goal, t) >= goal.target).length;
  return all >= goal.target
    ? { lead: 'On track.', rest: `${all} g a day over 4 weeks, goal ${goal.target}.` }
    : { lead: `${goal.target - all} g a day short on average.`, rest: `At goal on ${hit} of ${days.length} days with food.` };
}

export function todayLine(input: { left?: number; nextMeal?: string; gap?: { group: MuscleGroup; daysSince?: number; plan?: PlannedDay }; today: string }): CoachLine | undefined {
  const { left, nextMeal, gap, today } = input;
  const food = left === undefined ? undefined : left > 0 ? (nextMeal ? `${nextMeal} covers the ${left} g.` : `${left} g to go.`) : 'Protein goal met.';
  const train = gap
    ? `${muscleName(gap.group)} ${gap.daysSince === undefined ? 'not trained yet' : `${gap.daysSince} days out`}${gap.plan ? `, ${dayWord(gap.plan.date, today)}'s ${gap.plan.name} fixes that` : ''}.`
    : undefined;
  if (!food && !train) return undefined;
  return food ? { lead: food, rest: train ?? '' } : { lead: train!, rest: '' };
}
