import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, AlertButton } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { format, parseISO, isToday, isYesterday, isFuture, formatDistanceToNow } from 'date-fns';
import { spacing } from '../../constants/theme';
import SelectableWorkoutList, { UndoToast } from '../../components/SelectableWorkoutList';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import FoodDay from '../../components/FoodDay';
import { HeaderButton, Pill } from '../../components/Glass';
import { deletePlan } from '../../services/planner';
import { emptyDay } from '../../services/format';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { getWorkoutsByDate, schedule, getTemplate, loadSchedule, loadTemplates, cancelScheduledWorkout, deleteRecurringSeries } = useWorkoutStore();
  const ate = useWorkoutStore(s => s.foodEntries.some(e => e.date === date));
  const { colors } = useTheme();

  const workouts = getWorkoutsByDate(date);
  const dateObj = parseISO(date);
  const future = isFuture(dateObj) && !isToday(dateObj);
  const planned = schedule.find(s => s.date === date && !s.completed && !s.skipped);
  const plannedTemplate = planned ? getTemplate(planned.templateId) : undefined;
  const empty = emptyDay(date, format(new Date(), 'yyyy-MM-dd'), workouts.length > 0 || ate, !!planned);

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);

  const getDateLabel = () => {
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'EEEE, MMMM d');
  };

  const getRelativeTime = () => {
    if (isToday(dateObj) || isYesterday(dateObj)) return undefined;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

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
        <LargeTitle title={getDateLabel()} subtitle={getRelativeTime()} />

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

        {workouts.length > 0 ? (
          <SelectableWorkoutList label="Training" workouts={workouts} groupByDate={false} enableSwipe />
        ) : empty && (
          <SkyCard style={styles.empty}>
            <Text variant="titleLarge" style={[styles.center, { color: colors.text }]}>{empty.title}</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              {empty.plan ? 'Plan a workout and it shows up on your calendar.' : 'Add a workout or food for this day'}
            </Text>
            {empty.plan && <Pill icon="logo" label="Plan this day" onPress={planThisDay} style={styles.emptyButton} />}
            {empty.log && (
              <Pill variant={empty.plan ? 'glass' : undefined} icon="plus" label="Add workout or food" onPress={handleQuickAdd} style={styles.emptyButton} />
            )}
          </SkyCard>
        )}

        <FoodDay date={date} />
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
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
