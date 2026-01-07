import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkoutInput from '../../components/WorkoutInput';
import WorkoutList from '../../components/WorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';

export default function LogScreen() {
  const { workouts, isLoading } = useWorkoutStore();
  const { colors } = useTheme();

  // Get 5 most recent workouts
  const recentWorkouts = workouts.slice(0, 5);

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Surface style={[styles.inputSection, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="headlineSmall" style={[styles.greeting, { color: colors.text }]}>
              What'd you hit today?
            </Text>
            <WorkoutInput />
          </Surface>

          <View style={styles.recentSection}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Workouts
            </Text>
            {recentWorkouts.length > 0 ? (
              <WorkoutList workouts={recentWorkouts} enableSwipe={true} />
            ) : (
              <Surface style={[styles.emptyState, { backgroundColor: colors.surface }]} elevation={0}>
                <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.textSecondary }]}>
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
    marginBottom: spacing.lg,
  },
  greeting: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  recentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
