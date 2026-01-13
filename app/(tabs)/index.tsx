import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Surface, Button, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import WorkoutInput from '../../components/WorkoutInput';
import WorkoutList from '../../components/WorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';
import { format } from 'date-fns';
import { templateService } from '../../services/templates';

export default function LogScreen() {
  const { 
    workouts, 
    isLoading, 
    getTodaysScheduledWorkout, 
    getTemplate,
    markWorkoutSkipped,
    markWorkoutCompleted,
    loadSchedule,
    loadTemplates
  } = useWorkoutStore();
  const { colors } = useTheme();

  // Get 5 most recent workouts
  const recentWorkouts = workouts.slice(0, 5);
  
  // Get today's scheduled workout
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;

  // State for template auto-population
  const [templateWorkoutText, setTemplateWorkoutText] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);

  const handleStartScheduledWorkout = async () => {
    if (!scheduledTemplate) return;
    
    try {
      const workoutText = templateService.templateToNaturalLanguage(scheduledTemplate);
      setTemplateWorkoutText(workoutText);
      setActiveTemplateId(scheduledTemplate.id);
      console.log('Auto-populated workout:', workoutText);
    } catch (error) {
      Alert.alert('Error', 'Failed to start scheduled workout.');
    }
  };

  const handleSkipScheduledWorkout = async () => {
    if (!todaysSchedule) return;
    
    Alert.alert(
      'Skip Workout',
      'Are you sure you want to skip today\'s scheduled workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              await markWorkoutSkipped(todaysSchedule.date, 'User skipped');
              Alert.alert('Workout Skipped', 'Don\'t worry, you can reschedule it anytime!');
            } catch (error) {
              Alert.alert('Error', 'Failed to skip workout.');
            }
          },
        },
      ]
    );
  };

  const handleWorkoutLogged = async () => {
    // If workout was logged from today's scheduled template, mark schedule as completed
    if (activeTemplateId && todaysSchedule && todaysSchedule.templateId === activeTemplateId) {
      try {
        await markWorkoutCompleted(todaysSchedule.date);
        console.log('Marked scheduled workout as completed');
      } catch (error) {
        console.log('Warning: Could not mark scheduled workout as completed:', error);
      }
    }
    
    // Clear template data after workout is logged
    setTemplateWorkoutText('');
    setActiveTemplateId(undefined);
  };

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
            <WorkoutInput 
              initialValue={templateWorkoutText}
              templateId={activeTemplateId}
              onWorkoutLogged={handleWorkoutLogged}
            />
          </Surface>

          {/* Today's Scheduled Workout Card */}
          {todaysSchedule && scheduledTemplate && (
            <Surface style={[styles.todaysWorkoutCard, { backgroundColor: colors.surface }]} elevation={1}>
              <View style={styles.todaysWorkoutHeader}>
                <View style={styles.todaysWorkoutInfo}>
                  <View style={styles.todaysWorkoutTitleRow}>
                    <Text variant="titleMedium" style={[styles.todaysWorkoutTitle, { color: colors.text }]}>
                      📅 Today's Workout
                    </Text>
                    {todaysSchedule.isRecurring && (
                      <Chip compact style={styles.recurringChip}>
                        {todaysSchedule.recurringPattern}
                      </Chip>
                    )}
                  </View>
                  <Text variant="titleLarge" style={[styles.templateName, { color: colors.primary }]}>
                    {scheduledTemplate.name}
                  </Text>
                  <View style={styles.templateDetails}>
                    <Text variant="bodyMedium" style={{ color: colors.text }}>
                      {scheduledTemplate.exercises.length} exercises
                    </Text>
                    <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                      • {scheduledTemplate.muscleGroups.join(', ')}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.todaysWorkoutActions}>
                <Button
                  mode="contained"
                  onPress={handleStartScheduledWorkout}
                  style={styles.startButton}
                  icon="play-circle"
                >
                  Start Workout
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleSkipScheduledWorkout}
                  style={styles.skipButton}
                  textColor={colors.textSecondary}
                >
                  Skip
                </Button>
              </View>
            </Surface>
          )}

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
  todaysWorkoutCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  todaysWorkoutHeader: {
    marginBottom: spacing.md,
  },
  todaysWorkoutInfo: {
    flex: 1,
  },
  todaysWorkoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  todaysWorkoutTitle: {
    fontWeight: '600',
  },
  recurringChip: {
    height: 24,
  },
  templateName: {
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  templateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  todaysWorkoutActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  startButton: {
    flex: 2,
  },
  skipButton: {
    flex: 1,
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
