import { View, StyleSheet } from 'react-native';
import { Text, Surface, Icon } from 'react-native-paper';
import { WorkoutStats } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

interface Props {
  stats: WorkoutStats;
}

export default function InsightCards({ stats }: Props) {
  const { colors } = useTheme();
  
  if (stats.totalWorkouts === 0) {
    return (
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.insightRow}>
          <Icon source="lightbulb-outline" size={20} color={colors.primary} />
          <Text variant="bodyMedium" style={[styles.insightText, { color: colors.text }]}>
            Start logging workouts to see your fitness insights!
          </Text>
        </View>
      </Surface>
    );
  }

  const insights = [];

  // Average workouts insight
  if (stats.averagePerWeek > 0) {
    const weeklyGoal = 3; // Assume 3 workouts per week is a good goal
    if (stats.averagePerWeek >= weeklyGoal) {
      insights.push({
        icon: 'trending-up',
        text: `Great consistency! You're averaging ${stats.averagePerWeek} workouts per week`,
        color: colors.success,
      });
    } else {
      insights.push({
        icon: 'target',
        text: `You're averaging ${stats.averagePerWeek} workouts per week. Try for ${weeklyGoal}!`,
        color: colors.accent,
      });
    }
  }

  // Most trained muscle group
  if (stats.mostTrainedMuscleGroup) {
    insights.push({
      icon: 'arm-flex',
      text: `Most trained: ${stats.mostTrainedMuscleGroup.group.replace('_', ' ')} (${stats.mostTrainedMuscleGroup.count} times)`,
      color: colors.primary,
    });
  }

  // Least trained muscle group (but only if they have some variety)
  if (stats.leastTrainedMuscleGroup && Object.keys(stats.workoutsByMuscleGroup).length > 3) {
    insights.push({
      icon: 'alert-circle-outline',
      text: `Consider training ${stats.leastTrainedMuscleGroup.group.replace('_', ' ')} more (only ${stats.leastTrainedMuscleGroup.count} time${stats.leastTrainedMuscleGroup.count !== 1 ? 's' : ''})`,
      color: colors.warning,
    });
  }

  // Yearly progress
  if (stats.thisYear > 10) {
    insights.push({
      icon: 'calendar-star',
      text: `${stats.thisYear} workouts completed this year - fantastic progress!`,
      color: colors.accent,
    });
  }

  // If no specific insights, show a general one
  if (insights.length === 0) {
    insights.push({
      icon: 'chart-line',
      text: `You have ${stats.totalWorkouts} workout${stats.totalWorkouts !== 1 ? 's' : ''} logged. Keep it up!`,
      color: colors.primary,
    });
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.text }]}>
        Insights
      </Text>
      {insights.slice(0, 3).map((insight, index) => ( // Show max 3 insights
        <Surface key={index} style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.insightRow}>
            <Icon source={insight.icon} size={20} color={insight.color} />
            <Text variant="bodyMedium" style={[styles.insightText, { color: colors.text }]}>
              {insight.text}
            </Text>
          </View>
        </Surface>
      ))}
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
  card: {
    padding: spacing.md,
    borderRadius: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightText: {
    flex: 1,
    lineHeight: 20,
  },
});