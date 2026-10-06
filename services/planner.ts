import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { addDays, differenceInCalendarDays, format, getDay, isValid, parseISO, subDays } from 'date-fns';
import { callClaude } from './claude';
import { analyzeWeeklyVolume } from './coach';
import { trainingWindow } from './pace';
import { templateService } from './templates';
import { scheduleService } from './schedule';
import { calculateStats } from '../stores/workoutStore';
import { Exercise, MuscleGroup, TrainingGoal, WeightUnit, Workout } from '../types/workout';
import { TemplateExercise, TemplateSchedule } from '../types/template';
import { PlanDay, PlanDraft, PlannerResponse, PlanSession, TrainingPlan } from '../types/plan';

const PLANS_STORAGE_KEY = '@training-tracker/plans';
const WINDOW_DAYS = 14; // first-week sessions must fall within today + 13 days
const MAX_DAY_TYPES = 5;
const MAX_EXERCISES = 7;
const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core',
  'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dow = (date: string) => DAY_NAMES[getDay(parseISO(date))].slice(0, 3);

export async function getPlans(): Promise<TrainingPlan[]> {
  try {
    const plansJson = await AsyncStorage.getItem(PLANS_STORAGE_KEY);
    return plansJson ? JSON.parse(plansJson) : [];
  } catch (error) {
    console.error('Error loading plans:', error);
    return [];
  }
}

async function savePlans(plans: TrainingPlan[]): Promise<void> {
  await AsyncStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
}

export type HistorySummary = ReturnType<typeof summarizeHistory>;
// What the user told setup and the planner: days a week and what they're training for
export type PlannerHistory = HistorySummary & { daysPerWeek?: number; goal?: TrainingGoal };

// Compact, local (no AI) picture of the user's training that rides along with every planner call.
// This is how the planner "learns": skipped days and partial weeks from the last plan show up here.
export function summarizeHistory(
  workouts: Workout[],
  schedule: TemplateSchedule[],
  plans: TrainingPlan[],
  units: WeightUnit,
  now: Date = new Date()
) {
  const today = format(now, 'yyyy-MM-dd');
  const daysAgo = (n: number) => format(subDays(now, n), 'yyyy-MM-dd');
  const between = (from: string, to: string) => workouts.filter(w => w.date > from && w.date <= to);
  const lastDate = workouts.reduce<string | null>((max, w) => (!max || w.date > max ? w.date : max), null);

  // Usual days come from the last 12 weeks so old habits don't win
  const byDay = calculateStats(between(daysAgo(84), today)).workoutsByDayOfWeek;
  const busiest = Math.max(0, ...Object.values(byDay));
  const usualDays = busiest === 0 ? [] : DAY_NAMES.filter(d => (byDay[d] ?? 0) >= busiest / 2).map(d => d.slice(0, 3));

  const setsPerMuscleLast4w: Partial<Record<MuscleGroup, number>> = {};
  const last4w = trainingWindow(workouts.map(w => w.date), 28, now);
  for (const data of Object.values(analyzeWeeklyVolume(workouts, last4w))) {
    if (data.totalSets > 0) setsPerMuscleLast4w[data.muscleGroup] = data.totalSets;
  }

  const lastTrained: Partial<Record<MuscleGroup, string>> = {};
  const frequency = new Map<string, number>();
  // One lift = one exercise id, whatever it was called; names only for entries saved without one
  const liftKey = (e: Exercise) => e.exerciseId ?? `name:${e.name.toLowerCase()}`;
  for (const w of workouts) {
    for (const g of w.muscleGroups) if (!lastTrained[g] || w.date > lastTrained[g]!) lastTrained[g] = w.date;
    for (const e of w.exercises) frequency.set(liftKey(e), (frequency.get(liftKey(e)) ?? 0) + 1);
  }

  // Top 8 most-logged exercises, with the heaviest set from the latest time each was done
  const newestFirst = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const recentLifts = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .flatMap(([key]) => {
      const workout = newestFirst.find(w => w.exercises.some(e => liftKey(e) === key))!;
      const best = workout.exercises
        .filter(e => liftKey(e) === key)
        .reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
      if (!best.weight && !best.reps) return [];
      return [{ name: best.name, top: best.weight ? `${best.weight}x${best.reps ?? '?'}` : `${best.sets ?? 1}x${best.reps}`, date: workout.date }];
    });

  const lastPlan = [...plans].filter(p => p.status !== 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const lastPlanSessions = lastPlan ? schedule.filter(s => s.planId === lastPlan.id) : [];

  const recent4w = between(daysAgo(28), today).length;
  const prior8w = between(daysAgo(84), daysAgo(28)).length;

  return {
    today: `${today} (${dow(today)})`,
    units,
    daysSinceLastWorkout: lastDate ? differenceInCalendarDays(now, parseISO(lastDate)) : null,
    workoutsPerWeek: { last4w: Math.round((recent4w / 4) * 10) / 10, prior8w: Math.round((prior8w / 8) * 10) / 10 },
    usualDays,
    setsPerMuscleLast4w,
    lastTrained,
    recentLifts,
    lastPlan: lastPlan
      ? {
          name: lastPlan.name,
          planned: lastPlanSessions.length,
          done: lastPlanSessions.filter(s => s.completed).length,
          skipped: lastPlanSessions.filter(s => s.skipped).map(s => dow(s.date)),
          missed: lastPlanSessions.filter(s => !s.completed && !s.skipped && s.date < today).map(s => dow(s.date)),
        }
      : null,
    scheduledAhead: schedule
      .filter(s => s.date >= today && !s.completed && !s.skipped)
      .map(s => s.date)
      .sort()
      .slice(0, 14),
  };
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)) && format(parseISO(value), 'yyyy-MM-dd') === value;

// Checks Claude's plan JSON. Returns null when it can't be used as-is; the screen then asks to try again.
export function validatePlanResponse(raw: unknown, today: string, windowEnd: string): PlannerResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const { reply, plan, chips } = raw as Record<string, any>;
  if (!plan || typeof plan.name !== 'string' || !plan.name.trim()) return null;
  if (!plan.days || typeof plan.days !== 'object' || Array.isArray(plan.days)) return null;

  const dayEntries = Object.entries(plan.days as Record<string, any>);
  if (dayEntries.length === 0 || dayEntries.length > MAX_DAY_TYPES) return null;
  const days: Record<string, PlanDay> = {};
  for (const [key, day] of dayEntries) {
    if (!day || typeof day.name !== 'string' || !day.name.trim()) return null;
    if (!Array.isArray(day.exercises) || day.exercises.length === 0 || day.exercises.length > MAX_EXERCISES) return null;
    const exercises: TemplateExercise[] = [];
    for (const e of day.exercises) {
      const sets = Number(e?.sets);
      const reps = typeof e?.reps === 'number' ? e.reps : String(e?.reps ?? '').trim();
      const weight = Number(e?.weight);
      if (typeof e?.name !== 'string' || !e.name.trim() || !Number.isInteger(sets) || sets < 1) return null;
      // Reps may be a number, "8", "8-12" or "30s"; anything not starting with a digit is rejected
      if (typeof reps === 'number' ? !(reps > 0) : !/^\d/.test(reps)) return null;
      exercises.push({
        name: e.name.trim(),
        muscleGroup: MUSCLE_GROUPS.includes(e.muscleGroup) ? e.muscleGroup : 'full_body',
        sets,
        reps: typeof reps === 'string' && /^\d+$/.test(reps) ? Number(reps) : reps,
        ...(weight > 0 ? { weight } : {}),
      });
    }
    days[key] = { name: day.name.trim(), source: day.source === 'mine' ? 'mine' : 'suggested', exercises };
  }

  if (!Array.isArray(plan.sessions) || plan.sessions.length === 0) return null;
  const sessions: PlanSession[] = [];
  for (const s of plan.sessions) {
    if (!isIsoDate(s?.date) || s.date < today || s.date > windowEnd) return null;
    if (sessions.some(other => other.date === s.date) || !Object.keys(days).includes(s.day)) return null;
    sessions.push({ date: s.date, day: s.day, ...(typeof s.note === 'string' && s.note.trim() ? { note: s.note.trim() } : {}) });
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    reply: typeof reply === 'string' ? reply.trim() : '',
    plan: {
      name: plan.name.trim(),
      days,
      sessions,
      repeatWeeks: Math.min(12, Math.max(1, Math.round(Number(plan.repeatWeeks) || 1))),
    },
    chips: Array.isArray(chips) ? chips.filter((c): c is string => typeof c === 'string' && c.trim() !== '').slice(0, 6) : [],
  };
}

export function parsePlannerText(text: string, today: string, windowEnd: string): PlannerResponse | null {
  try {
    // Ignore any prose or code fences around the object
    return validatePlanResponse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)), today, windowEnd);
  } catch {
    return null;
  }
}

const PLANNER_PROMPT = `<role>Strength coach planning workouts for a LiftText user.</role>
<rules>
- Use <history> to fit the plan: after >14 days off start at ~70-80% of recent working weights and fewer sets;
  prefer the user's usual days; avoid training the same muscle group on consecutive days.
- If <history> shows the last plan had skipped or missed days, plan fewer days or move them off those weekdays.
- If <history> has "daysPerWeek" or "goal" (strength, muscle, fitness or comeback), plan for them unless the request says otherwise.
- If the user gives their own workouts, keep them exactly and mark those days "source": "mine"; only fill what they asked you to suggest.
- If <current_plan> is present, change only what the user asked for and keep the rest.
- One session per date, dates between <window> start and end, never before today. Write only the first week of sessions; use "repeatWeeks" (1-12) for longer blocks.
- At most 5 day types and 7 exercises per day type. Reuse a day type for repeated days (e.g. Push on Mon and Thu).
- muscleGroup must be one of: chest, back, shoulders, biceps, triceps, forearms, core, quads, hamstrings, glutes, calves, cardio, full_body.
- Weights in the user's units; omit weight when unsure. Omit null fields.
- "note" is optional, one short line for that day (e.g. "Easy day: stop ~3 reps short of failure").
- "reply" is at most 2 short sentences saying what you did and why.
- "chips" are 3-5 short follow-up tweaks the user might tap (e.g. "Easier", "45 min max").
- Return ONLY the JSON object below.
</rules>
<output_schema>
{
  "reply": string,
  "plan": {
    "name": string,
    "days": { "<KEY>": { "name": string, "source": "mine"|"suggested",
      "exercises": [ { "name": string, "muscleGroup": string, "sets": number, "reps": number|string, "weight": number } ] } },
    "sessions": [ { "date": "YYYY-MM-DD", "day": "<KEY>", "note": string } ],
    "repeatWeeks": number
  },
  "chips": string[]
}
</output_schema>`;

// One Claude call per ask or tweak. Stateless: history, current draft and recent messages go in every call.
// Throws ApiError on a server refusal; returns null when the reply isn't a usable plan.
export async function planWorkouts(
  message: string,
  draft: PlanDraft | null,
  history: PlannerHistory,
  recentMessages: string[],
  now: Date = new Date()
): Promise<PlannerResponse | null> {
  const today = format(now, 'yyyy-MM-dd');
  const windowEnd = format(addDays(now, WINDOW_DAYS - 1), 'yyyy-MM-dd');
  const text = await callClaude(PLANNER_PROMPT, `<history>${JSON.stringify(history)}</history>
<window>${today} to ${windowEnd}</window>
<current_plan>${draft ? JSON.stringify(draft) : 'none'}</current_plan>
<recent_messages>${JSON.stringify(recentMessages.slice(-4))}</recent_messages>
<request>${message}</request>`, 1500);
  return parsePlannerText(text, today, windowEnd);
}

// Repeats the first week's sessions for repeatWeeks weeks (first one wins if weeks overlap)
export function expandSessions(plan: PlanDraft): PlanSession[] {
  const byDate = new Map<string, PlanSession>();
  for (let week = 0; week < plan.repeatWeeks; week++) {
    for (const s of plan.sessions) {
      const date = format(addDays(parseISO(s.date), 7 * week), 'yyyy-MM-dd');
      if (!byDate.has(date)) byDate.set(date, { ...s, date });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// What Plan it will write: dates that already have a completed session are left alone,
// and any other session on a planned date is replaced (one session per date)
export function previewPlan(plan: PlanDraft, schedule: TemplateSchedule[]) {
  const done = new Set(schedule.filter(s => s.completed).map(s => s.date));
  const sessions = expandSessions(plan).filter(s => !done.has(s.date));
  const dates = new Set(sessions.map(s => s.date));
  return { sessions, replaced: schedule.filter(s => !s.completed && dates.has(s.date)).length };
}

// Plan it: one template per day type and one schedule entry per date, all tagged with the plan id. No AI call.
export async function savePlan(draft: PlanDraft, request: string, units: WeightUnit): Promise<TrainingPlan> {
  const schedule = await scheduleService.getSchedule();
  const { sessions } = previewPlan(draft, schedule);
  if (sessions.length === 0) throw new Error('Every planned day already has a completed workout');

  const plan: TrainingPlan = {
    id: uuidv4(),
    name: draft.name,
    request,
    startDate: sessions[0].date,
    endDate: sessions[sessions.length - 1].date,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const templateIds: Record<string, string> = {};
  for (const key of new Set(sessions.map(s => s.day))) {
    const day = draft.days[key];
    const template = await templateService.createTemplate({
      name: day.name,
      description: draft.name,
      exercises: day.exercises.map(e => ({ ...e, weightUnit: units })),
      muscleGroups: [],
      planId: plan.id,
    });
    templateIds[key] = template.id;
  }

  const dates = new Set(sessions.map(s => s.date));
  await scheduleService.saveSchedule([
    ...schedule.filter(s => s.completed || !dates.has(s.date)),
    ...sessions.map(s => ({
      id: uuidv4(),
      date: s.date,
      templateId: templateIds[s.day],
      isRecurring: false,
      completed: false,
      planId: plan.id,
      ...(s.note ? { note: s.note } : {}),
    })),
  ]);
  await savePlans([...(await getPlans()), plan]);
  return plan;
}

// Undo / delete plan: drops the plan's future open sessions and the templates nothing points at anymore.
// Completed sessions (and the workouts that completed them) stay.
export async function deletePlan(planId: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const schedule = (await scheduleService.getSchedule()).filter(
    s => !(s.planId === planId && !s.completed && s.date >= today)
  );
  await scheduleService.saveSchedule(schedule);

  const stillUsed = new Set(schedule.map(s => s.templateId));
  const templates = await templateService.getTemplates();
  await templateService.saveTemplates(templates.filter(t => t.planId !== planId || stillUsed.has(t.id)));

  const plans = await getPlans();
  await savePlans(plans.map(p => (p.id === planId ? { ...p, status: 'cancelled' as const } : p)));
}
