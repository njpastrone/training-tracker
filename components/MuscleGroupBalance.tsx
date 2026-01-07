import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MuscleGroup, Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, muscleGroupColors } from '../constants/theme';
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';

interface Props {
  workouts: Workout[];
  selectedWeek: Date;
}

export default function MuscleGroupBalance({ workouts, selectedWeek }: Props) {
  const { colors } = useTheme();
  // Filter workouts for the selected week
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  
  const weekWorkouts = workouts.filter(workout => {
    const workoutDate = parseISO(workout.date);
    return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
  });

  if (weekWorkouts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.textSecondary }]}>
          No workouts this week - time to hit the gym!
        </Text>
      </View>
    );
  }

  // Calculate muscle groups for this week
  const workoutsByMuscleGroup = weekWorkouts.reduce((acc, workout) => {
    workout.muscleGroups.forEach((group) => {
      acc[group] = (acc[group] || 0) + 1;
    });
    return acc;
  }, {} as Record<MuscleGroup, number>);

  // Get muscle groups with workouts and sort by frequency
  const muscleGroupsWithWorkouts = Object.entries(workoutsByMuscleGroup)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a) // Sort by count descending
    .slice(0, 6); // Show top 6 for weekly view

  const maxCount = Math.max(...muscleGroupsWithWorkouts.map(([_, count]) => count));

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.text }]}>
        Muscle Group Balance
      </Text>
      
      {muscleGroupsWithWorkouts.map(([group, count]) => {
        const percentage = maxCount > 0 ? count / maxCount : 0;
        const muscleGroup = group as MuscleGroup;
        
        return (
          <View key={group} style={styles.muscleGroupRow}>
            <View style={styles.muscleGroupInfo}>
              <Text variant="bodyMedium" style={[styles.muscleGroupName, { color: colors.text }]}>
                {group.replace('_', ' ')}
              </Text>
              <Text variant="bodySmall" style={[styles.muscleGroupCount, { color: colors.textSecondary }]}>
                {count} workout{count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={percentage}
                color={muscleGroupColors[muscleGroup]}
                style={[styles.progressBar, { backgroundColor: colors.border }]}
              />
            </View>
          </View>
        );
      })}
      
      {Object.keys(workoutsByMuscleGroup).length > 6 && (
        <Text variant="bodySmall" style={[styles.moreText, { color: colors.textSecondary }]}>
          Showing top 6 muscle groups
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  muscleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  muscleGroupInfo: {
    minWidth: 100,
  },
  muscleGroupName: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  muscleGroupCount: {
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  moreText: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});