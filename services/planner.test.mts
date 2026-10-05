/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, format } from 'date-fns';

// In-memory AsyncStorage so the real services run under node
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
});
const { validatePlanResponse, parsePlannerText, savePlan, deletePlan, getPlans } = await import('./planner');
const { scheduleService } = await import('./schedule');
const { templateService } = await import('./templates');
const { useWorkoutStore } = await import('../stores/workoutStore');

const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
const TODAY = '2026-10-04';
const WINDOW_END = '2026-10-17';

const validResponse = () => ({
  reply: '4 days, Wednesday off.',
  plan: {
    name: 'Re-entry week',
    days: {
      UA: { name: 'Upper A', source: 'suggested', exercises: [
        { name: 'Bench press', muscleGroup: 'chest', sets: 3, reps: '8', weight: 135 },
        { name: 'Mystery move', muscleGroup: 'lats', sets: '3', reps: '8-12', weight: null },
      ] },
      LA: { name: 'Lower A', source: 'mine', exercises: [{ name: 'Plank', muscleGroup: 'core', sets: 3, reps: '30s' }] },
    },
    sessions: [
      { date: '2026-10-08', day: 'LA' },
      { date: '2026-10-05', day: 'UA', note: 'Easy day' },
    ],
    repeatWeeks: 40,
  },
  chips: ['Easier', 7, ''],
});

test('validatePlanResponse normalizes a good plan', () => {
  const result = validatePlanResponse(validResponse(), TODAY, WINDOW_END)!;
  assert.ok(result);
  assert.deepEqual(result.plan.sessions.map(s => s.date), ['2026-10-05', '2026-10-08']);
  assert.equal(result.plan.sessions[0].note, 'Easy day');
  assert.equal(result.plan.repeatWeeks, 12);
  assert.deepEqual(result.chips, ['Easier']);
  assert.deepEqual(result.plan.days.UA.exercises[0], { name: 'Bench press', muscleGroup: 'chest', sets: 3, reps: 8, weight: 135 });
  assert.deepEqual(result.plan.days.UA.exercises[1], { name: 'Mystery move', muscleGroup: 'full_body', sets: 3, reps: '8-12' });
  assert.equal(result.plan.days.LA.source, 'mine');
  assert.equal(result.plan.days.LA.exercises[0].reps, '30s');
});

test('validatePlanResponse rejects unusable plans', () => {
  const cases: [string, (r: any) => void][] = [
    ['date before today', r => { r.plan.sessions[0].date = '2026-10-03'; }],
    ['date after window', r => { r.plan.sessions[0].date = '2026-10-18'; }],
    ['impossible date', r => { r.plan.sessions[0].date = '2026-02-30'; }],
    ['duplicate date', r => { r.plan.sessions[1].date = '2026-10-08'; }],
    ['unknown day', r => { r.plan.sessions[0].day = 'XX'; }],
    ['prototype day key', r => { r.plan.sessions[0].day = 'toString'; }],
    ['no sessions', r => { r.plan.sessions = []; }],
    ['too many day types', r => { for (const k of ['A', 'B', 'C', 'D']) r.plan.days[k] = r.plan.days.UA; }],
    ['too many exercises', r => { r.plan.days.UA.exercises = Array(8).fill(r.plan.days.LA.exercises[0]); }],
    ['non-numeric sets', r => { r.plan.days.UA.exercises[0].sets = 'three'; }],
    ['non-numeric reps', r => { r.plan.days.UA.exercises[0].reps = 'many'; }],
    ['missing plan', r => { delete r.plan; }],
  ];
  for (const [label, breakIt] of cases) {
    const r = validResponse();
    breakIt(r);
    assert.equal(validatePlanResponse(r, TODAY, WINDOW_END), null, label);
  }
});

test('parsePlannerText ignores surrounding prose and rejects bad JSON', () => {
  const text = 'Here you go:\n```json\n' + JSON.stringify(validResponse()) + '\n```';
  assert.ok(parsePlannerText(text, TODAY, WINDOW_END));
  assert.equal(parsePlannerText('{"plan": {', TODAY, WINDOW_END), null);
  assert.equal(parsePlannerText('no json here', TODAY, WINDOW_END), null);
});

beforeEach(() => mem.clear());

const draft = () => ({
  name: 'Re-entry week',
  days: {
    UA: { name: 'Upper A', source: 'suggested' as const, exercises: [{ name: 'Bench press', muscleGroup: 'chest' as const, sets: 3, reps: 8, weight: 135 }] },
    LA: { name: 'Lower A', source: 'suggested' as const, exercises: [{ name: 'Goblet squat', muscleGroup: 'quads' as const, sets: 3, reps: 10 }] },
  },
  sessions: [
    { date: day(0), day: 'UA', note: 'Easy day' },
    { date: day(2), day: 'LA' },
    { date: day(4), day: 'UA' },
  ],
  repeatWeeks: 2,
});

test('Plan it saves templates and sessions; Undo removes them but keeps completed ones', async () => {
  await scheduleService.saveSchedule([
    { id: 'open', date: day(2), templateId: 'old', isRecurring: false, completed: false },
    { id: 'done', date: day(4), templateId: 'old', isRecurring: false, completed: true },
    { id: 'other', date: day(3), templateId: 'old', isRecurring: false, completed: false },
  ]);

  const plan = await savePlan(draft(), 'plan a re-entry week', 'lbs');
  const templates = await templateService.getTemplates();
  assert.deepEqual(templates.map(t => [t.name, t.planId]), [['Upper A', plan.id], ['Lower A', plan.id]]);
  assert.equal(templates[0].exercises[0].weightUnit, 'lbs');

  let schedule = await scheduleService.getSchedule();
  const planned = schedule.filter(s => s.planId === plan.id);
  // 3 sessions x 2 weeks, minus day(4) which already has a completed workout
  assert.deepEqual(planned.map(s => s.date).sort(), [day(0), day(2), day(7), day(9), day(11)]);
  assert.equal(planned.find(s => s.date === day(0))!.note, 'Easy day');
  assert.deepEqual(schedule.filter(s => !s.planId).map(s => s.id).sort(), ['done', 'other']); // 'open' was replaced
  assert.equal(plan.startDate, day(0));
  assert.equal(plan.endDate, day(11));

  // Today's session gets done, then the plan is undone
  assert.equal(await scheduleService.linkLoggedWorkout(day(0), 'w1'), true);
  await deletePlan(plan.id);

  schedule = await scheduleService.getSchedule();
  assert.deepEqual(schedule.filter(s => s.planId === plan.id).map(s => [s.date, s.completed]), [[day(0), true]]);
  assert.deepEqual(schedule.filter(s => !s.planId).map(s => s.id).sort(), ['done', 'other']);
  // Upper A stays because the completed session points at it; Lower A is gone
  assert.deepEqual((await templateService.getTemplates()).map(t => t.name), ['Upper A']);
  assert.equal((await getPlans())[0].status, 'cancelled');
});

test('deleting a plan later in its life keeps its history and removes what is still ahead', async () => {
  await scheduleService.saveSchedule([{ id: 'other', date: day(3), templateId: 'old', isRecurring: false, completed: false }]);
  const plan = await savePlan(draft(), 'plan a re-entry week', 'lbs');

  // A few days in: the first Upper A was done, the second was missed
  const moved: Record<string, { date: string; completed: boolean; completedWorkoutId?: string }> = {
    [day(0)]: { date: day(-5), completed: true, completedWorkoutId: 'w1' },
    [day(4)]: { date: day(-1), completed: false },
  };
  await scheduleService.saveSchedule((await scheduleService.getSchedule()).map(s => (moved[s.date] ? { ...s, ...moved[s.date] } : s)));

  await deletePlan(plan.id);

  const schedule = await scheduleService.getSchedule();
  assert.deepEqual(
    schedule.filter(s => s.planId === plan.id).map(s => [s.date, s.completed, s.completedWorkoutId]).sort(),
    [[day(-1), false, undefined], [day(-5), true, 'w1']].sort()
  );
  assert.deepEqual(schedule.filter(s => !s.planId).map(s => s.id), ['other']);
  // Upper A stays for the past sessions; Lower A only had upcoming sessions
  assert.deepEqual((await templateService.getTemplates()).map(t => t.name), ['Upper A']);
  assert.equal((await getPlans())[0].status, 'cancelled');
});

test('logging a workout on a planned day completes that session and links the workout', async () => {
  await scheduleService.saveSchedule([
    { id: 'p', date: day(0), templateId: 't', isRecurring: false, completed: false, planId: 'plan1' },
    { id: 'manual', date: day(1), templateId: 't', isRecurring: false, completed: false },
    { id: 'skipped', date: day(2), templateId: 't', isRecurring: false, completed: false, skipped: true, planId: 'plan1' },
  ]);

  const workout = { id: 'w42', date: day(0), exercises: [], rawInput: 'bench', muscleGroups: [], createdAt: new Date().toISOString() };
  useWorkoutStore.getState().addWorkout(workout);
  await new Promise(resolve => setTimeout(resolve, 20));

  const schedule = await scheduleService.getSchedule();
  assert.deepEqual(schedule.find(s => s.id === 'p'), {
    id: 'p', date: day(0), templateId: 't', isRecurring: false, completed: true, planId: 'plan1', completedWorkoutId: 'w42',
  });
  assert.equal(useWorkoutStore.getState().schedule.find(s => s.id === 'p')?.completedWorkoutId, 'w42');

  // Only open planned sessions are linked
  assert.equal(await scheduleService.linkLoggedWorkout(day(1), 'w43'), false);
  assert.equal(await scheduleService.linkLoggedWorkout(day(2), 'w44'), false);
  assert.equal(await scheduleService.linkLoggedWorkout(day(5), 'w45'), false);
});
