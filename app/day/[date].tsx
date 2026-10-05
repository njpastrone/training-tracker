import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore, DeletedWorkouts } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { fonts, radius, spacing } from '../../constants/theme';
import SelectableWorkoutList, { UndoToast } from '../../components/SelectableWorkoutList';
import { SkyScreen, SkyCard, LargeTitle } from '../../components/Sky';
import { HeaderButton, Pill } from '../../components/Glass';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { getWorkoutsByDate } = useWorkoutStore();
  const { colors } = useTheme();
  const [removed, setRemoved] = useState<DeletedWorkouts | null>(null);

  const workouts = getWorkoutsByDate(date);
  const dateObj = parseISO(date);

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

  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  const allMuscleGroups = [...new Set(workouts.flatMap(w => w.muscleGroups))];
  const tiles = [
    { value: workouts.length, label: workouts.length === 1 ? 'Session' : 'Sessions' },
    { value: totalExercises, label: 'Exercises' },
    { value: allMuscleGroups.length, label: 'Muscle groups' },
  ];

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="plus" label="Add workout" onPress={handleQuickAdd} />,
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title={getDateLabel()} subtitle={getRelativeTime()} />

        {workouts.length > 0 ? (
          <>
            <View style={styles.tiles}>
              {tiles.map(tile => (
                <SkyCard key={tile.label} style={styles.tile}>
                  <Text style={[styles.tileValue, { color: colors.text }]}>{tile.value}</Text>
                  <Text variant="labelMedium" style={{ color: colors.textSecondary }}>{tile.label}</Text>
                </SkyCard>
              ))}
            </View>

            <SelectableWorkoutList label="Workouts" workouts={workouts} groupByDate={false} enableSwipe onDeleted={setRemoved} />
          </>
        ) : (
          <SkyCard style={styles.empty}>
            <Text variant="titleLarge" style={[styles.center, { color: colors.text }]}>
              No workouts on this day
            </Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              {isToday(dateObj) ? "Ready to log today's workout?" : 'Add a workout for this day'}
            </Text>
            <Pill icon="plus" label="Add workout" onPress={handleQuickAdd} style={styles.emptyButton} />
          </SkyCard>
        )}
      </ScrollView>
      <UndoToast removed={removed} onClose={() => setRemoved(null)} />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  tile: {
    flex: 1,
    marginBottom: 0,
    borderRadius: radius.tile,
    paddingHorizontal: spacing.gap,
    paddingVertical: spacing.gap,
  },
  tileValue: {
    fontFamily: fonts.rounded,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
