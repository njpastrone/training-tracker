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
import { scheduleService } from '../../services/schedule';
import { v4 as uuidv4 } from 'uuid';

// Helper function to compare arrays for preset selection
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

export default function HistoryScreen() {
  const { 
    workouts, 
    getStats, 
    templates,
    schedule,
    loadTemplates,
    loadSchedule,
    scheduleWorkout,
    cancelScheduledWorkout,
    deleteRecurringSeries
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

  // Workout day presets for common training patterns
  const dayPresets = [
    { name: 'Mon, Wed, Fri', days: ['Monday', 'Wednesday', 'Friday'], category: '3-day' },
    { name: 'Tue, Thu', days: ['Tuesday', 'Thursday'], category: '2-day' },
    { name: 'Sat, Sun', days: ['Saturday', 'Sunday'], category: '2-day' },
    { name: 'Mon, Tue, Thu, Fri', days: ['Monday', 'Tuesday', 'Thursday', 'Friday'], category: '4-day' },
    { name: 'Tue, Thu, Sat', days: ['Tuesday', 'Thursday', 'Saturday'], category: '3-day' },
    { name: 'Mon, Fri', days: ['Monday', 'Friday'], category: '2-day' },
    { name: 'Mon-Fri', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], category: '5-day' },
    { name: 'Every Day', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], category: '7-day' },
  ];

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
      const template = templates.find(t => t.id === existingSchedule.templateId);
      const isRecurring = existingSchedule.isRecurring;
      
      // Show options to edit or cancel existing schedule
      const alertButtons = [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove This Date', 
          style: 'destructive',
          onPress: () => handleCancelSchedule(date)
        },
        { 
          text: 'Change Template', 
          onPress: () => openScheduleDialog(date)
        },
      ];

      // Add "Delete Series" option for recurring workouts
      if (isRecurring && existingSchedule.recurringPattern) {
        alertButtons.splice(2, 0, {
          text: 'Delete Entire Series',
          style: 'destructive',
          onPress: () => handleDeleteSeries(
            existingSchedule.templateId, 
            existingSchedule.recurringPattern!, 
            existingSchedule.recurringDays
          )
        });
      }

      const scheduleDescription = isRecurring
        ? existingSchedule.recurringPattern === 'custom' && existingSchedule.recurringDays
          ? `Custom recurring workout (${existingSchedule.recurringDays.map(d => d.slice(0, 3)).join(', ')}): ${template?.name || 'Unknown'}`
          : `Recurring ${existingSchedule.recurringPattern} workout: ${template?.name || 'Unknown'}`
        : `Scheduled workout: ${template?.name || 'Unknown'}`;

      Alert.alert('Scheduled Workout', scheduleDescription, alertButtons);
    } else {
      // Open schedule dialog for new scheduling
      openScheduleDialog(date);
    }
  };

  const openScheduleDialog = (date: string) => {
    setSelectedDate(date);
    // Reset template selection for fresh dialog state
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

  const handleDeleteSeries = async (templateId: string, recurringPattern: 'weekly' | 'biweekly' | 'monthly' | 'custom', customDays?: string[]) => {
    try {
      const deletedCount = await deleteRecurringSeries(templateId, recurringPattern, customDays);
      await loadSchedule(); // Reload to update calendar
      
      const seriesDescription = recurringPattern === 'custom' && customDays 
        ? `custom schedule (${customDays.map(d => d.slice(0, 3)).join(', ')})` 
        : `${recurringPattern} series`;
      
      Alert.alert('Success', `Deleted ${deletedCount} scheduled workouts from the ${seriesDescription}.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete recurring series.');
    }
  };

  const scheduleCustomDays = async (startDate: string, templateId: string, days: string[]) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDateObj = parseISO(startDate);
    
    // Get current schedule to avoid duplicates and to store custom days metadata
    const schedule = await scheduleService.getSchedule();
    
    // Schedule for next 12 weeks on selected days
    for (let week = 0; week < 12; week++) {
      for (const dayName of days) {
        const dayIndex = daysOfWeek.indexOf(dayName);
        if (dayIndex === -1) continue;
        
        const targetDate = new Date(startDateObj);
        targetDate.setDate(startDateObj.getDate() + (week * 7) + dayIndex - startDateObj.getDay());
        
        if (targetDate >= startDateObj) {
          const dateStr = format(targetDate, 'yyyy-MM-dd');
          
          // Check if date already has a scheduled workout
          const existingSchedule = schedule.find(s => s.date === dateStr);
          if (!existingSchedule) {
            // Create custom recurring schedule with days metadata
            const newSchedule = {
              id: uuidv4(),
              date: dateStr,
              templateId,
              isRecurring: true,
              recurringPattern: 'custom' as const,
              recurringDays: days, // Store the custom days
              completed: false,
            };
            
            schedule.push(newSchedule);
          }
        }
      }
    }
    
    // Save the updated schedule
    await scheduleService.saveSchedule(schedule);
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
          <Dialog.ScrollArea style={{ maxHeight: 600, paddingBottom: 16 }}>
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
              
              {/* New flattened schedule type options */}
              <View style={{ gap: 8 }}>
                <Chip
                  selected={!isRecurring && recurringPattern !== 'custom'}
                  onPress={() => {
                    setIsRecurring(false);
                    setRecurringPattern('weekly');
                    setSelectedDays([]);
                  }}
                  mode="outlined"
                  style={{ alignSelf: 'flex-start' }}
                  icon="calendar-today"
                >
                  One Time
                </Chip>
                
                <Chip
                  selected={isRecurring && recurringPattern === 'weekly'}
                  onPress={() => {
                    setIsRecurring(true);
                    setRecurringPattern('weekly');
                    setSelectedDays([]);
                  }}
                  mode="outlined"
                  style={{ alignSelf: 'flex-start' }}
                  icon="repeat"
                >
                  Weekly Repeat
                </Chip>
                
                <Chip
                  selected={recurringPattern === 'custom'}
                  onPress={() => {
                    setIsRecurring(true);
                    setRecurringPattern('custom');
                    if (selectedDays.length === 0) {
                      // Auto-select current day if none selected
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const currentDay = dayNames[new Date().getDay()];
                      setSelectedDays([currentDay]);
                    }
                  }}
                  mode="outlined"
                  style={{ alignSelf: 'flex-start' }}
                  icon="calendar-multiple"
                >
                  Custom Days
                  {recurringPattern === 'custom' && selectedDays.length > 0 && (
                    <Text style={{ fontSize: 12, opacity: 0.7 }}>
                      {' '}({selectedDays.map(d => d.slice(0, 3)).join(', ')})
                    </Text>
                  )}
                </Chip>

                {/* Show advanced patterns in expandable section */}
                {isRecurring && recurringPattern !== 'custom' && (
                  <View style={{ marginTop: 8 }}>
                    <Text variant="bodySmall" style={{ marginBottom: 8, opacity: 0.7 }}>
                      Advanced options:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Chip
                        selected={recurringPattern === 'biweekly'}
                        onPress={() => setRecurringPattern('biweekly')}
                        mode="outlined"
                        compact
                      >
                        Bi-weekly
                      </Chip>
                      <Chip
                        selected={recurringPattern === 'monthly'}
                        onPress={() => setRecurringPattern('monthly')}
                        mode="outlined"
                        compact
                      >
                        Monthly
                      </Chip>
                    </View>
                  </View>
                )}
              </View>

              {/* Enhanced day selection for custom days */}
              {recurringPattern === 'custom' && (
                <View style={{ marginTop: 16 }}>
                  <Text variant="bodySmall" style={{ marginBottom: 12 }}>
                    Select workout days:
                  </Text>
                  
                  {/* Quick preset buttons (horizontal) */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                    contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                    nestedScrollEnabled={true}
                  >
                    {dayPresets.map((preset, index) => {
                      const isSelected = arraysEqual(selectedDays, preset.days);
                      return (
                        <Button
                          key={index}
                          mode={isSelected ? "contained" : "outlined"}
                          compact
                          onPress={() => setSelectedDays(preset.days)}
                          style={{ borderRadius: 20 }}
                          contentStyle={{ paddingHorizontal: 12 }}
                        >
                          {preset.name}
                        </Button>
                      );
                    })}
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => setSelectedDays([])}
                      style={{ borderRadius: 20 }}
                      contentStyle={{ paddingHorizontal: 12 }}
                    >
                      Clear
                    </Button>
                  </ScrollView>
                  
                  {/* Individual day selection */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <Chip
                          key={day}
                          selected={isSelected}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d !== day));
                            } else {
                              setSelectedDays([...selectedDays, day]);
                            }
                          }}
                          mode="outlined"
                          style={{ 
                            backgroundColor: isSelected ? colors.primary + '20' : 'transparent'
                          }}
                          textStyle={{
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '600' : '400'
                          }}
                        >
                          {day.slice(0, 3)}
                        </Chip>
                      );
                    })}
                  </View>
                  
                  {/* Compact preview text */}
                  {selectedDays.length > 0 && (
                    <View style={{ 
                      padding: 10, 
                      backgroundColor: colors.primary + '10', 
                      borderRadius: 6,
                      borderLeftWidth: 2,
                      borderLeftColor: colors.primary
                    }}>
                      <Text variant="bodySmall" style={{ color: colors.primary, fontWeight: '500' }}>
                        ✓ Will repeat every {selectedDays.join(', ')}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {selectedDays.length} workout{selectedDays.length === 1 ? '' : 's'} per week
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Dialog.Content>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setScheduleDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={handleScheduleWorkout}
              disabled={
                templates.length === 0 || 
                !selectedTemplate || 
                (recurringPattern === 'custom' && selectedDays.length === 0)
              }
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
