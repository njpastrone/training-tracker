import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { format } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Composer, Pill } from '../../components/Glass';
import { UserBubble } from '../../components/Chat';
import ParsedCard from '../../components/ParsedCard';
import Ring from '../../components/Ring';
import WorkoutList from '../../components/WorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useLogDraft } from '../../hooks/useLogDraft';
import { fonts, muscleGroupColors, spacing } from '../../constants/theme';
import { templateService } from '../../services/templates';
import { getPlans } from '../../services/planner';
import { TrainingPlan } from '../../types/plan';
import LogoMark from '../../components/LogoMark';

// Detail is optional: names alone are a complete log, numbers are welcome
const EXAMPLES = ['chest and back today: bench, rows, pull-ups', 'legs: squats, RDLs, lunges, felt strong', 'ran 3 miles then some core', 'squats 5x5 at 225, then lunges'];

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
  } = useWorkoutStore();
  const { colors, sky } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [logged, setLogged] = useState<string | null>(null); // toast after saving

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  // Get 5 most recent workouts
  const recentWorkouts = workouts.slice(0, 5);

  // Get today's scheduled workout
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;

  // "Re-entry week · 1 of 4" when today's session comes from a plan
  const todaysPlan = plans.find(p => p.id === todaysSchedule?.planId);
  const planSessions = todaysPlan ? schedule.filter(s => s.planId === todaysPlan.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const hasUpcoming = schedule.some(s => s.date >= today && !s.completed && !s.skipped);

  const log = useLogDraft({
    date: today,
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
      Alert.alert('Error', 'No scheduled template found');
      return;
    }
    try {
      log.startFromTemplate(templateService.templateToWorkout(scheduledTemplate), scheduledTemplate.id);
    } catch (error) {
      console.error('Error in handleStartScheduledWorkout:', error);
      Alert.alert('Error', 'Failed to start scheduled workout');
    }
  };

  const handleSkipScheduledWorkout = () => {
    if (!todaysSchedule) return;
    Alert.alert('Skip Workout', "Are you sure you want to skip today's scheduled workout?", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          try {
            await markWorkoutSkipped(todaysSchedule.date, 'User skipped');
            Alert.alert('Workout Skipped', "Don't worry, you can reschedule it anytime!");
          } catch (error) {
            Alert.alert('Error', 'Failed to skip workout.');
          }
        },
      },
    ]);
  };

  const reviewing = !!log.sent || !!log.draft;

  return (
    // The composer sits above the tab bar, so pad the bottom edge too
    <SkyScreen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => reviewing && scrollRef.current?.scrollToEnd({ animated: true })}
        >
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

          {!reviewing && !todaysSchedule && (
            <SkyCard style={styles.hint}>
              <SymbolView name="bubble.left.and.text.bubble.right" size={30} tintColor={colors.sunrise} />
              <Text variant="titleMedium" style={{ color: colors.text }}>Just say what you did</Text>
              <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                Type or dictate it. The exercises are enough; add numbers only if you want.
              </Text>
              <View style={styles.examples}>
                {EXAMPLES.map(example => (
                  <Text key={example} variant="bodyMedium" style={[styles.center, { color: colors.textTertiary }]}>“{example}”</Text>
                ))}
              </View>
            </SkyCard>
          )}

          {!reviewing && !hasUpcoming && (
            <SkyCard>
              <Text variant="titleMedium" style={{ color: colors.text }}>Plan your week</Text>
              <Text variant="bodyMedium" style={[styles.planText, { color: colors.textSecondary }]}>
                Tell the coach what you want and it puts the workouts on your calendar.
              </Text>
              <Pill icon="logo" label="Plan it for me" onPress={() => router.push('/plan')} />
            </SkyCard>
          )}

          {log.sent && (
            <Animated.View entering={FadeInDown.springify().damping(17)}>
              <UserBubble text={log.sent} />
            </Animated.View>
          )}

          {log.busy === 'parse' && <ReadingCard />}

          {log.draft && (
            <ParsedCard
              draft={log.draft}
              date={today}
              title={log.templateId ? scheduledTemplate?.name : undefined}
              onChange={log.setDraft}
              onSave={log.save}
              onDiscard={log.discard}
              onFix={log.fix}
              busy={log.busy}
              error={log.error}
              reply={log.reply}
            />
          )}

          {!reviewing && (
            <View style={styles.recent}>
              <SectionLabel style={styles.label}>Recent</SectionLabel>
              {recentWorkouts.length > 0 ? (
                <WorkoutList workouts={recentWorkouts} enableSwipe={true} />
              ) : (
                <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                  No workouts yet. Tell me your first one below.
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          {log.error && !log.draft && (
            <Animated.Text entering={FadeIn} style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
              {log.error}
            </Animated.Text>
          )}
          <Composer
            value={log.text}
            onChangeText={log.setText}
            onSend={log.parse}
            placeholder="What'd you do today?"
            busy={log.busy === 'parse'}
          />
        </View>
      </KeyboardAvoidingView>
    </SkyScreen>
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
          <Text variant="titleMedium" style={{ color: colors.text }}>Reading your workout…</Text>
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
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
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
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  error: {
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 6,
  },
});
