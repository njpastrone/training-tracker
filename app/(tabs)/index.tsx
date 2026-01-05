import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkoutInput from '../../components/WorkoutInput';
import WorkoutList from '../../components/WorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { colors, spacing } from '../../constants/theme';

export default function LogScreen() {
  const { workouts, isLoading } = useWorkoutStore();

  // Get recent workouts (last 7 days)
  const recentWorkouts = workouts.slice(0, 10);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Surface style={styles.inputSection} elevation={1}>
            <Text variant="headlineSmall" style={styles.greeting}>
              What'd you hit today?
            </Text>
            <WorkoutInput />
          </Surface>

          <View style={styles.recentSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recent Workouts
            </Text>
            {recentWorkouts.length > 0 ? (
              <WorkoutList workouts={recentWorkouts} />
            ) : (
              <Surface style={styles.emptyState} elevation={0}>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No workouts yet. Log your first workout above!
                </Text>
              </Surface>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  inputSection: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  greeting: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  recentSection: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
