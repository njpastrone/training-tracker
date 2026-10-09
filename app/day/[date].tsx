import { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, AlertButton } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { spacing } from '../../constants/theme';
import { UndoToast } from '../../components/SelectableWorkoutList';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import FoodDay from '../../components/FoodDay';
import DayTraining from '../../components/DayTraining';
import { dayLabel } from '../../components/WorkoutCard';
import { HeaderButton, Pill } from '../../components/Glass';
import { deletePlan } from '../../services/planner';
import { workoutName } from '../../services/format';
import { sumMacros } from '../../services/foods';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { getWorkoutsByDate, schedule, getTemplate, loadSchedule, loadTemplates, cancelScheduledWorkout, deleteRecurringSeries } = useWorkoutStore();
  const allFood = useWorkoutStore(s => s.foodEntries);
  const goal = useWorkoutStore(s => s.settings.goals?.food);
  const food = useMemo(() => allFood.filter(e => e.date === date), [allFood, date]);
  const { colors } = useTheme();

  const workouts = getWorkoutsByDate(date);
  const dateObj = parseISO(date);
  const future = isFuture(dateObj) && !isToday(dateObj);
  const planned = schedule.find(s => s.date === date && !s.completed && !s.skipped);
  const plannedTemplate = planned ? getTemplate(planned.templateId) : undefined;
  const empty = !workouts.length && !food.length && !planned;

  // "Push · 88 g protein · 1,124 kcal", each part only when there is one
  const t = food.length ? sumMacros(food.flatMap(e => e.items)) : undefined;
  const summary = [
    workouts.length && workoutName([...new Set(workouts.flatMap(w => w.muscleGroups))]),
    t && `${t.protein} g protein`,
    t && `${t.kcal.toLocaleString('en-US')} kcal`,
  ].filter(Boolean).join(' · ') || 'Nothing logged';

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);

  const handleQuickAdd = () => {
    // Navigate to the input screen with pre-filled date
    router.push({
      pathname: '/quick-add',
      params: { date }
    });
  };

  // Plan a day in History's chat bar
  const planThisDay = () =>
    router.navigate({ pathname: '/(tabs)/history', params: { request: `A workout on ${format(dateObj, 'EEEE, MMMM d')}` } });

  const removePlanned = () => {
    if (!planned) return;
    const run = (action: () => Promise<unknown>) => () =>
      action().catch(() => Alert.alert('Error', "Couldn't change the plan. Try again."));
    const buttons: AlertButton[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove this day', style: 'destructive', onPress: run(() => cancelScheduledWorkout(date)) },
    ];
    if (planned.planId) {
      const id = planned.planId;
      buttons.push({
        text: 'Delete the whole plan',
        style: 'destructive',
        onPress: run(async () => {
          await deletePlan(id);
          await Promise.all([loadSchedule(), loadTemplates()]);
        }),
      });
    } else if (planned.isRecurring && planned.recurringPattern) {
      const { templateId, recurringPattern, recurringDays } = planned;
      buttons.push({ text: 'Remove every repeat', style: 'destructive', onPress: run(() => deleteRecurringSeries(templateId, recurringPattern, recurringDays)) });
    }
    Alert.alert('Remove the planned workout?', 'Logged workouts stay.', buttons);
  };

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: future ? undefined : () => <HeaderButton icon="plus" label="Add workout or food" onPress={handleQuickAdd} />,
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title={dayLabel(date)} subtitle={summary} />

        {planned && (
          <SkyCard>
            <SectionLabel>Planned</SectionLabel>
            <Text variant="titleMedium" style={[styles.plannedName, { color: colors.text }]}>
              {plannedTemplate?.name ?? 'Workout'}
            </Text>
            {!!plannedTemplate?.exercises.length && (
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                {plannedTemplate.exercises.map(e => e.name).join(', ')}
              </Text>
            )}
            {planned.note && (
              <Text variant="bodyMedium" style={[styles.note, { color: colors.text }]}>{planned.note}</Text>
            )}
            <View style={styles.actions}>
              {isToday(dateObj) && (
                // Start lives on the Log tab, which shows today's planned workout
                <Pill icon="play.fill" label="Start on Log" onPress={() => router.navigate('/(tabs)')} />
              )}
              <Pill variant="glass" label="Remove" onPress={removePlanned} />
            </View>
          </SkyCard>
        )}

        <DayTraining workouts={workouts} />
        <FoodDay entries={food} goal={goal} />

        {empty && (
          <SkyCard style={styles.empty}>
            {/* Ahead there's nothing to log yet (and no +), only a plan to make */}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{future ? 'Nothing planned' : 'Nothing logged this day'}</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              {future ? 'Plan a workout and it shows up on your calendar.' : 'Tap + to add a workout or food.'}
            </Text>
            {(future || isToday(dateObj)) && <Pill icon="logo" label="Plan this day" onPress={planThisDay} style={styles.emptyButton} />}
          </SkyCard>
        )}
      </ScrollView>
      <UndoToast />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  plannedName: {
    marginTop: spacing.xs,
  },
  note: {
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 22,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
