import { format, parseISO, subDays } from 'date-fns';
import type { Workout } from '../types/workout';
import type { FoodEntry } from '../types/food';
import { workoutName } from './format';
import { mealName } from './foods';
import { LOG_SHAPE } from './ask';

// Moving a log to another day in plain words ("I logged my food past midnight, move it to
// yesterday"). Read and resolved here on the phone against the user's own recent entries; nothing goes
// to the AI. One entry moves at a time: when the words fit more than one, the user picks.

export interface EntryRef {
  kind: 'workout' | 'food';
  id: string;
}

export interface MoveRequest {
  to: string; // yyyy-MM-dd
  from?: string; // the day it's on now, when said ("today's lunch", "from Monday")
  kind?: EntryRef['kind'];
  night?: boolean; // "past midnight": logged between midnight and 5 am
  slot?: 'breakfast' | 'lunch' | 'dinner';
  words: string[]; // everything else, matched against the foods and exercises logged
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const COUNTS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

const MOVE = /\b(?:move|moved|moving|shift|shifted|switch|put|change|changed)\b/;
const DAY = /\b(?:(?:the )?day before yesterday|yesterday|today|tonight|this morning|last night|(\d+|a|one|two|three|four|five|six|seven) days? ago|(?:last |this past )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})\/(\d{1,2}))\b/g;
const FOOD = /\b(?:food|foods|meals?|ate|eaten|eat|breakfast|brunch|lunch|dinner|supper|snacks?|drinks?)\b/g;
const TRAINING = /\b(?:workouts?|sessions?|training|trained|lifts?|lifting|gym|runs?|ran|cardio|exercises?|push|pull|legs|leg day)\b/g;
const NIGHT = /\bmidnight\b|\blate(?: last)? night\b|\bin the night\b/;
const STOP = new Set(('move moved moving shift shifted switch put change changed the and that this these those them its into onto from for was were have has had been should would could can you please ' +
  'accidentally accident mistake mistakenly wrong wrongly logged log logs entry entries day date instead actually oops meant mean past midnight late night last morning ago days ' +
  'not but just all what when one also got did after before over back there here again sorry whoops think thought added add typed entered record recorded saved').split(' '));
const stem = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const wordsOf = (s: string) => (s.toLowerCase().match(/[a-z]{3,}/g) ?? []).map(stem);

// One day phrase → yyyy-MM-dd; undefined for a date that doesn't exist
function dayOf(m: RegExpMatchArray, now: Date): string | undefined {
  const [said, count, weekday, month, monthDay, slashMonth, slashDay] = m;
  if (/day before yesterday/.test(said)) return ymd(subDays(now, 2));
  if (said === 'yesterday' || said === 'last night') return ymd(subDays(now, 1));
  if (said === 'today' || said === 'tonight' || said === 'this morning') return ymd(now);
  if (count) return ymd(subDays(now, COUNTS[count] ?? Number(count)));
  if (weekday) return ymd(subDays(now, (now.getDay() - WEEKDAYS.indexOf(weekday) + 7) % 7 || 7));
  const mo = month ? MONTHS.indexOf(month) : Number(slashMonth) - 1;
  const d = Number(month ? monthDay : slashDay);
  let date = new Date(now.getFullYear(), mo, d);
  if (date.getMonth() !== mo || date.getDate() !== d) return undefined;
  if (date > now) date = new Date(now.getFullYear() - 1, mo, d); // "Dec 30" in January is last year's
  return ymd(date);
}

// What a message asks to move and where, or null when it isn't a request to move a log. The day after
// "to" (or "on", "for") is where it goes; a day after "from", or with 's, is where it is now.
export function readMove(text: string, now: Date): MoveRequest | null {
  const t = text.toLowerCase().replace(/’/g, "'");
  if (!MOVE.test(t) || LOG_SHAPE.test(t)) return null;
  let to: string | undefined;
  let from: string | undefined;
  for (const m of t.matchAll(DAY)) {
    const date = dayOf(m, now);
    if (!date) continue;
    const before = t.slice(0, m.index).trimEnd();
    const after = t.slice(m.index! + m[0].length);
    if (/\b(?:to|onto|into|on|for|as|be)$/.test(before)) to = date;
    else if (/\bfrom$/.test(before) || /^'s\b/.test(after)) from = date;
  }
  if (!to) return null;
  const food = !!t.match(FOOD);
  const training = !!t.match(TRAINING);
  const slot = /\b(?:breakfast|brunch)\b/.test(t) ? 'breakfast' : /\blunch\b/.test(t) ? 'lunch' : /\b(?:dinner|supper)\b/.test(t) ? 'dinner' : undefined;
  const rest = t.replace(DAY, ' ').replace(FOOD, ' ').replace(TRAINING, ' ');
  return {
    to,
    ...(from && from !== to ? { from } : {}),
    ...(food !== training ? { kind: food ? 'food' : 'workout' } : {}),
    ...(NIGHT.test(t) ? { night: true } : {}),
    ...(slot ? { slot } : {}),
    words: [...new Set(wordsOf(rest).filter(w => !STOP.has(w)))],
  } as MoveRequest;
}

export type MoveFound =
  | { to: string; entry: EntryRef }
  | { to: string; pick: EntryRef[] }
  | { to: string; none: 'already' | 'nothing' };

// Meal slots by the hour logged; dinner runs past midnight
const inSlot = (slot: MoveRequest['slot'], h: number) =>
  slot === 'breakfast' ? h >= 4 && h < 11 : slot === 'lunch' ? h >= 11 && h < 16 : h >= 16 || h < 4;

// The entry a request means, among the last 7 days' logs (or the day it named): exactly one, a few to
// pick from, or why there's none. Only "it" or "that" means the last thing logged.
export function resolveMove(req: MoveRequest, workouts: Workout[], foodEntries: FoodEntry[], now: Date): MoveFound {
  const { to } = req;
  const since = ymd(subDays(now, 7));
  const entries = [
    ...workouts.map(w => ({ ref: { kind: 'workout' as const, id: w.id }, date: w.date, createdAt: w.createdAt, words: new Set(wordsOf(`${w.exercises.map(e => `${e.name} ${e.said ?? ''}`).join(' ')} ${workoutName(w.muscleGroups)}`)) })),
    ...foodEntries.map(e => ({ ref: { kind: 'food' as const, id: e.id }, date: e.date, createdAt: e.createdAt, words: new Set(wordsOf(e.items.map(i => `${i.name} ${i.said ?? ''}`).join(' '))) })),
  ];
  const hour = (e: { createdAt: string }) => parseISO(e.createdAt).getHours();
  let found = entries.filter(e =>
    (req.from ? e.date === req.from : e.date >= since && e.date <= ymd(now)) &&
    (!req.kind || e.ref.kind === req.kind) &&
    (!req.night || hour(e) < 5) &&
    (!req.slot || inSlot(req.slot, hour(e)))
  );
  // The words narrow it only when they name something logged ("my eggs", "the run")
  const hits = (e: (typeof entries)[number]) => req.words.filter(w => e.words.has(w)).length;
  const best = Math.max(0, ...found.map(hits));
  if (best > 0) found = found.filter(e => hits(e) === best);
  found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const vague = !req.from && !req.kind && !req.night && !req.slot && best === 0;
  if (vague && found.length) return found[0].date === to ? { to, none: 'already' } : { to, entry: found[0].ref };
  const movable = found.filter(e => e.date !== to);
  if (!movable.length) return { to, none: found.length ? 'already' : 'nothing' };
  return movable.length === 1 ? { to, entry: movable[0].ref } : { to, pick: movable.slice(0, 5).map(e => e.ref) };
}

const short = (date: string) => format(parseISO(date), 'MMM d');

export const noMoveText = (found: Extract<MoveFound, { none: string }>) =>
  found.none === 'already' ? `That's already on ${short(found.to)}.` : "Couldn't find that log. Open its day and tap Move.";

const list = (names: string[]) => (names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', '));

// "Late night (2 eggs, toast)", "Push (Bench Press, Overhead Press)"; undefined once it's deleted
export function entryLabel(ref: EntryRef, workouts: Workout[], foodEntries: FoodEntry[]): string | undefined {
  if (ref.kind === 'workout') {
    const w = workouts.find(w => w.id === ref.id);
    return w && `${workoutName(w.muscleGroups)} (${list(w.exercises.map(e => e.name))})`;
  }
  const e = foodEntries.find(e => e.id === ref.id);
  return e && `${mealName(e.createdAt)} (${list(e.items.map(i => i.said ?? i.name))})`;
}

export const movedText = (label: string, from: string, to: string) => `Moved ${label} from ${short(from)} to ${short(to)}`;
