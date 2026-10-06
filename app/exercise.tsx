import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill } from '../components/Glass';
import WorkoutList from '../components/WorkoutList';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { digest, target } from '../services/insights';
import { resolveId } from '../services/exerciseIdentity';
import { daysAgo, lastDoneLine } from '../services/format';
import { formatSets, goalProgress, muscleName } from '../services/goals';
import { spacing } from '../constants/theme';
import type { MuscleGroup } from '../types/workout';

// One exercise (id) or muscle group (group) from Progress: add a session you forgot, or see every
// time you did it. Each workout opens its own screen, with the fix box, edit and delete.
export default function ExerciseScreen() {
  const { id, group } = useLocalSearchParams<{ id?: string; group?: MuscleGroup }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { workouts, exerciseLibrary, settings } = useWorkoutStore();
  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);

  const exercise = id ? d.exercises.find(e => e.id === id) : undefined;
  const trend = id ? d.liftTrends.find(t => t.id === id) : undefined;
  const next = trend && target(trend);
  const goal = useMemo(
    () => (group && settings.goals ? goalProgress(settings.goals, workouts, exerciseLibrary).muscles.find(m => m.group === group) : undefined),
    [group, settings.goals, workouts, exerciseLibrary]
  );
  const times = workouts.filter(w =>
    group
      ? w.muscleGroups.includes(group)
      : w.exercises.some(e => (e.exerciseId ? resolveId(e.exerciseId, exerciseLibrary) : e.name) === id)
  ).filter(w => w.date <= d.today);
  const last = times[0]?.date; // the store keeps workouts newest first

  const title = exercise?.name ?? (group ? muscleName(group) : '');
  const subtitle = exercise ? lastDoneLine(exercise) : group && d.daysSinceGroupTrained[group] !== undefined ? `last trained ${daysAgo(d.daysSinceGroupTrained[group]!)}` : undefined;

  // A forgotten session most likely came after the last one you logged
  const today = parseISO(d.today);
  const [day, setDay] = useState(() => (last && last < d.today ? addDays(parseISO(last), 1) : today));
  const [picking, setPicking] = useState(false);
  const addPast = () => router.push({ pathname: '/quick-add', params: { date: format(day, 'yyyy-MM-dd') } });

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title={title} subtitle={subtitle} />

        {next && (
          <SkyCard>
            <SectionLabel>Next time</SectionLabel>
            <Text variant="titleMedium" style={[styles.next, { color: colors.text }]}>{next.next}</Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              Last {next.last}. {next.why}
            </Text>
          </SkyCard>
        )}

        {goal && (
          <SkyCard>
            <SectionLabel>Your goals · last 7 days</SectionLabel>
            {goal.timesGoal !== undefined && (
              <Text variant="bodyLarge" style={[styles.goalLine, { color: colors.text }]}>Trained {goal.times} of {goal.timesGoal} times</Text>
            )}
            {goal.setsGoal !== undefined && (
              <Text variant="bodyLarge" style={[styles.goalLine, { color: colors.text }]}>
                {formatSets(goal.sets, goal.setsMissing)} of {goal.setsGoal} sets
              </Text>
            )}
            {goal.setsGoal !== undefined && goal.setsMissing && (
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Some exercises had no set count, so only written sets count.</Text>
            )}
          </SkyCard>
        )}

        <SkyCard>
          <SectionLabel>Forgot one?</SectionLabel>
          <View style={styles.dayRow}>
            <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>Add a session on</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={day}
                mode="date"
                display="compact"
                maximumDate={today}
                onChange={(_, picked) => picked && setDay(picked)}
                accentColor={colors.sunrise}
                accessibilityLabel="Day of the session"
              />
            ) : (
              <>
                <Pill variant="glass" size="small" label={format(day, 'EEE, MMM d')} onPress={() => setPicking(true)} />
                {picking && (
                  <DateTimePicker
                    value={day}
                    mode="date"
                    maximumDate={today}
                    onChange={(_, picked) => {
                      setPicking(false);
                      if (picked) setDay(picked);
                    }}
                  />
                )}
              </>
            )}
          </View>
          <Pill icon="plus" label="Add a past session" onPress={addPast} />
        </SkyCard>

        {times.length > 0 && (
          <>
            <SectionLabel style={styles.label}>Every time · {times.length}</SectionLabel>
            {/* ponytail: renders every workout; window it if one exercise reaches the hundreds */}
            <WorkoutList workouts={times} groupByDate={false} />
          </>
        )}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  next: {
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  goalLine: {
    marginTop: spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.gap,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
});
