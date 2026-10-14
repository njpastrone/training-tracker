// Planner and template-parser test set: the requests the Plan and template screens send, with the
// history the app would send along, and what a good plan has to do with them. Every case passes the
// fixed checks in score.ts (a usable plan, a short reply, 3-5 chips, first week only, sane weights);
// `checks` add what this request asks for. See README.md.
import type { PlannerHistory } from '../../services/planner.ts';
import type { PlanDraft, PlannerResponse } from '../../types/plan.ts';
import { all, byName, days, onDays, sessionsOn } from './score.ts';

export const TODAY = '2026-10-14'; // a Wednesday; the window runs to 2026-10-27

export type Category = 'fresh' | 'usual' | 'comeback' | 'own-workouts' | 'tweak' | 'constraints' | 'units' | 'template';

export interface PlanCase {
  kind: 'plan';
  id: string;
  category: Category;
  history: PlannerHistory;
  request: string;
  draft?: PlanDraft;
  recentMessages?: string[];
  checks?: (r: PlannerResponse) => Record<string, boolean>;
}

export interface TemplateCase {
  kind: 'template';
  id: string;
  category: 'template';
  input: string;
  expect: { name: RegExp; sets?: number; reps?: number | string; weight?: number | null; weightUnit?: 'lbs' | 'kg' }[];
}

export type Case = PlanCase | TemplateCase;

const base = { today: `${TODAY} (Wed)`, units: 'lbs' as const, scheduledAhead: [] as string[], lastPlan: null };

// Never trained: nothing to go on but the request
const fresh: PlannerHistory = { ...base, daysSinceLastWorkout: null, workoutsPerWeek: { last4w: 0, prior8w: 0 }, usualDays: [], setsPerMuscleLast4w: {}, lastTrained: {}, recentLifts: [] };

// Four days a week for months, Mon Tue Thu Fri, upper/lower, trained two days ago
const sam: PlannerHistory = {
  ...base,
  daysSinceLastWorkout: 2,
  workoutsPerWeek: { last4w: 4, prior8w: 3.9 },
  usualDays: ['Mon', 'Tue', 'Thu', 'Fri'],
  setsPerMuscleLast4w: { chest: 32, back: 40, shoulders: 24, quads: 28, hamstrings: 20, biceps: 16, triceps: 16, core: 12 },
  lastTrained: { chest: '2026-10-12', back: '2026-10-12', shoulders: '2026-10-12', quads: '2026-10-09', hamstrings: '2026-10-09' },
  recentLifts: [
    { name: 'Bench Press', top: '185x5', date: '2026-10-12' },
    { name: 'Squat', top: '225x5', date: '2026-10-09' },
    { name: 'Deadlift', top: '275x5', date: '2026-10-09' },
    { name: 'Overhead Press', top: '115x5', date: '2026-10-12' },
    { name: 'Barbell Row', top: '135x8', date: '2026-10-12' },
    { name: 'Romanian Deadlift', top: '185x8', date: '2026-10-09' },
    { name: 'Pull-up', top: '4x8', date: '2026-10-12' },
    { name: 'Dumbbell Curl', top: '30x12', date: '2026-10-12' },
  ],
};

// Sam after three weeks off
const comeback: PlannerHistory = { ...sam, daysSinceLastWorkout: 21, workoutsPerWeek: { last4w: 0.3, prior8w: 3.9 }, lastTrained: { chest: '2026-09-23', back: '2026-09-23', quads: '2026-09-22' } };

// Sam whose last plan kept losing Wednesdays
const skipper: PlannerHistory = { ...sam, usualDays: ['Mon', 'Wed', 'Fri'], lastPlan: { name: 'Full body 3x', planned: 9, done: 5, skipped: ['Wed', 'Wed'], missed: ['Wed', 'Fri'] } };

// Trains in kilos
const kgUser: PlannerHistory = {
  ...sam,
  units: 'kg',
  recentLifts: [
    { name: 'Bench Press', top: '80x5', date: '2026-10-12' },
    { name: 'Squat', top: '100x5', date: '2026-10-09' },
    { name: 'Deadlift', top: '120x5', date: '2026-10-09' },
    { name: 'Overhead Press', top: '50x5', date: '2026-10-12' },
  ],
};

// Setup answers and goals ride along with the history
const withGoals: PlannerHistory = { ...sam, daysPerWeek: 3, goal: 'strength', goals: ['Squat twice a week', 'Deadlift 315 by December'] };

// The draft under review in the tweak cases: Sam's 4-day upper/lower
const draft: PlanDraft = {
  name: 'Upper/Lower 4 day',
  days: {
    UA: { name: 'Upper A', source: 'suggested', exercises: [
      { name: 'Bench Press', muscleGroup: 'chest', sets: 4, reps: 5, weight: 185 },
      { name: 'Barbell Row', muscleGroup: 'back', sets: 4, reps: 8, weight: 135 },
      { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 3, reps: 8, weight: 115 },
      { name: 'Dumbbell Curl', muscleGroup: 'biceps', sets: 3, reps: 12, weight: 30 },
    ] },
    LA: { name: 'Lower A', source: 'suggested', exercises: [
      { name: 'Squat', muscleGroup: 'quads', sets: 4, reps: 5, weight: 225 },
      { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', sets: 3, reps: 8, weight: 185 },
      { name: 'Leg Press', muscleGroup: 'quads', sets: 3, reps: 10, weight: 270 },
      { name: 'Plank', muscleGroup: 'core', sets: 3, reps: '45s' },
    ] },
    UB: { name: 'Upper B', source: 'suggested', exercises: [
      { name: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 4, reps: 8, weight: 60 },
      { name: 'Pull-up', muscleGroup: 'back', sets: 4, reps: 8 },
      { name: 'Lateral Raise', muscleGroup: 'shoulders', sets: 3, reps: 15, weight: 20 },
      { name: 'Tricep Pushdown', muscleGroup: 'triceps', sets: 3, reps: 12, weight: 50 },
    ] },
    LB: { name: 'Lower B', source: 'suggested', exercises: [
      { name: 'Deadlift', muscleGroup: 'back', sets: 3, reps: 5, weight: 275 },
      { name: 'Front Squat', muscleGroup: 'quads', sets: 3, reps: 6, weight: 155 },
      { name: 'Leg Curl', muscleGroup: 'hamstrings', sets: 3, reps: 12, weight: 90 },
      { name: 'Calf Raise', muscleGroup: 'calves', sets: 4, reps: 15, weight: 135 },
    ] },
  },
  sessions: [
    { date: '2026-10-15', day: 'UA' },
    { date: '2026-10-16', day: 'LA' },
    { date: '2026-10-19', day: 'UB' },
    { date: '2026-10-20', day: 'LB' },
  ],
  repeatWeeks: 4,
};
const tweak = { recentMessages: ['4 day upper lower', 'Here is a 4-day upper/lower split on your usual days.'], draft };
const sameSessions = (r: PlannerResponse, except: string[] = []) =>
  JSON.stringify(r.plan.sessions.filter(s => !except.includes(s.date)).map(s => s.date)) === JSON.stringify(draft.sessions.filter(s => !except.includes(s.date)).map(s => s.date));
const sameDays = (r: PlannerResponse) => JSON.stringify(Object.values(r.plan.days).map(d => d.exercises)) === JSON.stringify(Object.values(draft.days).map(d => d.exercises));
const weight = (r: PlannerResponse, name: RegExp) => byName(r, name)[0]?.weight;
const ratio = (r: PlannerResponse, name: RegExp, top: number) => { const w = weight(r, name); return w === undefined ? null : w / top; };

const plan = (c: Omit<PlanCase, 'kind'>): PlanCase => ({ kind: 'plan', ...c });

export const cases: Case[] = [
  // Fresh: nothing to go on but the request
  plan({ id: 'fresh-ppl', category: 'fresh', history: fresh, request: "3 day push pull legs, I'm a beginner", checks: r => ({
    threeSessions: r.plan.sessions.length === 3,
    threeDayTypes: days(r).length === 3,
    pushPullLegs: ['push', 'pull', 'leg'].every(w => days(r).some(d => d.name.toLowerCase().includes(w))),
  }) }),
  plan({ id: 'fresh-upper-lower', category: 'fresh', history: fresh, request: '4 days a week, upper lower', checks: r => ({
    fourSessions: r.plan.sessions.length === 4,
    upperAndLower: days(r).some(d => /upper/i.test(d.name)) && days(r).some(d => /lower|leg/i.test(d.name)),
    noBackToBackSameDay: r.plan.sessions.every((s, i) => i === 0 || !(sessionsOn(r)[i - 1].next === s.date && sessionsOn(r)[i - 1].day === s.day)),
  }) }),
  plan({ id: 'fresh-bro-split', category: 'fresh', history: fresh, request: '6 days a week bro split: chest, back, shoulders, arms, legs, core', checks: r => ({
    sixSessions: r.plan.sessions.length === 6,
    reusedDayTypes: days(r).length <= 5, // the validator allows at most 5 day types, so a 6-day split must reuse one
  }) }),

  // Usual: fit the plan to what Sam already does
  plan({ id: 'usual-next-week', category: 'usual', history: sam, request: 'plan my next week, same as usual', checks: r => ({
    fourSessions: r.plan.sessions.length === 4,
    onUsualDays: onDays(r, ['Mon', 'Tue', 'Thu', 'Fri']),
    benchNearRecent: ratio(r, /bench/i, 185) === null || (ratio(r, /bench/i, 185)! >= 0.8 && ratio(r, /bench/i, 185)! <= 1.05),
    squatNearRecent: ratio(r, /squat/i, 225) === null || (ratio(r, /squat/i, 225)! >= 0.8 && ratio(r, /squat/i, 225)! <= 1.05),
    usesRecentLifts: byName(r, /bench|squat|deadlift/i).length >= 2,
  }) }),
  plan({ id: 'usual-six-weeks', category: 'usual', history: sam, request: 'give me a 6 week block, 4 days a week', checks: r => ({
    fourSessions: r.plan.sessions.length === 4,
    sixWeeks: r.plan.repeatWeeks === 6,
  }) }),
  plan({ id: 'usual-time-cap', category: 'usual', history: sam, request: '4 days, 45 minutes max each', checks: r => ({
    fourSessions: r.plan.sessions.length === 4,
    shortDays: days(r).every(d => d.exercises.length <= 5),
  }) }),
  plan({ id: 'usual-only-tue-thu-sat', category: 'usual', history: sam, request: 'I can only train Tuesday, Thursday and Saturday for the next few weeks', checks: r => ({
    threeSessions: r.plan.sessions.length === 3,
    onThoseDays: onDays(r, ['Tue', 'Thu', 'Sat']),
  }) }),
  plan({ id: 'usual-goals', category: 'usual', history: withGoals, request: 'plan my week', checks: r => ({
    threeSessions: r.plan.sessions.length === 3, // daysPerWeek
    squatTwice: r.plan.sessions.filter(s => r.plan.days[s.day].exercises.some(e => /squat/i.test(e.name))).length >= 2,
    deadliftIn: byName(r, /deadlift/i).length >= 1,
  }) }),

  // Comeback: lighter after time off
  plan({ id: 'comeback-ease-in', category: 'comeback', history: comeback, request: 'been out 3 weeks, ease me back in', checks: r => ({
    lighterBench: ratio(r, /bench/i, 185) === null || ratio(r, /bench/i, 185)! <= 0.85,
    lighterSquat: ratio(r, /squat/i, 225) === null || ratio(r, /squat/i, 225)! <= 0.85,
    someWeightGiven: all(r).some(e => e.weight !== undefined),
    notMoreThanFourDays: r.plan.sessions.length <= 4,
  }) }),
  plan({ id: 'comeback-plain-ask', category: 'comeback', history: comeback, request: 'new plan for next week', checks: r => ({
    lighterBench: ratio(r, /bench/i, 185) === null || ratio(r, /bench/i, 185)! <= 0.85,
    lighterSquat: ratio(r, /squat/i, 225) === null || ratio(r, /squat/i, 225)! <= 0.85,
    lighterDeadlift: ratio(r, /^deadlift/i, 275) === null || ratio(r, /^deadlift/i, 275)! <= 0.85,
  }) }),
  plan({ id: 'skipper-wednesdays', category: 'comeback', history: skipper, request: 'new plan for next week', checks: r => ({
    fewerOrOffWednesday: r.plan.sessions.length <= 2 || !r.plan.sessions.some(s => onDays({ plan: { sessions: [s] } } as PlannerResponse, ['Wed'])),
  }) }),

  // Own workouts: keep them exactly, fill the rest
  plan({ id: 'mine-two-days', category: 'own-workouts', history: sam, request: 'Monday: bench 5x5 185, rows 3x8 135. Thursday: squat 5x5 225, RDL 3x8 185. Fill in two more days for me', checks: r => {
    const mine = days(r).filter(d => d.source === 'mine');
    const has = (d: { exercises: { name: string; sets: number; reps: number | string; weight?: number }[] }, name: RegExp, sets: number, reps: number, w: number) =>
      d.exercises.some(e => name.test(e.name) && e.sets === sets && e.reps === reps && e.weight === w);
    return {
      fourSessions: r.plan.sessions.length === 4,
      twoMineDays: mine.length === 2,
      mondayKept: mine.some(d => has(d, /bench/i, 5, 5, 185) && has(d, /row/i, 3, 8, 135)),
      thursdayKept: mine.some(d => has(d, /squat/i, 5, 5, 225) && has(d, /rdl|romanian/i, 3, 8, 185)),
      mineOnMonThu: r.plan.sessions.filter(s => r.plan.days[s.day].source === 'mine').every(s => onDays({ plan: { sessions: [s] } } as PlannerResponse, ['Mon', 'Thu'])),
    };
  } }),

  // Tweaks: change only what was asked
  plan({ id: 'tweak-easier', category: 'tweak', history: sam, ...tweak, request: 'make it easier', checks: r => ({
    sameSessions: sameSessions(r),
    sameDayKeys: JSON.stringify(Object.keys(r.plan.days)) === JSON.stringify(Object.keys(draft.days)),
    nothingHarder: Object.entries(draft.days).every(([k, d]) => d.exercises.every(e => {
      const now = r.plan.days[k]?.exercises.find(x => x.name === e.name);
      return !now || ((now.weight ?? 0) <= (e.weight ?? 0) && now.sets <= e.sets);
    })),
    somethingEasier: Object.entries(draft.days).some(([k, d]) => d.exercises.some(e => {
      const now = r.plan.days[k]?.exercises.find(x => x.name === e.name);
      return now && ((now.weight ?? 0) < (e.weight ?? 0) || now.sets < e.sets);
    })),
  }) }),
  plan({ id: 'tweak-move-day', category: 'tweak', history: sam, ...tweak, request: 'move Friday to Saturday', checks: r => ({
    fridayMoved: r.plan.sessions.some(s => s.date === '2026-10-17' && s.day === 'LA') && !r.plan.sessions.some(s => s.date === '2026-10-16'),
    otherSessionsKept: sameSessions(r, ['2026-10-16', '2026-10-17']),
    exercisesUntouched: sameDays(r),
  }) }),
  plan({ id: 'tweak-swap-exercise', category: 'tweak', history: sam, ...tweak, request: 'swap the deadlifts for trap bar deadlifts', checks: r => ({
    swapped: byName(r, /trap bar/i).length === 1 && byName(r, /^deadlift$/i).length === 0,
    rdlKept: byName(r, /romanian/i).length === 1,
    sessionsKept: sameSessions(r),
    restUntouched: Object.entries(draft.days).every(([k, d]) => d.exercises.filter(e => e.name !== 'Deadlift').every(e => JSON.stringify(r.plan.days[k]?.exercises.find(x => x.name === e.name)) === JSON.stringify(e))),
  }) }),
  plan({ id: 'tweak-add-cardio', category: 'tweak', history: sam, ...tweak, request: 'add 15 min of cardio at the end of each day', checks: r => ({
    cardioEveryDay: days(r).every(d => d.exercises.some(e => e.muscleGroup === 'cardio')),
    cardioLast: days(r).every(d => d.exercises[d.exercises.length - 1].muscleGroup === 'cardio'),
    liftsKept: Object.entries(draft.days).every(([k, d]) => d.exercises.every(e => r.plan.days[k]?.exercises.some(x => x.name === e.name))),
    sessionsKept: sameSessions(r),
  }) }),

  // Units: a kg user gets kg numbers
  plan({ id: 'kg-strength', category: 'units', history: kgUser, request: 'plan 3 days, strength focus', checks: r => ({
    threeSessions: r.plan.sessions.length === 3,
    kgWeights: all(r).every(e => e.weight === undefined || e.weight <= 250), // a leg press in kg, never a squat in lbs
    squatNearRecent: ratio(r, /squat/i, 100) === null || (ratio(r, /squat/i, 100)! >= 0.7 && ratio(r, /squat/i, 100)! <= 1.05),
    benchNearRecent: ratio(r, /bench/i, 80) === null || (ratio(r, /bench/i, 80)! >= 0.7 && ratio(r, /bench/i, 80)! <= 1.05),
  }) }),
  plan({ id: 'constraints-no-barbell', category: 'constraints', history: sam, request: 'dumbbells only this week, my gym is closed and I have up to 50s at home', checks: r => ({
    noBarbell: all(r).every(e => !/barbell|deadlift|squat$|bench press$/i.test(e.name) || /dumbbell|db|goblet/i.test(e.name)),
    homeWeights: all(r).every(e => e.weight === undefined || e.weight <= 50),
    fourSessions: r.plan.sessions.length >= 3 && r.plan.sessions.length <= 4,
  }) }),

  // Templates: the Templates screen's "describe it" box
  { kind: 'template', id: 'template-push-day', category: 'template', input: 'Push day: bench 4x8 @185, incline db press 3x10 60s, lateral raises 3x15, tricep pushdown 3x12', expect: [
    { name: /bench/i, sets: 4, reps: 8, weight: 185 },
    { name: /incline/i, sets: 3, reps: 10, weight: 60 },
    { name: /lateral/i, sets: 3, reps: 15 },
    { name: /pushdown|tricep/i, sets: 3, reps: 12 },
  ] },
  { kind: 'template', id: 'template-5x5', category: 'template', input: '5x5 squat, bench and rows', expect: [
    { name: /squat/i, sets: 5, reps: 5 },
    { name: /bench/i, sets: 5, reps: 5 },
    { name: /row/i, sets: 5, reps: 5 },
  ] },
  { kind: 'template', id: 'template-kg-ranges', category: 'template', input: 'Legs: squats 3x8-12 at 100kg, leg press 3x12, RDL 3x10 80 kg, calf raises 4x15', expect: [
    { name: /squat/i, sets: 3, reps: '8-12', weight: 100, weightUnit: 'kg' },
    { name: /leg press/i, sets: 3, reps: 12 },
    { name: /rdl|romanian/i, sets: 3, reps: 10, weight: 80, weightUnit: 'kg' },
    { name: /calf/i, sets: 4, reps: 15 },
  ] },
  { kind: 'template', id: 'template-sets-of', category: 'template', input: 'pull ups 3 sets to failure, 4 sets of 10 rows, face pulls 3x15', expect: [
    { name: /pull.?up/i, sets: 3 },
    { name: /row/i, sets: 4, reps: 10 },
    { name: /face pull/i, sets: 3, reps: 15 },
  ] },
  // A trailing-s number is seconds, not weight, off a dumbbell lift (null = no weight)
  { kind: 'template', id: 'template-plank-hold', category: 'template', input: 'plank 3x1 60s', expect: [
    { name: /plank/i, sets: 3, weight: null },
  ] },
  { kind: 'template', id: 'template-rest', category: 'template', input: 'bench 3x8 90s rest', expect: [
    { name: /bench/i, sets: 3, reps: 8, weight: null },
  ] },
];
