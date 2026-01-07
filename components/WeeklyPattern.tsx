import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { colors, spacing } from '../constants/theme';

interface Props {
  workoutsByDayOfWeek: Record<string, number>;
  favoriteDay: { day: string; count: number } | null;
}

export default function WeeklyPattern({ workoutsByDayOfWeek, favoriteDay }: Props) {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const maxCount = Math.max(...Object.values(workoutsByDayOfWeek), 1);
  
  const totalWorkouts = Object.values(workoutsByDayOfWeek).reduce((sum, count) => sum + count, 0);
  
  if (totalWorkouts === 0) {
    return (
      <View style={styles.emptyState}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No workouts yet - start training to see your weekly patterns!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Weekly Pattern
      </Text>
      
      {favoriteDay && (
        <Text variant="bodySmall" style={styles.favoriteText}>
          Most active: {favoriteDay.day} ({favoriteDay.count} workout{favoriteDay.count !== 1 ? 's' : ''})
        </Text>
      )}
      
      <View style={styles.daysContainer}>
        {dayOrder.map((day) => {
          const count = workoutsByDayOfWeek[day] || 0;
          const progress = count / maxCount;
          const isMaxDay = count === maxCount && count > 0;
          
          return (
            <View key={day} style={styles.dayColumn}>
              <Text variant="bodySmall" style={styles.dayLabel}>
                {day.slice(0, 3)}
              </Text>
              <View style={styles.barContainer}>
                <ProgressBar
                  progress={progress}
                  color={isMaxDay ? colors.primary : colors.secondary}
                  style={styles.progressBar}
                />
              </View>
              <Text variant="bodySmall" style={styles.countLabel}>
                {count}
              </Text>
            </View>
          );
        })}
      </View>
      
      <Text variant="bodySmall" style={styles.hintText}>
        Bars show workout frequency by day of week
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  favoriteText: {
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    marginVertical: spacing.sm,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'space-between',
  },
  dayLabel: {
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  barContainer: {
    flex: 1,
    width: 20,
    justifyContent: 'flex-end',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.border,
    transform: [{ rotate: '0deg' }],
  },
  countLabel: {
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hintText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});