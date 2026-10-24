import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { SkyCard, LargeTitle } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen, logBar } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import { Caps, CoachLine, HueCard, Ring } from '../../components/Hue';
import ParsedCard from '../../components/ParsedCard';
import FoodCard from '../../components/FoodCard';
import { ThinkingCard } from '../../components/CoachCard';
import { UndoToast } from '../../components/SelectableWorkoutList';
import { MovePickCard } from '../../components/ThreadCards';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useLogDraft } from '../../hooks/useLogDraft';
import { fonts, spacing } from '../../constants/theme';
import { templateService } from '../../services/templates';
import { logChips, usualMeals } from '../../services/suggestions';
import { foodByDay } from '../../services/progress';
import { daysAgo, workoutName, workoutTotals } from '../../services/format';
import { calorieLeft, foodTarget, foodValue, muscleName } from '../../services/goals';
import { digest, target } from '../../services/insights';
import { resolveId } from '../../services/exerciseIdentity';
import { gapMuscle, todayLine } from '../../services/coachLine';
import { dayWord, mealBubbles, muscleWeek, nextMeal, nextUp, plannedDays } from '../../services/week';
import type { FoodGoal, ParsedWorkoutResponse, Workout } from '../../types/workout';
import LogoMark from '../../components/LogoMark';

// "Show me an example" for a first-time user: detail on one lift, names for the rest. Never saved.
const exampleLog = (kg: boolean) => `chest and back today: bench, rows, pull-ups. bench was 3 sets of 8 at ${kg ? 60 : 135}`;
const exampleDraft = (kg: boolean): ParsedWorkoutResponse => ({
  exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: 8, weight: kg ? 60 : 135, unit: kg ? 'kg' : 'lbs' },
    { name: 'Barbell Row', muscleGroup: 'back' },
    { name: 'Pull-ups', muscleGroup: 'back' },
  ],
  muscleGroups: ['chest', 'back'],
  confidence: 1,
});

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const count = (v: number, word: string) => `${v} ${word}${v === 1 ? '' : 's'}`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SLOT_WORD: Record<string, string> = { Morning: 'breakfast', Midday: 'lunch', Evening: 'dinner' };
const MEAL_NAME: Record<string, string> = { Morning: 'Breakfast', Midday: 'Lunch', Afternoon: 'A snack', Evening: 'Dinner' };

// What now: today's training and food side by side, the next thing to do, tomorrow, and one coach line.
// Logging stays its bar: a workout, food, or both from one message.
export default function TodayScreen() {
  const { workouts, foodEntries, schedule, templates, exerciseLibrary, getTodaysScheduledWorkout, getTemplate, markWorkoutSkipped, markWorkoutCompleted, loadSchedule, loadTemplates, settings } = useWorkoutStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [logged, setLogged] = useState<string | null>(null); // toast after saving
  const [example, setExample] = useState<ParsedWorkoutResponse | null>(null);
  const [notNow, setNotNow] = useState(false);

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;
  const chips = useMemo(() => logChips(workouts, scheduledTemplate, new Date(), foodEntries), [workouts, scheduledTemplate, foodEntries]);

  const food = useMemo(() => foodByDay(foodEntries), [foodEntries]);
  const foodGoal = settings.goals?.food;
  const todays = workouts.filter(w => w.date === today);
  const planned = useMemo(() => plannedDays(schedule, templates, workouts, today), [schedule, templates, workouts, today]);
  const plannedToday = planned.find(p => p.date === today);
  const next = planned.find(p => p.date > today);
  // Tiles: Training for anyone who lifts or has a plan, Food for anyone who logs food or set a food goal
  const lifts = workouts.length > 0 || planned.length > 0;
  const eats = foodEntries.length > 0 || !!foodGoal;

  const bubbles = useMemo(() => mealBubbles(foodEntries.filter(e => e.date === today), foodGoal, now), [foodEntries, foodGoal, today]);
  const toGo = bubbles.find(b => b.toGo);
  const slot = toGo?.name ?? nextMeal(bubbles, now)?.[0];
  const usual = useMemo(() => {
    const u = slot && SLOT_WORD[slot] && usualMeals(foodEntries, now).find(m => m.slot === SLOT_WORD[slot]);
    if (!u) return undefined;
    const names = u.entry.items.map(i => i.name.toLowerCase());
    return { items: names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' and '), around: format(parseISO(u.entry.createdAt), 'h a').toLowerCase(), said: u.entry.items.map(i => i.said ?? i.name).join(', ') };
  }, [foodEntries, slot]);
  const up = nextUp({ plannedToday, trainedToday: todays.length > 0, lifts, eats, slot, goal: foodGoal, today: food.get(today), bubbles, usual, plannedAhead: !!next });

  // The coach line: what's left of the protein goal, and the goal muscle furthest off that a plan covers
  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);
  const rows = useMemo(() => muscleWeek(settings.goals, workouts, schedule, templates, exerciseLibrary, now), [settings.goals, workouts, schedule, templates, exerciseLibrary, today]);
  const gap = gapMuscle(rows, d.daysSinceGroupTrained);
  const line = todayLine({
    left: foodGoal?.kind === 'protein' && (food.get(today) || toGo) ? Math.max(0, foodGoal.target - (food.get(today)?.protein ?? 0)) : undefined,
    nextMeal: toGo && MEAL_NAME[toGo.name],
    gap: gap && { group: gap.group, daysSince: d.daysSinceGroupTrained[gap.group], plan: planned.find(p => p.groups.includes(gap.group)) },
    today,
  });
  // Tomorrow's first lift with its next number, as the check-in does
  const trends = useMemo(() => new Map(d.liftTrends.map(t => [t.id, t])), [d]);
  const nextLift = next && templates.find(t => t.id === next.templateId)?.exercises.map(e => e.exerciseId && trends.get(resolveId(e.exerciseId, exerciseLibrary))).find(Boolean);

  // Nothing logged yet: the first-run hint stands in for the tiles. After the first log the planner
  // is offered for the rest of the week.
  const firstRun = workouts.length === 0 && foodEntries.length === 0;
  const justStarted = !!settings.onboardedAt && workouts.length === 1 && workouts[0].date === today;
  const weeklyTarget = settings.weeklyTarget ?? 3;
  // Planning happens in Training's chat bar
  const plan = (request: string) => router.navigate({ pathname: '/(tabs)/training', params: { request } });

  const log = useLogDraft({
    date: today,
    withFood: true,
    moves: true,
    onQuestion: question => router.navigate({ pathname: '/(tabs)/chat', params: { question } }),
    onLogged: async (workoutId, templateId) => {
      // Logged from today's scheduled template: mark the schedule completed
      if (templateId && todaysSchedule && todaysSchedule.templateId === templateId) {
        try {
          await markWorkoutCompleted(todaysSchedule.date, workoutId);
        } catch (error) {
          console.log('Warning: Could not mark scheduled workout as completed:', error);
        }
      }
      setLogged('Logged');
    },
  });

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setLogged(null), 2500);
    return () => clearTimeout(timer);
  }, [logged]);

  const startPlanned = () => {
    if (!scheduledTemplate) {
      Alert.alert("Couldn't find today's template", 'Try planning the day again.');
      return;
    }
    try {
      log.startFromTemplate(templateService.templateToWorkout(scheduledTemplate), scheduledTemplate.id);
    } catch (error) {
      console.error('Error in startPlanned:', error);
      Alert.alert("Couldn't start the workout", 'Try again.');
    }
  };

  const skipPlanned = () => {
    if (!todaysSchedule) return;
    Alert.alert("Skip today's workout?", 'You can plan it again anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          try {
            await markWorkoutSkipped(todaysSchedule.date, 'User skipped'); // the Start row going away confirms it
          } catch (error) {
            Alert.alert("Couldn't skip the workout", 'Try again.');
          }
        },
      },
    ]);
  };

  // The Next up button: start the plan in the composer, put the usual meal in the bar, or plan tomorrow
  const act = () => {
    if (up.action === 'start') return startPlanned();
    if (up.action === 'plan') return plan('A workout tomorrow');
    if (usual) log.setText(usual.said);
  };

  const reviewing = !!log.sent || !!log.draft || !!log.food || !!example;

  return (
    <ChatScreen
      bar={logBar(log, "What'd you do or eat today?", chips, () => setExample(null))}
      follow={reviewing}
      overlay={<UndoToast />}
      hue={{ glow: [colors.trainSoft, colors.foodSoft], accent: [colors.sunrise, colors.food] }}
    >
      <LargeTitle title="Today" subtitle={format(now, 'EEEE, MMMM d')} />

      {firstRun && !todaysSchedule ? (
        !reviewing && (
          <SkyCard card style={styles.hint}>
            <LogoMark size={30} color={colors.sunrise} />
            <Text variant="titleMedium" style={{ color: colors.text }}>Log a workout, food, or both</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              Just say what you did or ate, like “chest and back today: bench, rows, pull-ups, then chicken and rice”. Sets, weights and amounts are optional. Or use the mic on the keyboard.
            </Text>
            <View style={styles.firstActions}>
              <Pill variant="glass" size="small" label="Show me an example" onPress={() => setExample(exampleDraft(settings.weightUnit === 'kg'))} />
              <Pill variant="glass" size="small" label="I haven't trained yet" onPress={() => plan(`The rest of this week, ${weeklyTarget} days a week.`)} />
            </View>
          </SkyCard>
        )
      ) : (
        // The rest of the page hides while a parsed card is open (DESIGN-SYSTEM.md, ChatBar)
        !reviewing && (
          <>
            {/* Slot 1: done today, training and food side by side */}
            <View style={styles.twins}>
              {lifts && <TrainingTwin todays={todays} planned={plannedToday?.name} plannedCount={plannedToday?.exercises} last={workouts.find(w => w.date < today)} today={today} />}
              {eats && <FoodTwin total={food.get(today)} goal={foodGoal} />}
            </View>

            {/* Slot 2: the next action */}
            <SkyCard card style={styles.tight}>
              <View style={styles.row}>
                <View style={styles.fill}>
                  <Caps>Next up</Caps>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{up.title}</Text>
                  {up.sub && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{up.sub}</Text>}
                </View>
                {up.action && (
                  <Pill size="small" label={up.action === 'start' ? 'Start' : up.action === 'log' ? 'Log' : 'Plan'} color={up.action === 'log' ? colors.food : undefined} onPress={act} />
                )}
              </View>
              {up.action === 'start' && (
                <Pressable onPress={skipPlanned} accessibilityRole="button" hitSlop={10} style={styles.skip}>
                  <Text variant="labelMedium" style={{ color: colors.textTertiary }}>Skip today</Text>
                </Pressable>
              )}
            </SkyCard>

            {/* Slot 3: tomorrow, or the next planned day */}
            {lifts && (
              <Pressable
                onPress={() => (next ? router.push(`/day/${next.date}`) : plan('A workout tomorrow'))}
                accessibilityRole="button"
                accessibilityLabel={next ? `${capital(dayWord(next.date, today))}, ${next.name} planned, ${count(next.exercises, 'exercise')}` : 'Tomorrow, nothing planned'}
                accessibilityHint={next ? 'Opens the day' : 'Plans it in Training'}
              >
                {({ pressed }) => (
                  <SkyCard card style={[styles.tight, pressed && styles.pressed]}>
                    <View style={styles.row}>
                      <View style={[styles.planRing, { borderColor: next ? colors.sunrise : colors.textTertiary }]}>
                        <Text style={[styles.planRingText, { color: next ? colors.sunrise : colors.textTertiary }]}>{format(parseISO(next?.date ?? today), 'EEEEEE')}</Text>
                      </View>
                      <View style={styles.fill}>
                        <Caps>{next && differenceInCalendarDays(parseISO(next.date), parseISO(today)) !== 1 ? capital(dayWord(next.date, today)) : 'Tomorrow'}</Caps>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{next ? `${next.name} · planned` : 'Nothing planned'}</Text>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                          {next ? [count(next.exercises, 'exercise'), nextLift && `${nextLift.lift} next ${target(nextLift).next}`].filter(Boolean).join(' · ') : 'Plan it in Training'}
                        </Text>
                      </View>
                      <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
                    </View>
                  </SkyCard>
                )}
              </Pressable>
            )}

            {line && <CoachLine line={line} />}
          </>
        )
      )}

      {logged && (
        <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut} style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: colors.glass, borderColor: colors.glassLine }]} accessibilityLiveRegion="polite">
            <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
            <Text variant="titleSmall" style={{ color: colors.text }}>{logged}</Text>
          </View>
        </Animated.View>
      )}

      {!reviewing && !planned.length && justStarted && !notNow && (
        <SkyCard card>
          <Text variant="titleMedium" style={{ color: colors.text }}>Want to plan the rest of your week?</Text>
          <Text variant="bodyMedium" style={[styles.planText, { color: colors.textSecondary }]}>
            You're aiming for {weeklyTarget} days a week. I'll fit the rest around what you just did.
          </Text>
          <View style={styles.actions}>
            <Pill icon="logo" label="Plan my week" onPress={() => plan(`The rest of this week, ${weeklyTarget} days a week.`)} style={styles.primaryAction} />
            <Pill variant="glass" label="Not now" onPress={() => setNotNow(true)} style={styles.secondaryAction} />
          </View>
        </SkyCard>
      )}

      {log.sent && (
        <Animated.View entering={FadeInDown.springify().damping(17)}>
          <UserBubble text={log.sent} />
        </Animated.View>
      )}

      {example && (
        <>
          <Animated.View entering={FadeInDown.springify().damping(17)}>
            <UserBubble text={exampleLog(settings.weightUnit === 'kg')} />
          </Animated.View>
          <ParsedCard
            example
            draft={example}
            date={today}
            title="Here's how that reads"
            onChange={setExample}
            onSave={() => {}}
            onDiscard={() => setExample(null)}
            busy={null}
          />
        </>
      )}

      {log.busy === 'parse' && <ThinkingCard title="Reading it…" />}

      {log.picking && <MovePickCard entries={log.picking.entries} to={log.picking.to} onPick={entry => log.pickMove(entry, log.picking!.to)} onCancel={log.discard} />}

      {log.draft && (
        <ParsedCard
          key={log.templateId ?? 'parsed'}
          draft={log.draft}
          date={today}
          title={log.templateId ? scheduledTemplate?.name : undefined}
          onChange={log.setDraft}
          onSave={log.save}
          onDiscard={log.discard}
          busy={log.busy}
          error={log.error}
          reply={log.reply}
          food={log.food}
          onFoodChange={log.setFood}
        />
      )}

      {log.food && !log.draft && (
        <FoodCard
          food={log.food}
          date={today}
          onChange={log.setFood}
          onSave={log.save}
          onDiscard={log.discard}
          busy={log.busy}
          error={log.error}
          reply={log.reply}
        />
      )}
    </ChatScreen>
  );
}

// Training today in coral: the workout's name with a full ring once it's logged, the plan until then
function TrainingTwin({ todays, planned, plannedCount, last, today }: { todays: Workout[]; planned?: string; plannedCount?: number; last?: Workout; today: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const done = todays.length > 0;
  const groups = [...new Set(todays.flatMap(w => w.muscleGroups))];
  const sets = workoutTotals(todays.flatMap(w => w.exercises)).sets;
  const title = done ? workoutName(groups) : planned ?? 'Rest';
  const sub = done
    ? [`Done · ${count(todays.reduce((s, w) => s + w.exercises.length, 0), 'exercise')}`, groups.map(muscleName).join(', ')]
    : planned
      ? [`Planned · ${count(plannedCount ?? 0, 'exercise')}`, 'Start it in Next up']
      : [last ? `Last: ${workoutName(last.muscleGroups)} ${daysAgo(differenceInCalendarDays(parseISO(today), parseISO(last.date)))}` : 'Nothing yet today', ''];
  return (
    <Pressable onPress={() => router.navigate('/(tabs)/training')} accessibilityRole="button" accessibilityLabel={`Training today: ${title}, ${sub.filter(Boolean).join(', ')}`} accessibilityHint="Opens Training" style={styles.fill}>
      {({ pressed }) => (
        <HueCard hue="train" style={[styles.twin, pressed && styles.pressed]}>
          <View style={styles.twinHead}>
            <Caps onHero>Training</Caps>
            {done && sets > 0 && <Text style={[styles.em, { color: colors.onHero }]}>{sets} sets</Text>}
          </View>
          <Ring size={64} stroke={7} progress={done ? 1 : 0} track={colors.heroTrack} color={colors.onHero}>
            {done ? (
              <SymbolView name="checkmark" size={26} weight="bold" tintColor={colors.onHero} fallback={<MaterialIcons name="check" size={26} color={colors.onHero} />} style={styles.check} />
            ) : (
              <Text style={[styles.ringText, { color: colors.onHeroSoft }]}>{planned ? 'plan' : '–'}</Text>
            )}
          </Ring>
          <Text style={[styles.big, { color: colors.onHero }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.s, { color: colors.onHeroSoft }]}>
            <Text style={{ color: colors.onHero }}>{sub[0].split(' · ')[0]}</Text>
            {sub[0].includes(' · ') ? ` · ${sub[0].split(' · ')[1]}` : ''}
            {sub[1] ? `\n${sub[1]}` : ''}
          </Text>
        </HueCard>
      )}
    </Pressable>
  );
}

// Food today in mint: the goal's number with its ring, what's left and the rest
function FoodTwin({ total, goal }: { total?: { protein: number; kcal: number; meals: number }; goal?: FoodGoal }) {
  const { colors } = useTheme();
  const router = useRouter();
  const value = total ? (goal ? foodValue(goal, total) : total.protein) : 0;
  const protein = !goal || goal.kind === 'protein';
  const share = goal ? value / goal.target : 0;
  const big = protein ? `${value} g` : n(value);
  const of = goal ? `of ${foodTarget(goal)} ${protein ? 'protein' : 'kcal'}` : 'protein';
  const rest = !total
    ? 'Nothing logged yet'
    : protein
      ? `${goal ? (goal.target - value > 0 ? `${goal.target - value} g to go` : 'Goal met ✓') : ''}${goal ? ' · ' : ''}${n(total.kcal)} kcal`
      : `${calorieLeft(goal!, total.kcal)} · ${total.protein} g protein`;
  return (
    <Pressable onPress={() => router.navigate('/(tabs)/food')} accessibilityRole="button" accessibilityLabel={`Food today: ${big} ${of}, ${rest}`} accessibilityHint="Opens Food" style={styles.fill}>
      {({ pressed }) => (
        <HueCard hue="food" style={[styles.twin, pressed && styles.pressed]}>
          <View style={styles.twinHead}>
            <Caps onHero>Food</Caps>
            {!!total?.meals && <Text style={[styles.em, { color: colors.onHero }]}>{count(total.meals, 'meal')}</Text>}
          </View>
          <Ring size={64} stroke={7} progress={share} track={colors.heroTrack} color={colors.onHero}>
            <Text style={[styles.ringText, { color: colors.onHero }]}>{goal ? `${Math.round(share * 100)}%` : '–'}</Text>
          </Ring>
          <Text style={[styles.big, { color: colors.onHero }]} numberOfLines={1}>
            {big}
            {!protein && <Text style={[styles.unit, { color: colors.onHeroSoft }]}> kcal</Text>}
          </Text>
          <Text style={[styles.s, { color: colors.onHeroSoft }]}>
            {of}
            {'\n'}
            <Text style={{ color: colors.onHero }}>{rest}</Text>
          </Text>
        </HueCard>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  twins: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.gap,
  },
  twin: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 0,
  },
  twinHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  em: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  check: {
    width: 26,
    height: 26,
  },
  ringText: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  big: {
    fontFamily: fonts.rounded,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.sm,
  },
  unit: {
    fontSize: 15,
    fontWeight: '700',
  },
  s: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  tight: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  rowTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 1,
  },
  skip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    minHeight: 24,
    justifyContent: 'center',
  },
  planRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRingText: {
    fontFamily: fonts.rounded,
    fontSize: 12,
    fontWeight: '800',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  toastWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  primaryAction: {
    flex: 2,
  },
  secondaryAction: {
    flex: 1,
  },
  hint: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 22,
  },
  firstActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  planText: {
    marginTop: spacing.xs,
    marginBottom: spacing.gap,
  },
});
