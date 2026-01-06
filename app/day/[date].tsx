import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, FAB, Appbar, IconButton, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { colors, spacing } from '../../constants/theme';
import WorkoutList from '../../components/WorkoutList';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { getWorkoutsByDate, addWorkout } = useWorkoutStore();
  
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
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={getDateLabel()} />
        <Appbar.Action icon="plus" onPress={handleQuickAdd} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {getRelativeTime() && (
            <Text variant="bodySmall" style={styles.relativeTime}>
              {getRelativeTime()}
            </Text>
          )}

          {workouts.length > 0 ? (
            <>
              {/* Day Summary */}
              <Surface style={styles.summaryCard} elevation={1}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={styles.summaryNumber}>
                      {workouts.length}
                    </Text>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      {workouts.length === 1 ? 'Session' : 'Sessions'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={styles.summaryNumber}>
                      {totalExercises}
                    </Text>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      Exercises
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text variant="headlineSmall" style={styles.summaryNumber}>
                      {allMuscleGroups.length}
                    </Text>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      Muscle Groups
                    </Text>
                  </View>
                </View>
              </Surface>

              {/* Workouts */}
              <View style={styles.workoutsSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Workouts
                </Text>
                <WorkoutList workouts={workouts} groupByDate={false} />
              </View>
            </>
          ) : (
            <Surface style={styles.emptyState} elevation={0}>
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                No workouts on this day
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
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
          style={styles.fab}
          onPress={handleQuickAdd}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  relativeTime: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
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
    color: colors.primary,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  workoutsSection: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl * 2,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
  },
});