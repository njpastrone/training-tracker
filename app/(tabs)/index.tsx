import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { format } from 'date-fns';
import { SkyCard, LargeTitle } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen, logBar } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import ParsedCard from '../../components/ParsedCard';
import FoodCard from '../../components/FoodCard';
import TodayTiles, { RecentDays, UpNext } from '../../components/TodayTiles';
import { UndoToast } from '../../components/SelectableWorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useLogDraft } from '../../hooks/useLogDraft';
import { spacing } from '../../constants/theme';
import { templateService } from '../../services/templates';
import { logChips } from '../../services/suggestions';
import { foodByDay } from '../../services/progress';
import { ParsedWorkoutResponse } from '../../types/workout';
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
  const { colors } = useTheme();
  const router = useRouter();
  const [logged, setLogged] = useState<string | null>(null); // toast after saving
  const [example, setExample] = useState<ParsedWorkoutResponse | null>(null);
  const [notNow, setNotNow] = useState(false);

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  // Get today's scheduled workout
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;
  // Chat bar chips: today's plan, your usual meal and your last different workouts to log again, or examples while you're new
  const foodEntries = useWorkoutStore(s => s.foodEntries);
  const chips = useMemo(() => logChips(workouts, scheduledTemplate, new Date(), foodEntries), [workouts, scheduledTemplate, foodEntries]);

  const upcoming = schedule.filter(s => s.date >= today && !s.completed && !s.skipped).sort((a, b) => a.date.localeCompare(b.date));
  const hasUpcoming = upcoming.length > 0;
  const next = upcoming.find(s => s.date > today); // Up next: the first planned day after today

  // Tiles: Training for anyone who lifts or has a plan, Food for anyone who logs food or set a food goal
  const food = useMemo(() => foodByDay(foodEntries), [foodEntries]);
  const foodGoal = settings.goals?.food;
  const todays = workouts.filter(w => w.date === today);
  const lifts = workouts.length > 0 || hasUpcoming;
  const eats = foodEntries.length > 0 || !!foodGoal;

  // Nothing logged yet: the first-run hint stands in for the tiles. After the first log the planner
  // is offered for the rest of the week.
  const firstRun = workouts.length === 0 && foodEntries.length === 0;
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
            await markWorkoutSkipped(todaysSchedule.date, 'User skipped'); // the Start / Skip row going away confirms it
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

      {firstRun && !todaysSchedule ? (
        !reviewing && (
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
        )
      ) : (
        // The rest of the page hides while a parsed card is open (DESIGN-SYSTEM.md, ChatBar)
        !reviewing && <TodayTiles
          today={today}
          training={lifts ? { todays, planned: todays.length ? undefined : scheduledTemplate ?? undefined, last: workouts.find(w => w.date < today) } : undefined}
          food={eats ? { goal: foodGoal, day: food.get(today) } : undefined}
        />
      )}

      {/* Today's planned workout, not logged yet: start it in the composer or skip it */}
      {!reviewing && todaysSchedule && scheduledTemplate && todays.length === 0 && (
        <View style={styles.planRow}>
          <Pill size="small" icon="play.fill" label="Start workout" onPress={handleStartScheduledWorkout} style={styles.primaryAction} />
          <Pill size="small" variant="glass" label="Skip" onPress={handleSkipScheduledWorkout} style={styles.secondaryAction} />
        </View>
      )}

      {logged && (
        <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut} style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: colors.glass, borderColor: colors.glassLine }]} accessibilityLiveRegion="polite">
            <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
            <Text variant="titleSmall" style={{ color: colors.text }}>{logged}</Text>
          </View>
        </Animated.View>
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

      {!reviewing && lifts && next && <UpNext date={next.date} today={today} template={getTemplate(next.templateId)} />}

      {!reviewing && <RecentDays workouts={workouts} food={food} goal={foodGoal} today={today} />}
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

const styles = StyleSheet.create({
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
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
});
