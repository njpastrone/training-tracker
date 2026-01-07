import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/Calendar';
import MuscleGroupBalance from '../../components/MuscleGroupBalance';
import WeeklyWorkoutPattern from '../../components/WeeklyWorkoutPattern';
import WeekSelector from '../../components/WeekSelector';
import InsightCards from '../../components/InsightCards';
import { spacing } from '../../constants/theme';

export default function HistoryScreen() {
  const { workouts, getStats } = useWorkoutStore();
  const { colors } = useTheme();
  const stats = getStats();
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Start with current week

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Simplified Stats */}
        <Surface style={[styles.statsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNumber, { color: colors.text }]}>
                {stats.streak.current}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Day Streak
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNumber, { color: colors.text }]}>
                {stats.thisWeek}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: colors.textSecondary }]}>
                This Week
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNumber, { color: colors.text }]}>
                {stats.thisMonth}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: colors.textSecondary }]}>
                This Month
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNumber, { color: colors.text }]}>
                {stats.totalWorkouts}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total
              </Text>
            </View>
          </View>
        </Surface>

        {/* Calendar - now with clickable days */}
        <Surface style={[styles.calendarCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Workout Calendar
          </Text>
          <Text variant="bodySmall" style={[styles.calendarHint, { color: colors.textSecondary }]}>
            Tap any day to view or add workouts
          </Text>
          <Calendar workouts={workouts} />
        </Surface>

        {/* Weekly Analytics Section */}
        <Surface style={[styles.analyticsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <WeekSelector 
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
          <MuscleGroupBalance 
            workouts={workouts}
            selectedWeek={selectedWeek}
          />
        </Surface>

        <Surface style={[styles.analyticsCard, { backgroundColor: colors.surface }]} elevation={1}>
          <WeeklyWorkoutPattern 
            workouts={workouts}
            selectedWeek={selectedWeek}
          />
        </Surface>

        <View style={styles.insightCardsContainer}>
          <InsightCards stats={stats} />
        </View>

        {/* Longest Streak */}
        {stats.streak.longest > 0 && (
          <Surface style={[styles.longestStreak, { backgroundColor: colors.primaryLight + '20' }]} elevation={0}>
            <Text variant="bodyMedium" style={[styles.longestStreakText, { color: colors.primary }]}>
              Longest streak: {stats.streak.longest} days • Total: {stats.totalWorkouts} workouts
            </Text>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  statsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '600',
  },
  statLabel: {
    // color applied dynamically
  },
  analyticsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  calendarCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  calendarHint: {
    marginBottom: spacing.md,
  },
  insightCardsContainer: {
    marginBottom: spacing.md,
  },
  longestStreak: {
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  longestStreakText: {
    fontWeight: '500',
  },
});
