import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { format } from 'date-fns';
import { SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen, logBar } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import ParsedCard from '../../components/ParsedCard';
import FoodCard from '../../components/FoodCard';
import FoodDay from '../../components/FoodDay';
import Ring from '../../components/Ring';
import WorkoutList from '../../components/WorkoutList';
import { UndoToast } from '../../components/SelectableWorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useLogDraft } from '../../hooks/useLogDraft';
import { fonts, muscleGroupColors, spacing } from '../../constants/theme';
import { templateService } from '../../services/templates';
import { getPlans } from '../../services/planner';
import { logChips } from '../../services/suggestions';
import { TrainingPlan } from '../../types/plan';
import { ParsedWorkoutResponse } from '../../types/workout';
import LogoMark from '../../components/LogoMark';

// Detail is optional: names alone are a complete log, numbers are welcome. Food goes in the same box.
const EXAMPLES = ['chest and back today: bench, rows, pull-ups', 'legs: squats, RDLs, lunges, felt strong', 'ran 3 miles then some core', 'squats 5x5 at 225, then 2 eggs and toast', 'chicken, rice and broccoli for lunch'];

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

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

export default function LogScreen() {
  const {
    workouts,
    schedule,
    getTodaysScheduledWorkout,
    getTemplate,
    markWorkoutSkipped,
    markWorkoutCompleted,
    loadSchedule,
    loadTemplates,
    settings,
  } = useWorkoutStore();
  const { colors, sky } = useTheme();
  const router = useRouter();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [logged, setLogged] = useState<string | null>(null); // toast after saving
  const [example, setExample] = useState<ParsedWorkoutResponse | null>(null);
  const [notNow, setNotNow] = useState(false);
  const [howTo, setHowTo] = useState(false);

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  // Get 5 most recent workouts
  const recentWorkouts = workouts.slice(0, 5);

  // Get today's scheduled workout
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;
  // Chat bar chips: today's plan, your usual meal and your last different workouts to log again, or examples while you're new
  const foodEntries = useWorkoutStore(s => s.foodEntries);
  const chips = useMemo(() => logChips(workouts, scheduledTemplate, new Date(), foodEntries), [workouts, scheduledTemplate, foodEntries]);

  // "Re-entry week · 1 of 4" when today's session comes from a plan
  const todaysPlan = plans.find(p => p.id === todaysSchedule?.planId);
  const planSessions = todaysPlan ? schedule.filter(s => s.planId === todaysPlan.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const hasUpcoming = schedule.some(s => s.date >= today && !s.completed && !s.skipped);

  // Just finished setup: the first log happens here, then the planner is offered for the rest of the week
  const firstRun = !!settings.onboardedAt && workouts.length === 0 && foodEntries.length === 0;
  const justStarted = !!settings.onboardedAt && workouts.length === 1 && workouts[0].date === today;
  const weeklyTarget = settings.weeklyTarget ?? 3;
  // Planning happens in History's chat bar
  const planRest = () =>
    router.navigate({ pathname: '/(tabs)/history', params: { request: `The rest of this week, ${weeklyTarget} days a week.` } });

  const log = useLogDraft({
    date: today,
    withFood: true,
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
    getPlans().then(setPlans);
  }, [schedule]);

  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setLogged(null), 2500);
    return () => clearTimeout(timer);
  }, [logged]);

  const handleStartScheduledWorkout = () => {
    if (!scheduledTemplate) {
      Alert.alert("Couldn't find today's template", 'Try planning the day again.');
      return;
    }
    try {
      log.startFromTemplate(templateService.templateToWorkout(scheduledTemplate), scheduledTemplate.id);
    } catch (error) {
      console.error('Error in handleStartScheduledWorkout:', error);
      Alert.alert("Couldn't start the workout", 'Try again.');
    }
  };

  const handleSkipScheduledWorkout = () => {
    if (!todaysSchedule) return;
    Alert.alert("Skip today's workout?", 'You can plan it again anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          try {
            await markWorkoutSkipped(todaysSchedule.date, 'User skipped'); // the Today card going away confirms it
          } catch (error) {
            Alert.alert("Couldn't skip the workout", 'Try again.');
          }
        },
      },
    ]);
  };

  const reviewing = !!log.sent || !!log.draft || !!log.food || !!example;

  return (
    <ChatScreen bar={logBar(log, "What'd you do or eat today?", chips, () => setExample(null))} follow={reviewing} overlay={<UndoToast />}>
      <LargeTitle title={greeting(now.getHours())} subtitle={format(now, 'EEEE, MMMM d')} />

      {logged && (
        <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut} style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: colors.glass, borderColor: colors.glassLine }]} accessibilityLiveRegion="polite">
            <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
            <Text variant="titleSmall" style={{ color: colors.text }}>{logged}</Text>
          </View>
        </Animated.View>
      )}

      {!reviewing && todaysSchedule && scheduledTemplate && (
        <SkyCard style={styles.today}>
          <View style={styles.todayTop}>
            <SectionLabel>Today</SectionLabel>
            {todaysPlan ? (
              <Tag icon="calendar" color={colors.cobalt}>
                {`${todaysPlan.name} · ${planSessions.findIndex(s => s.id === todaysSchedule.id) + 1} of ${planSessions.length}`}
              </Tag>
            ) : todaysSchedule.isRecurring && todaysSchedule.recurringPattern ? (
              <Tag icon="repeat" color={colors.cobalt}>{todaysSchedule.recurringPattern}</Tag>
            ) : null}
          </View>
          <View style={styles.todayMain}>
            <View style={styles.fill}>
              <Text style={[styles.todayName, { color: colors.text }]}>{scheduledTemplate.name}</Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                {scheduledTemplate.exercises.length} exercises
              </Text>
            </View>
            <Ring size={74} stroke={6} progress={sky.progress}>
              <Text style={[styles.ringValue, { color: colors.text }]}>{sky.done}/{sky.target}</Text>
              <Text style={[styles.ringLabel, { color: colors.textTertiary }]}>7 days</Text>
            </Ring>
          </View>
          <View style={styles.muscles}>
            {scheduledTemplate.muscleGroups.map(group => (
              <Tag key={group} dot={muscleGroupColors[group]} color={colors.textSecondary}>
                {group.replace('_', ' ')}
              </Tag>
            ))}
          </View>
          {todaysSchedule.note && (
            <View style={[styles.note, { backgroundColor: colors.sunrise + '17' }]}>
              <LogoMark size={16} color={colors.sunrise} />
              <Text variant="bodyMedium" style={[styles.fill, { color: colors.text }]}>{todaysSchedule.note}</Text>
            </View>
          )}
          <View style={styles.actions}>
            <Pill icon="play.fill" label="Start workout" onPress={handleStartScheduledWorkout} style={styles.primaryAction} />
            <Pill variant="glass" label="Skip" onPress={handleSkipScheduledWorkout} style={styles.secondaryAction} />
          </View>
        </SkyCard>
      )}

      {!reviewing && !todaysSchedule && firstRun && (
        <SkyCard style={styles.hint}>
          <LogoMark size={30} color={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>Log a workout, food, or both</Text>
          <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
            Just say what you did or ate, like “chest and back today: bench, rows, pull-ups, then chicken and rice”. Sets, weights and amounts are optional. Or use the mic on the keyboard.
          </Text>
          <View style={styles.firstActions}>
            <Pill variant="glass" size="small" label="Show me an example" onPress={() => setExample(exampleDraft(settings.weightUnit === 'kg'))} />
            <Pill variant="glass" size="small" label="I haven't trained yet" onPress={planRest} />
          </View>
        </SkyCard>
      )}

      {/* After the first log the how-to folds away so Recent fits on a small phone */}
      {!reviewing && !todaysSchedule && !firstRun && (
        <SkyCard style={styles.howTo}>
          <Pressable
            onPress={() => setHowTo(!howTo)}
            accessibilityRole="button"
            accessibilityState={{ expanded: howTo }}
            style={styles.howToHeader}
          >
            <LogoMark size={20} color={colors.sunrise} />
            <Text variant="titleSmall" style={[styles.fill, { color: colors.text }]}>How to use this</Text>
            <SymbolView name={howTo ? 'chevron.up' : 'chevron.down'} size={13} weight="semibold" tintColor={colors.textTertiary} />
          </Pressable>
          {howTo && (
            <View style={styles.examples}>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                Just say what you did or ate. Type or dictate it. Names are enough; add numbers only if you want.
              </Text>
              {EXAMPLES.map(example => (
                <Text key={example} variant="bodyMedium" style={{ color: colors.textTertiary }}>“{example}”</Text>
              ))}
            </View>
          )}
        </SkyCard>
      )}

      {!reviewing && !hasUpcoming && justStarted && !notNow && (
        <SkyCard>
          <Text variant="titleMedium" style={{ color: colors.text }}>Want to plan the rest of your week?</Text>
          <Text variant="bodyMedium" style={[styles.planText, { color: colors.textSecondary }]}>
            You're aiming for {weeklyTarget} days a week. I'll fit the rest around what you just did.
          </Text>
          <View style={styles.actions}>
            <Pill icon="logo" label="Plan my week" onPress={planRest} style={styles.primaryAction} />
            <Pill variant="glass" label="Not now" onPress={() => setNotNow(true)} style={styles.secondaryAction} />
          </View>
        </SkyCard>
      )}

      {!reviewing && !hasUpcoming && !(justStarted && !notNow) && (
        <SkyCard>
          <Text variant="titleMedium" style={{ color: colors.text }}>Plan your week</Text>
          <Text variant="bodyMedium" style={[styles.planText, { color: colors.textSecondary }]}>
            Tell the coach what you want and it puts the workouts on your calendar.
          </Text>
          <Pill icon="logo" label="Plan it for me" onPress={() => router.navigate('/(tabs)/history')} />
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

      {log.busy === 'parse' && <ReadingCard />}

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

      {!reviewing && <FoodDay date={today} label="Food today" />}

      {!reviewing && (recentWorkouts.length > 0 || foodEntries.length === 0) && (
        <View style={styles.recent}>
          <SectionLabel style={styles.label}>Recent</SectionLabel>
          {recentWorkouts.length > 0 ? (
            <WorkoutList workouts={recentWorkouts} enableSwipe={true} />
          ) : (
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              No workouts yet. Tell me what you did or ate below.
            </Text>
          )}
        </View>
      )}
    </ChatScreen>
  );
}

// Shown while the AI reads the log
function ReadingCard() {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut}>
      <SkyCard>
        <View style={styles.readingTop}>
          <LogoMark size={18} color={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>Reading it…</Text>
        </View>
        {[0.88, 0.72, 0.8].map(w => (
          <View key={w} style={[styles.skeleton, { width: `${w * 100}%`, backgroundColor: colors.dim }]} />
        ))}
      </SkyCard>
    </Animated.View>
  );
}

function Tag({ children, color, icon, dot }: { children: React.ReactNode; color: string; icon?: 'calendar' | 'repeat'; dot?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: icon ? color + '1A' : colors.dim }]}>
      {icon && <SymbolView name={icon} size={12} tintColor={color} />}
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text variant="labelMedium" style={[styles.tagText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
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
  today: {
    paddingVertical: 18,
  },
  todayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  todayName: {
    fontFamily: fonts.rounded,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  ringValue: {
    fontFamily: fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontFamily: fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  muscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: spacing.gap,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tagText: {
    textTransform: 'capitalize',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: spacing.gap,
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
  howTo: {
    paddingVertical: spacing.gap,
  },
  howToHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
  firstActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  examples: {
    gap: 2,
    marginTop: spacing.sm,
  },
  planText: {
    marginTop: spacing.xs,
    marginBottom: spacing.gap,
  },
  readingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  skeleton: {
    height: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  recent: {
    marginTop: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
});
