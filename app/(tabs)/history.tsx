import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../stores/workoutStore';
import Calendar from '../../components/Calendar';
import { colors, spacing } from '../../constants/theme';

export default function HistoryScreen() {
  const { workouts, getStats } = useWorkoutStore();
  const stats = getStats();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Streak and Stats */}
        <Surface style={styles.statsCard} elevation={1}>
          <View style={styles.streakContainer}>
            <Text variant="displaySmall" style={styles.streakNumber}>
              {stats.streak.current}
            </Text>
            <Text variant="bodyMedium" style={styles.streakLabel}>
              day streak
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statNumber}>
                {stats.thisWeek}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                This Week
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statNumber}>
                {stats.thisMonth}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                This Month
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statNumber}>
                {stats.totalWorkouts}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Total
              </Text>
            </View>
          </View>
        </Surface>

        {/* Calendar - now with clickable days */}
        <Surface style={styles.calendarCard} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Workout Calendar
          </Text>
          <Text variant="bodySmall" style={styles.calendarHint}>
            Tap any day to view or add workouts
          </Text>
          <Calendar workouts={workouts} />
        </Surface>

        {/* Longest Streak */}
        {stats.streak.longest > 0 && (
          <Surface style={styles.longestStreak} elevation={0}>
            <Text variant="bodyMedium" style={styles.longestStreakText}>
              Longest streak: {stats.streak.longest} days
            </Text>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    padding: spacing.md,
  },
  statsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  streakNumber: {
    color: colors.secondary,
    fontWeight: '700',
  },
  streakLabel: {
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: colors.text,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textSecondary,
  },
  calendarCard: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  calendarHint: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  longestStreak: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
  },
  longestStreakText: {
    color: colors.primary,
    fontWeight: '500',
  },
});
