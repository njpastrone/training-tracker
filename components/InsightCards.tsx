import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { SkyCard, SectionLabel } from './Sky';
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
      <SkyCard>
        <View style={styles.insightRow}>
          <SymbolView name="lightbulb" size={20} tintColor={colors.sunrise} />
          <Text variant="bodyMedium" style={[styles.insightText, { color: colors.text }]}>
            Start logging workouts to see your fitness insights!
          </Text>
        </View>
      </SkyCard>
    );
  }

  const insights: { icon: SFSymbol; text: string; color: string }[] = [];

  // Average workouts insight
  if (stats.averagePerWeek > 0) {
    const weeklyGoal = 3; // Assume 3 workouts per week is a good goal
    if (stats.averagePerWeek >= weeklyGoal) {
      insights.push({
        icon: 'chart.line.uptrend.xyaxis',
        text: `Great consistency! You're averaging ${stats.averagePerWeek} workouts per week`,
        color: colors.mint,
      });
    } else {
      insights.push({
        icon: 'target',
        text: `You're averaging ${stats.averagePerWeek} workouts per week. Try for ${weeklyGoal}!`,
        color: colors.sunrise,
      });
    }
  }

  // Most trained muscle group
  if (stats.mostTrainedMuscleGroup) {
    insights.push({
      icon: 'figure.strengthtraining.traditional',
      text: `Most trained: ${stats.mostTrainedMuscleGroup.group.replace('_', ' ')} (${stats.mostTrainedMuscleGroup.count} times)`,
      color: colors.sunrise,
    });
  }

  // Least trained muscle group (but only if they have some variety)
  if (stats.leastTrainedMuscleGroup && Object.keys(stats.workoutsByMuscleGroup).length > 3) {
    insights.push({
      icon: 'exclamationmark.circle',
      text: `Consider training ${stats.leastTrainedMuscleGroup.group.replace('_', ' ')} more (only ${stats.leastTrainedMuscleGroup.count} time${stats.leastTrainedMuscleGroup.count !== 1 ? 's' : ''})`,
      color: colors.warning,
    });
  }

  // Yearly progress
  if (stats.thisYear > 10) {
    insights.push({
      icon: 'star.circle',
      text: `${stats.thisYear} workouts completed this year - fantastic progress!`,
      color: colors.sunrise,
    });
  }

  // If no specific insights, show a general one
  if (insights.length === 0) {
    insights.push({
      icon: 'chart.xyaxis.line',
      text: `You have ${stats.totalWorkouts} workout${stats.totalWorkouts !== 1 ? 's' : ''} logged. Keep it up!`,
      color: colors.sunrise,
    });
  }

  return (
    <View style={styles.container}>
      <SectionLabel>Insights</SectionLabel>
      <SkyCard>
        {insights.slice(0, 3).map((insight, index) => ( // Show max 3 insights
          <View key={index} style={[styles.insightRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.dim }]}>
            <SymbolView name={insight.icon} size={20} tintColor={insight.color} />
            <Text variant="bodyLarge" style={[styles.insightText, { color: colors.text }]}>
              {insight.text}
            </Text>
          </View>
        ))}
      </SkyCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: spacing.sm,
  },
  insightText: {
    flex: 1,
  },
});
