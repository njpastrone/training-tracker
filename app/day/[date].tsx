import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, FAB, Appbar, IconButton, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { spacing } from '../../constants/theme';
import WorkoutList from '../../components/WorkoutList';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { getWorkoutsByDate, addWorkout } = useWorkoutStore();
  const { colors } = useTheme();
  
  const workouts = getWorkoutsByDate(date);
  const dateObj = parseISO(date);
  
  const getDateLabel = () => {
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'EEEE, MMMM d');
  };
  
  const getRelativeTime = () => {
    if (isToday(dateObj) || isYesterday(dateObj)) return null;
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={getDateLabel()} />
        <Appbar.Action icon="plus" onPress={handleQuickAdd} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {getRelativeTime() && (
            <Text variant="bodySmall" style={[styles.relativeTime, { color: colors.textSecondary }]}>
              {getRelativeTime()}
            </Text>
          )}

          {workouts.length > 0 ? (
            <>
              {/* Day Summary */}
              <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={[styles.summaryNumber, { color: colors.primary }]}>
                      {workouts.length}
                    </Text>
                    <Text variant="bodySmall" style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {workouts.length === 1 ? 'Session' : 'Sessions'}
                    </Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={[styles.summaryNumber, { color: colors.primary }]}>
                      {totalExercises}
                    </Text>
                    <Text variant="bodySmall" style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      Exercises
                    </Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={[styles.summaryNumber, { color: colors.primary }]}>
                      {allMuscleGroups.length}
                    </Text>
                    <Text variant="bodySmall" style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      Muscle Groups
                    </Text>
                  </View>
                </View>
              </Surface>

              {/* Workouts */}
              <View style={styles.workoutsSection}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                  Workouts
                </Text>
                <WorkoutList workouts={workouts} groupByDate={false} />
              </View>
            </>
          ) : (
            <Surface style={[styles.emptyState, { backgroundColor: colors.surface }]} elevation={0}>
              <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.text }]}>
                No workouts on this day
              </Text>
              <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.textSecondary }]}>
                {isToday(dateObj) 
                  ? "Ready to log today's workout?"
                  : "Add a workout for this day"}
              </Text>
              <Button 
                mode="contained" 
                onPress={handleQuickAdd}
                style={styles.addButton}
                icon="plus"
              >
                Add Workout
              </Button>
            </Surface>
          )}
        </View>
      </ScrollView>

      {workouts.length > 0 && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleQuickAdd}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  relativeTime: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontWeight: '700',
  },
  summaryLabel: {
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  workoutsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl * 2,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    marginTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});