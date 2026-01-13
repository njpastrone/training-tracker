import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Chip, Portal, Dialog, List, Button, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/Calendar';
import MuscleGroupBalance from '../../components/MuscleGroupBalance';
import WeeklyWorkoutPattern from '../../components/WeeklyWorkoutPattern';
import WeekSelector from '../../components/WeekSelector';
import InsightCards from '../../components/InsightCards';
import { spacing } from '../../constants/theme';
import { format, isFuture, parseISO } from 'date-fns';
import { WorkoutTemplate } from '../../types/template';

export default function HistoryScreen() {
  const { 
    workouts, 
    getStats, 
    templates,
    schedule,
    loadTemplates,
    loadSchedule,
    scheduleWorkout,
    cancelScheduledWorkout
  } = useWorkoutStore();
  const { colors } = useTheme();
  const stats = getStats();
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Start with current week
  
  // Schedule workout dialog state
  const [scheduleDialogVisible, setScheduleDialogVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
    loadSchedule();
  }, []);

  const handleDatePress = (date: string) => {
    const dateObj = parseISO(date);
    
    // Only allow scheduling on future dates
    if (!isFuture(dateObj) && format(dateObj, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) {
      return; // Past dates - just view mode
    }
    
    // Check if date already has a scheduled workout
    const existingSchedule = schedule.find(s => s.date === date && !s.completed);
    
    if (existingSchedule) {
      // Show options to edit or cancel existing schedule
      Alert.alert(
        'Scheduled Workout',
        'This date already has a scheduled workout. What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove Schedule', 
            style: 'destructive',
            onPress: () => handleCancelSchedule(date)
          },
          { 
            text: 'Change Template', 
            onPress: () => openScheduleDialog(date)
          },
        ]
      );
    } else {
      // Open schedule dialog for new scheduling
      openScheduleDialog(date);
    }
  };

  const openScheduleDialog = (date: string) => {
    setSelectedDate(date);
    setSelectedTemplate(null);
    setIsRecurring(false);
    setRecurringPattern('weekly');
    setSelectedDays([]);
    setScheduleDialogVisible(true);
  };

  const handleCancelSchedule = async (date: string) => {
    try {
      await cancelScheduledWorkout(date);
      await loadSchedule(); // Reload to update calendar
      Alert.alert('Success', 'Scheduled workout removed.');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove scheduled workout.');
    }
  };

  const scheduleCustomDays = async (startDate: string, templateId: string, days: string[]) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDateObj = parseISO(startDate);
    
    // Schedule for next 12 weeks on selected days
    for (let week = 0; week < 12; week++) {
      for (const dayName of days) {
        const dayIndex = daysOfWeek.indexOf(dayName);
        if (dayIndex === -1) continue;
        
        const targetDate = new Date(startDateObj);
        targetDate.setDate(startDateObj.getDate() + (week * 7) + dayIndex - startDateObj.getDay());
        
        if (targetDate >= startDateObj) {
          const dateStr = format(targetDate, 'yyyy-MM-dd');
          await scheduleWorkout(dateStr, templateId, false);
        }
      }
    }
  };

  const handleScheduleWorkout = async () => {
    console.log('Schedule button pressed', { selectedDate, selectedTemplate, isRecurring, recurringPattern, selectedDays });
    
    if (!selectedDate || !selectedTemplate) {
      Alert.alert('Error', 'Please select a template.');
      return;
    }

    try {
      // For custom recurring, don't pass the pattern to avoid issues
      if (isRecurring && recurringPattern === 'custom' && selectedDays.length > 0) {
        console.log('Scheduling custom days:', selectedDays);
        // Schedule custom days individually
        await scheduleCustomDays(selectedDate, selectedTemplate, selectedDays);
      } else if (isRecurring && recurringPattern !== 'custom') {
        console.log('Scheduling recurring:', recurringPattern);
        // Schedule with standard recurring pattern
        await scheduleWorkout(selectedDate, selectedTemplate, true, recurringPattern);
      } else {
        console.log('Scheduling one-time workout');
        // One-time schedule
        await scheduleWorkout(selectedDate, selectedTemplate, false);
      }
      
      console.log('Reloading schedule...');
      // Reload schedule to update calendar
      await loadSchedule();
      
      setScheduleDialogVisible(false);
      
      const scheduleText = isRecurring 
        ? recurringPattern === 'custom' 
          ? `Scheduled on ${selectedDays.join(', ')}s`
          : `Scheduled recurring ${recurringPattern} workout`
        : 'Scheduled workout';
      
      console.log('Success:', scheduleText);
      Alert.alert('Success', scheduleText);
    } catch (error) {
      console.error('Schedule error details:', error);
      Alert.alert('Error', `Failed to schedule workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

        {/* Calendar - now with clickable days and schedule indicators */}
        <Surface style={[styles.calendarCard, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Workout Calendar
          </Text>
          <Text variant="bodySmall" style={[styles.calendarHint, { color: colors.textSecondary }]}>
            Tap any day to view workouts or schedule future ones
          </Text>
          <Calendar 
            workouts={workouts} 
            schedule={schedule}
            onDatePress={handleDatePress}
          />
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

      {/* Schedule Workout Dialog */}
      <Portal>
        <Dialog visible={scheduleDialogVisible} onDismiss={() => setScheduleDialogVisible(false)}>
          <Dialog.Title>Schedule Workout</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </Text>

            <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
              Choose Template:
            </Text>
            
            {templates.length === 0 ? (
              <Text style={{ color: colors.text, opacity: 0.7, marginBottom: 16 }}>
                No templates available. Create templates in Settings first.
              </Text>
            ) : (
              templates.map(template => (
                <List.Item
                  key={template.id}
                  title={template.name}
                  description={`${template.exercises.length} exercises • ${template.muscleGroups.join(', ')}`}
                  left={props => <List.Icon {...props} icon="clipboard-text-outline" />}
                  right={() => selectedTemplate === template.id ? (
                    <List.Icon icon="check-circle" color={colors.primary} />
                  ) : null}
                  onPress={() => setSelectedTemplate(template.id)}
                  style={{
                    backgroundColor: selectedTemplate === template.id ? colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                    marginBottom: 4,
                  }}
                />
              ))
            )}

            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text variant="bodyMedium">Schedule Type</Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Chip
                  selected={!isRecurring}
                  onPress={() => setIsRecurring(false)}
                  mode="outlined"
                  style={{ flex: 1 }}
                >
                  One Time
                </Chip>
                <Chip
                  selected={isRecurring}
                  onPress={() => setIsRecurring(true)}
                  mode="outlined"
                  style={{ flex: 1 }}
                >
                  Recurring
                </Chip>
              </View>

              {isRecurring && (
                <View style={{ marginTop: 12 }}>
                  <Text variant="bodySmall" style={{ marginBottom: 8 }}>
                    Repeat pattern:
                  </Text>
                  {['weekly', 'biweekly', 'monthly', 'custom'].map(pattern => (
                    <List.Item
                      key={pattern}
                      title={pattern === 'custom' ? 'Select Days' : pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                      left={props => <List.Icon {...props} icon={pattern === 'custom' ? 'calendar-multiple' : 'repeat'} />}
                      right={() => recurringPattern === pattern ? (
                        <List.Icon icon="check-circle" color={colors.primary} />
                      ) : null}
                      onPress={() => setRecurringPattern(pattern as any)}
                      style={{
                        backgroundColor: recurringPattern === pattern ? colors.primary + '20' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 4,
                      }}
                    />
                  ))}
                  
                  {recurringPattern === 'custom' && (
                    <View style={{ marginTop: 12 }}>
                      <Text variant="bodySmall" style={{ marginBottom: 8 }}>
                        Select days:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <Chip
                            key={day}
                            selected={selectedDays.includes(day)}
                            onPress={() => {
                              if (selectedDays.includes(day)) {
                                setSelectedDays(selectedDays.filter(d => d !== day));
                              } else {
                                setSelectedDays([...selectedDays, day]);
                              }
                            }}
                            style={{ marginBottom: 4 }}
                          >
                            {day.slice(0, 3)}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setScheduleDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={() => {
                console.log('Schedule button clicked!');
                handleScheduleWorkout();
              }}
              disabled={!selectedTemplate || (isRecurring && recurringPattern === 'custom' && selectedDays.length === 0)}
              mode="contained"
            >
              Schedule
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
