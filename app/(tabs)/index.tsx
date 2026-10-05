import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Surface, Button, Chip, Icon } from 'react-native-paper';
import { SkyScreen, LargeTitle } from '../../components/Sky';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import WorkoutInput from '../../components/WorkoutInput';
import WorkoutList from '../../components/WorkoutList';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';
import { format } from 'date-fns';
import { templateService } from '../../services/templates';
import { getPlans } from '../../services/planner';
import { TrainingPlan } from '../../types/plan';

export default function LogScreen() {
  const { 
    workouts, 
    schedule,
    isLoading, 
    getTodaysScheduledWorkout, 
    getTemplate,
    markWorkoutSkipped,
    markWorkoutCompleted,
    loadSchedule,
    loadTemplates
  } = useWorkoutStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);

  // Get 5 most recent workouts
  const recentWorkouts = workouts.slice(0, 5);
  
  // Get today's scheduled workout
  const todaysSchedule = getTodaysScheduledWorkout();
  const scheduledTemplate = todaysSchedule ? getTemplate(todaysSchedule.templateId) : null;

  // "Re-entry week · 1 of 4" when today's session comes from a plan
  const todaysPlan = plans.find(p => p.id === todaysSchedule?.planId);
  const planSessions = todaysPlan ? schedule.filter(s => s.planId === todaysPlan.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const hasUpcoming = schedule.some(s => s.date >= today && !s.completed && !s.skipped);

  // State for template auto-population
  const [templateWorkoutData, setTemplateWorkoutData] = useState<any>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);

  useEffect(() => {
    getPlans().then(setPlans);
  }, [schedule]);

  const handleStartScheduledWorkout = async () => {
    if (!scheduledTemplate) {
      Alert.alert('Error', 'No scheduled template found');
      return;
    }
    
    try {
      const workoutData = templateService.templateToWorkout(scheduledTemplate);
      setTemplateWorkoutData(workoutData);
      setActiveTemplateId(scheduledTemplate.id);
    } catch (error) {
      console.error('Error in handleStartScheduledWorkout:', error);
      Alert.alert('Error', 'Failed to start scheduled workout');
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

  const handleWorkoutLogged = async (workoutId: string) => {
    // If workout was logged from today's scheduled template, mark schedule as completed
    if (activeTemplateId && todaysSchedule && todaysSchedule.templateId === activeTemplateId) {
      try {
        await markWorkoutCompleted(todaysSchedule.date, workoutId);
        console.log('Marked scheduled workout as completed');
      } catch (error) {
        console.log('Warning: Could not mark scheduled workout as completed:', error);
      }
    }
    
    // Clear template data after workout is logged
    setTemplateWorkoutData(null);
    setActiveTemplateId(undefined);
  };

  return (
    <SkyScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LargeTitle title="LiftText" />
          <Surface style={[styles.inputSection, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="headlineSmall" style={[styles.greeting, { color: colors.text }]}>
              What'd you hit today?
            </Text>
            <WorkoutInput 
              templateExercises={templateWorkoutData}
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
                    {todaysPlan && (
                      <Chip compact style={styles.recurringChip} textStyle={styles.compactChipText}>
                        {`${todaysPlan.name} · ${planSessions.findIndex(s => s.id === todaysSchedule.id) + 1} of ${planSessions.length}`}
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
                  {todaysSchedule.note && (
                    <View style={[styles.noteRow, { backgroundColor: colors.primary + '15' }]}>
                      <Icon source="lightbulb-outline" size={16} color={colors.primary} />
                      <Text variant="bodySmall" style={[styles.noteText, { color: colors.text }]}>
                        {todaysSchedule.note}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.todaysWorkoutActions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (!scheduledTemplate) {
                      Alert.alert('Error', 'No template found');
                      return;
                    }
                    try {
                      const workoutData = templateService.templateToWorkout(scheduledTemplate);
                      setTemplateWorkoutData(workoutData);
                      setActiveTemplateId(scheduledTemplate.id);
                    } catch (error) {
                      console.error('Error populating workout:', error);
                      Alert.alert('Error', 'Failed to populate workout');
                    }
                  }}
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

          {!hasUpcoming && (
            <Surface style={[styles.todaysWorkoutCard, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.todaysWorkoutTitle, { color: colors.text }]}>
                Plan your week
              </Text>
              <Text variant="bodyMedium" style={[styles.planText, { color: colors.textSecondary }]}>
                Tell the coach what you want and it puts the workouts on your calendar.
              </Text>
              <Button mode="contained" icon="creation" onPress={() => router.push('/plan')}>
                Plan it for me
              </Button>
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
    </SkyScreen>
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
  compactChipText: {
    fontSize: 11,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  noteText: {
    flex: 1,
  },
  planText: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
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
