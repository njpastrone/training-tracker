import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen, logBar, type ChatBarProps } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import { CardHead, CoachLine, Disc, Doors, HueCard, Link, WeekStrip } from '../../components/Hue';
import ParsedCard from '../../components/ParsedCard';
import PlanCard from '../../components/PlanCard';
import { CustomRow, MuscleGrid } from '../../components/GoalsCard';
import { Toast } from '../../components/SelectableWorkoutList';
import { dayLabel } from '../../components/WorkoutCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useLogDraft } from '../../hooks/useLogDraft';
import { usePlanner } from '../../hooks/usePlanner';
import { digest, target, type LiftTrend } from '../../services/insights';
import { checkIn } from '../../services/checkin';
import { DEFAULT_MUSCLES, NO_GOALS, goalProgress } from '../../services/goals';
import { readsAsQuestion } from '../../services/ask';
import { GOALS } from '../../services/onboarding';
import { getPlans, deletePlan } from '../../services/planner';
import { missedChips, planChips, toChips } from '../../services/suggestions';
import { trainingLine } from '../../services/coachLine';
import { dayWord, muscleWeek, plannedDays, trainingWeek, weekRange } from '../../services/week';
import { fonts, spacing } from '../../constants/theme';
import type { TrainingPlan } from '../../types/plan';
import type { Workout } from '../../types/workout';

const LIFTS = 3; // lifts on the tab; the rest are a door away
const DEFAULT_TWEAKS = ['Easier', 'Harder', '45 min max', 'Different days', 'Add cardio'];
const PLAN_WORDS = /\b(plan|schedule|week|split|days?|tomorrow|next)\b/i;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// How training is going, in four blocks: the goal and this week (the hero), the muscle grid with sets,
// lifts with their next numbers and one coach line, then the doors to everything else. The bar plans
// your week ("Next week, 4 days") or logs a missed day ("legs on Wed"); a question goes to Chat.
export default function TrainingScreen() {
  const { colors, sky } = useTheme();
  const router = useRouter();
  const { workouts, foodEntries, exerciseLibrary, settings, updateSettings, deleteWorkouts, schedule, templates, loadSchedule, loadTemplates } = useWorkoutStore();
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  // planId: set after Plan it, so the tab can offer Undo. request: a plan asked for from Today or a day
  const { planId, request } = useLocalSearchParams<{ planId?: string; request?: string }>();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [forcePlan, setForcePlan] = useState(false); // the next send plans, whatever the words
  const [logged, setLogged] = useState<Workout[] | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const planner = usePlanner({ plans, onPlanned: plan => router.setParams({ planId: plan.id }) });
  const log = useLogDraft({
    date: today,
    onLogged: (_id, _template, saved) => setLogged(saved ?? null),
    onQuestion: question => router.navigate({ pathname: '/(tabs)/chat', params: { question } }),
  });

  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);
  const week = useMemo(() => trainingWeek(workouts, schedule, templates, now), [workouts, schedule, templates, today]);
  const rows = useMemo(() => muscleWeek(settings.goals, workouts, schedule, templates, exerciseLibrary, now), [settings.goals, workouts, schedule, templates, exerciseLibrary, today]);
  const goals = useMemo(() => settings.goals && goalProgress(settings.goals, workouts, exerciseLibrary, foodEntries), [settings.goals, workouts, exerciseLibrary, foodEntries]);
  const check = useMemo(() => checkIn({ workouts, digest: d, goals, schedule, templates, library: exerciseLibrary }), [workouts, d, goals, schedule, templates, exerciseLibrary]);
  const planned = useMemo(() => plannedDays(schedule, templates, workouts, today), [schedule, templates, workouts, today]);
  const line = trainingLine(rows, planned, d.daysSinceGroupTrained, check, today);
  const lifts = useMemo(() => [...d.liftTrends].sort((a, b) => b.recent[0].date.localeCompare(a.recent[0].date)).slice(0, LIFTS), [d]);
  const addedPlan = plans.find(p => p.id === planId && p.status === 'active');
  const addedCount = schedule.filter(s => s.planId === planId).length;
  const foodOnly = !workouts.length && foodEntries.length > 0;
  const starters = useMemo(() => (foodOnly ? [] : planChips(workouts, settings.weeklyTarget)), [foodOnly, workouts, settings.weeklyTarget]);
  const missed = useMemo(() => missedChips(workouts, schedule, templates), [workouts, schedule, templates]);

  useEffect(() => {
    loadTemplates();
    loadSchedule();
  }, []);
  useEffect(() => {
    getPlans().then(setPlans);
  }, [schedule]);
  useEffect(() => {
    if (!request) return;
    log.setText(request);
    setForcePlan(true);
    router.setParams({ request: '' });
  }, [request]);

  const handleDeletePlan = async (id: string) => {
    try {
      await deletePlan(id);
      await Promise.all([loadSchedule(), loadTemplates()]);
      if (id === planId) router.setParams({ planId: '' });
    } catch (error) {
      Alert.alert("Couldn't delete the plan", 'Try again.');
    }
  };

  const fixing = !!log.draft;
  const planning = !!planner.sent || !!planner.draft;
  const reviewing = !!log.sent || fixing;
  const sendPlan = (text: string) => {
    setForcePlan(false);
    log.setText('');
    planner.send(text);
  };
  // One bar: a plan tweak while a plan is open, a fix while a card is open, else plan words plan, a
  // question goes to Chat, anything else logs a day
  const bar: ChatBarProps = fixing
    ? logBar(log, '', [])
    : {
        value: log.text,
        onChangeText: text => {
          log.setText(text);
          if (!text) setForcePlan(false);
        },
        onSend: () => {
          const text = log.text.trim();
          if (!text) return;
          if (planner.draft || forcePlan || (PLAN_WORDS.test(text) && !readsAsQuestion(text))) return sendPlan(text);
          log.parse();
        },
        placeholder: planner.draft ? 'Fix or ask…' : 'Plan your week, or “legs on Wed”',
        chips: planner.draft ? toChips(planner.draft.chips.length ? planner.draft.chips : DEFAULT_TWEAKS) : log.text.trim() ? [] : [...starters, ...missed],
        onChip: text => (planner.draft || starters.some(c => c.text === text) ? sendPlan(text) : log.setText(text)),
        busy: log.busy === 'parse' || planner.busy,
        disabled: planner.saving || log.busy === 'save',
        error: planner.draft ? null : log.error ?? planner.error,
      };

  const target7 = sky.target;
  const timesGoal = settings.goals?.timesPerWeek;
  const subtitle = `${weekRange(now)} · goal ${target7} day${target7 === 1 ? '' : 's'} a week${timesGoal ? `, each muscle ${timesGoal}×` : ''}`;
  const trains = workouts.length > 0 || planned.length > 0;
  const loggedDays = logged ? [...new Set(logged.map(w => w.date))] : [];

  return (
    <ChatScreen
      bar={bar}
      follow={reviewing || planning}
      hue={{ glow: [colors.trainSoft], accent: colors.sunrise }}
      overlay={
        logged && (
          <Toast
            key={logged.map(w => w.id).join()}
            icon="checkmark.circle.fill"
            text={`Logged ${loggedDays.map(loggedOn).join(' and ')}`}
            onUndo={() => deleteWorkouts(logged.map(w => w.id))}
            onClose={() => setLogged(null)}
          />
        )
      }
    >
      <LargeTitle title="Training" subtitle={subtitle} />

      {/* The goal is asked once planning starts, then remembered (Settings can change it) */}
      {(planning || forcePlan) && !settings.goal && (
        <SkyCard card>
          <SectionLabel>What are you training for?</SectionLabel>
          <View style={styles.goalRow}>
            {GOALS.map(goal => (
              <Pill key={goal.value} variant="glass" size="small" label={goal.label} onPress={() => updateSettings({ goal: goal.value })} />
            ))}
          </View>
        </SkyCard>
      )}

      {/* Planning: your message, then the plan to tweak in the bar and put on the calendar */}
      {planner.sent && <UserBubble text={planner.sent} />}
      {planner.draft && planner.preview && (
        <PlanCard
          draft={planner.draft}
          previous={planner.previous}
          preview={planner.preview}
          context={planner.context}
          busy={planner.busy}
          saving={planner.saving}
          error={planner.error}
          onPlanIt={planner.planIt}
          onUndo={planner.undoTweak}
          onStartOver={planner.startOver}
        />
      )}

      {/* Corrections: a missed workout in plain words goes to its own day */}
      {log.sent && <UserBubble text={log.sent} />}
      {log.draft && (
        <ParsedCard draft={log.draft} date={today} onChange={log.setDraft} onSave={log.save} onDiscard={log.discard} busy={log.busy} error={log.error} reply={log.reply} />
      )}

      {!reviewing && !planning && (
        <>
          {addedPlan && (
            <SkyCard card style={styles.planBanner}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
              <Text variant="bodyMedium" style={[styles.planBannerText, { color: colors.text }]}>
                {addedPlan.name} added · {addedCount} workout{addedCount === 1 ? '' : 's'}
              </Text>
              <Pill variant="glass" size="small" label="Undo" onPress={() => planId && handleDeletePlan(planId)} />
              <Pressable onPress={() => router.setParams({ planId: '' })} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={15}>
                <SymbolView name="xmark" size={14} weight="semibold" tintColor={colors.textSecondary} />
              </Pressable>
            </SkyCard>
          )}

          {/* Slot 1: the goal and this week */}
          <HueCard hue="train" label={`${week.done} of ${target7} training days this week${week.next ? `, ${week.next.name} planned ${dayWord(week.next.date, today)}` : ''}`}>
            <CardHead label="This week" onHero right={<Link label="Month" onHero onPress={() => router.push('/calendar')} accessibilityLabel="Open the calendar" />} />
            <View style={styles.heroNum}>
              <Text style={[styles.big, { color: colors.onHero }]}>{week.done}</Text>
              <Text style={[styles.of, { color: colors.onHeroSoft }]}>of {target7} days</Text>
              <Text style={[styles.right, { color: colors.onHeroSoft }]}>{week.next ? `${week.next.name} planned\n${capital(dayWord(week.next.date, today))}` : 'Nothing\nplanned'}</Text>
            </View>
            <WeekStrip
              days={week.days.map(day => ({
                key: day.date,
                letter: day.letter,
                today: day.today,
                label: `${format(parseISO(day.date), 'EEEE d')}${day.trained ? ', trained' : day.planned ? `, ${day.planned} planned` : ''}`,
                onPress: () => router.push(`/day/${day.date}`),
                disc: <Disc hue="train" label={format(parseISO(day.date), 'd')} today={day.today} state={day.trained ? 'on' : day.planned ? 'plan' : day.future ? 'future' : 'rest'} />,
              }))}
            />
          </HueCard>

          {/* Slot 2: the breakdown, the muscle grid with sets */}
          {trains ? (
            <SkyCard card style={styles.gridCard}>
              <CardHead label="Muscles · this week" />
              <MuscleGrid rows={rows} days={week.days} />
            </SkyCard>
          ) : (
            <SkyCard card style={styles.empty}>
              <SymbolView name="dumbbell" size={30} tintColor={colors.sunrise} />
              <Text variant="titleMedium" style={{ color: colors.text }}>Your training shows up here</Text>
              <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                Log a workout on Today, or plan your week in the bar below. Numbers are optional.
              </Text>
            </SkyCard>
          )}
          {!settings.goals && workouts.length > 0 && !settings.goalsPromptDismissed && (
            <GoalsPrompt
              onPreset={() => updateSettings({ goals: { ...NO_GOALS, muscles: DEFAULT_MUSCLES, timesPerWeek: 2 } })}
              onOwn={() => router.push('/goals')}
              onNotNow={() => updateSettings({ goalsPromptDismissed: true })}
            />
          )}

          {/* Slot 3: lifts, PRs and next targets, your own goals, and the coach line */}
          {(lifts.length > 0 || !!goals?.custom.length || line) && (
            <SkyCard card style={styles.liftsCard}>
              {(lifts.length > 0 || !!goals?.custom.length) && (
                <CardHead label="Lifts" right={<Link label={`All ${d.exercises.length}`} onPress={() => router.push('/exercises')} accessibilityLabel="All exercises" />} />
              )}
              {lifts.map((t, i) => (
                <LiftRow key={t.id} trend={t} first={i === 0} onPress={() => router.push({ pathname: '/exercise', params: { id: t.id } })} />
              ))}
              {goals?.custom.map((c, i) => (
                <CustomRow key={c.goal.id} c={c} first={i === 0 && lifts.length === 0} />
              ))}
              {line && (
                <CoachLine line={line} inset={lifts.length > 0 || !!goals?.custom.length} onPress={check ? () => setCheckOpen(!checkOpen) : undefined} open={checkOpen}>
                  {check && (
                    <View style={styles.checkIn}>
                      {part('Wins', check.wins, colors.text)}
                      {part('Watch', check.watch ? [check.watch] : [], colors.warning)}
                      {part('Next 7 days', check.next.length ? check.next : ['Nothing planned'], colors.textSecondary)}
                    </View>
                  )}
                </CoachLine>
              )}
            </SkyCard>
          )}

          {/* Slot 4: everything else, one tap away */}
          <Doors
            hue="train"
            doors={[
              { sf: 'calendar', md: 'calendar-month', label: 'Plan', onPress: () => router.push('/templates') },
              { sf: 'dumbbell', md: 'fitness-center', label: 'Exercises', onPress: () => router.push('/exercises') },
              { sf: 'target', md: 'track-changes', label: 'Goals', onPress: () => router.push('/goals') },
              { sf: 'camera', md: 'photo-camera', label: 'Photos', onPress: () => router.push('/photos') },
              { sf: 'heart.text.square', md: 'favorite-border', label: 'Health', onPress: () => router.push('/health') },
            ]}
          />
        </>
      )}
    </ChatScreen>
  );
}

// "today", "yesterday", "on Friday, Oct 2"
const loggedOn = (date: string) => {
  const label = dayLabel(date);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : `on ${label}`;
};

// A part of the opened check-in: Wins, Watch, Next 7 days
const part = (label: string, lines: string[], color: string) =>
  lines.length > 0 && (
    <View style={styles.part}>
      <SectionLabel>{label}</SectionLabel>
      {lines.map(line => (
        <Text key={line} variant="bodyMedium" style={{ color }}>{line}</Text>
      ))}
    </View>
  );

// The first-use prompt for goals: the owner's own goal in one tap, your own on the Goals screen
function GoalsPrompt({ onPreset, onOwn, onNotNow }: { onPreset: () => void; onOwn: () => void; onNotNow: () => void }) {
  const { colors } = useTheme();
  return (
    <SkyCard card>
      <View style={styles.promptTop}>
        <View style={[styles.promptIcon, { backgroundColor: colors.dim }]}>
          <SymbolView name="target" size={17} weight="semibold" tintColor={colors.sunrise} />
        </View>
        <View style={styles.fill}>
          <Text variant="titleMedium" style={{ color: colors.text }}>Set a weekly goal</Text>
          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>See which muscles you've covered this week, and what's left.</Text>
        </View>
      </View>
      <View style={styles.promptActions}>
        <Pill size="small" label="Each muscle 2× a week" onPress={onPreset} />
        <Pill variant="glass" size="small" label="My own goals" onPress={onOwn} />
      </View>
      <Pressable onPress={onNotNow} accessibilityRole="button" hitSlop={10} style={styles.notNow}>
        <Text variant="labelMedium" style={{ color: colors.textTertiary }}>Not now</Text>
      </Pressable>
    </SkyCard>
  );
}

// One lift: its latest top set and where it's going, a sparkline, and the next number (or what to try when stuck)
function LiftRow({ trend: t, first, onPress }: { trend: LiftTrend; first: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { weight, reps, unit } = t.recent[0];
  const stuck = t.sessionsAtSameTopSet >= 3;
  const oldest = t.recent[t.recent.length - 1];
  const diff = weight - oldest.weight;
  const u = unit === 'kg' ? 'kg' : 'lb';
  const went = stuck ? `same ${t.sessionsAtSameTopSet} sessions` : diff > 0 ? `up ${diff} ${u} in ${t.recent.length}` : 'holding';
  const next = target(t).next;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t.lift}${t.isAllTimeBest ? ', a new best' : ''}, ${weight} ${u}${reps ? ` × ${reps}` : ''}, ${went}${stuck ? '' : ' sessions'}, ${stuck ? 'try' : 'next'} ${next}`}
      accessibilityHint="Shows every time, or adds a past session"
      style={({ pressed }) => [styles.lift, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }, pressed && styles.pressed]}
    >
      <View style={styles.fill}>
        <View style={styles.nameRow}>
          <Text style={[styles.liftName, styles.shrink, { color: colors.text }]} numberOfLines={1}>{t.lift}</Text>
          {t.isAllTimeBest && <Text style={[styles.pr, { color: colors.onSunrise, backgroundColor: colors.sunrise }]}>PR</Text>}
        </View>
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{`${weight}${reps ? ` × ${reps}` : ''} · ${went}`}</Text>
      </View>
      <Sparkline weights={t.recent.map(s => s.weight).reverse()} color={stuck ? colors.warning : colors.sunrise} />
      <View style={styles.next}>
        <Text style={[styles.nextWord, { color: colors.textSecondary }]}>{stuck ? 'try' : 'next'}</Text>
        <Text style={[styles.nextNum, { color: stuck ? colors.warning : colors.text }]}>{next}</Text>
      </View>
    </Pressable>
  );
}

// The last few top weights, oldest to newest
function Sparkline({ weights, color }: { weights: number[]; color: string }) {
  const W = 56;
  const H = 22;
  const min = Math.min(...weights);
  const span = Math.max(...weights) - min || 1;
  const points = weights.map((w, i) => `${(i / (weights.length - 1)) * W},${H - 2 - ((w - min) / span) * (H - 4)}`).join(' ');
  return (
    <Svg width={W} height={H} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  center: {
    textAlign: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  planBannerText: {
    flex: 1,
    fontWeight: '500',
  },
  heroNum: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  big: {
    fontFamily: fonts.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  of: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  right: {
    marginLeft: 'auto',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  gridCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  liftsCard: {
    paddingVertical: 12,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  lift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liftName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  pr: {
    flexShrink: 0,
    fontFamily: fonts.rounded,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
    borderRadius: 7,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  next: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  nextWord: {
    fontFamily: fonts.rounded,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  nextNum: {
    fontFamily: fonts.rounded,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  checkIn: {
    gap: 2,
  },
  part: {
    gap: 2,
    marginTop: spacing.md,
  },
  promptTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notNow: {
    alignSelf: 'flex-start',
    marginTop: spacing.gap,
    minHeight: 24,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
