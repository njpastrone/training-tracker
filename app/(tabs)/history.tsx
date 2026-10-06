import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, AlertButton, Pressable } from 'react-native';
import { Text, Chip, Portal, Dialog, List, Button } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { useWorkoutStore, DeletedWorkouts } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/Calendar';
import WeeklyWorkoutPattern from '../../components/WeeklyWorkoutPattern';
import WeekSelector from '../../components/WeekSelector';
import SelectableWorkoutList, { UndoToast } from '../../components/SelectableWorkoutList';
import { fonts, radius, spacing } from '../../constants/theme';
import { format, isFuture, parseISO } from 'date-fns';
import { WorkoutTemplate } from '../../types/template';
import { scheduleService } from '../../services/schedule';
import { getPlans, deletePlan } from '../../services/planner';
import { TrainingPlan } from '../../types/plan';
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
  const { colors, sky } = useTheme();
  const router = useRouter();
  const stats = getStats();

  // Set by the Plan screen after Plan it, so this tab can offer Undo
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const addedPlan = plans.find(p => p.id === planId && p.status === 'active');
  const addedCount = schedule.filter(s => s.planId === planId).length;
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Start with current week
  const [removed, setRemoved] = useState<DeletedWorkouts | null>(null);
  
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

  useEffect(() => {
    getPlans().then(setPlans);
  }, [schedule]);

  const handleDeletePlan = async (id: string) => {
    try {
      await deletePlan(id);
      await Promise.all([loadSchedule(), loadTemplates()]);
      if (id === planId) router.setParams({ planId: '' });
    } catch (error) {
      Alert.alert('Error', 'Failed to delete the plan.');
    }
  };

  const confirmDeletePlan = (id: string) => {
    Alert.alert('Delete plan?', 'Removes its upcoming workouts. Completed workouts stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlan(id) },
    ]);
  };

  const handleDatePress = (date: string) => {
    const dateObj = parseISO(date);

    // Logged and past days open the day, to view, edit or delete its workouts
    if (workouts.some(w => w.date === date) || (!isFuture(dateObj) && date !== format(new Date(), 'yyyy-MM-dd'))) {
      router.push(`/day/${date}`);
      return;
    }
    
    // Check if date already has a scheduled workout
    const existingSchedule = schedule.find(s => s.date === date && !s.completed);
    
    if (existingSchedule) {
      const template = templates.find(t => t.id === existingSchedule.templateId);
      const isRecurring = existingSchedule.isRecurring;
      
      // Show options to edit or cancel existing schedule
      const alertButtons: AlertButton[] = [
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
        {
          text: 'Edit Workout',
          onPress: () => router.push(`/template-edit?id=${existingSchedule.templateId}`)
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

      if (existingSchedule.planId) {
        const id = existingSchedule.planId;
        alertButtons.splice(2, 0, {
          text: 'Delete Plan',
          style: 'destructive',
          onPress: () => confirmDeletePlan(id),
        });
      }

      const scheduleDescription = isRecurring
        ? existingSchedule.recurringPattern === 'custom' && existingSchedule.recurringDays
          ? `Custom recurring workout (${existingSchedule.recurringDays.map(d => d.slice(0, 3)).join(', ')}): ${template?.name || 'Unknown'}`
          : `Recurring ${existingSchedule.recurringPattern} workout: ${template?.name || 'Unknown'}`
        : `Scheduled workout: ${template?.name || 'Unknown'}${existingSchedule.note ? `\n${existingSchedule.note}` : ''}`;

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

  const tiles = [
    { value: stats.streak.current, label: 'Day streak' },
    { value: sky.done, label: 'Last 7 days' }, // training days, the same rolling window as the sky
    { value: stats.thisMonth, label: 'This month' },
    { value: stats.totalWorkouts, label: 'All time' },
  ];

  return (
    <SkyScreen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LargeTitle title="History" subtitle={`${sky.done} of ${sky.target} ${sky.planned ? 'planned workouts' : 'workouts'} in the last 7 days`} />
        {addedPlan && (
          <SkyCard style={styles.planBanner}>
            <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
            <Text variant="bodyMedium" style={[styles.planBannerText, { color: colors.text }]}>
              {addedPlan.name} added · {addedCount} workout{addedCount === 1 ? '' : 's'}
            </Text>
            <Pill variant="glass" size="small" label="Undo" onPress={() => planId && handleDeletePlan(planId)} />
            <Pressable onPress={() => router.setParams({ planId: '' })} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8}>
              <SymbolView name="xmark" size={14} weight="semibold" tintColor={colors.textTertiary} />
            </Pressable>
          </SkyCard>
        )}

        <View style={styles.tiles}>
          {tiles.map(tile => (
            <SkyCard key={tile.label} style={styles.tile}>
              <Text style={[styles.tileValue, { color: colors.text }]}>{tile.value}</Text>
              <Text variant="labelMedium" style={{ color: colors.textSecondary }} numberOfLines={1}>{tile.label}</Text>
            </SkyCard>
          ))}
        </View>

        {/* Calendar: tap a day to view it; today and future days can be scheduled */}
        <SkyCard>
          <View style={styles.calendarHeader}>
            <SectionLabel>Calendar</SectionLabel>
            <Pill variant="glass" size="small" icon="logo" label="Plan" onPress={() => router.push('/plan')} />
          </View>
          <Text variant="bodySmall" style={[styles.calendarHint, { color: colors.textTertiary }]}>
            Tap a day to view, edit or delete its workouts, or to plan ahead
          </Text>
          <Calendar
            workouts={workouts}
            schedule={schedule}
            onDatePress={handleDatePress}
          />
        </SkyCard>

        {/* Weekly pattern; what's due by muscle group is on Progress */}
        <SkyCard>
          <WeekSelector
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
          <WeeklyWorkoutPattern
            workouts={workouts}
            selectedWeek={selectedWeek}
          />
        </SkyCard>

        {stats.streak.longest > 0 && (
          <Text variant="bodySmall" style={[styles.longestStreak, { color: colors.textTertiary }]}>
            Longest streak: {stats.streak.longest} days · Total: {stats.totalWorkouts} workouts
          </Text>
        )}

        {workouts.length > 0 && (
          // ponytail: renders every workout; window it if history grows into the thousands
          <SelectableWorkoutList label="All workouts" workouts={workouts} onDeleted={setRemoved} />
        )}
      </ScrollView>
      <UndoToast removed={removed} onClose={() => setRemoved(null)} />

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
                    <List.Icon icon="check-circle" color={colors.sunrise} />
                  ) : null}
                  onPress={() => setSelectedTemplate(template.id)}
                  style={{
                    backgroundColor: selectedTemplate === template.id ? colors.sunrise + '20' : 'transparent',
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
                            backgroundColor: isSelected ? colors.sunrise + '20' : 'transparent'
                          }}
                          textStyle={{
                            color: isSelected ? colors.sunrise : colors.text,
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
                      backgroundColor: colors.sunrise + '10', 
                      borderRadius: 6,
                      borderLeftWidth: 2,
                      borderLeftColor: colors.sunrise
                    }}>
                      <Text variant="bodySmall" style={{ color: colors.sunrise, fontWeight: '500' }}>
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
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  tile: {
    flex: 1,
    marginBottom: 0,
    borderRadius: radius.tile,
    paddingHorizontal: 10,
    paddingVertical: spacing.gap,
  },
  tileValue: {
    fontFamily: fonts.rounded,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarHint: {
    marginTop: 2,
    marginBottom: spacing.gap,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  planBannerText: {
    flex: 1,
    fontWeight: '500',
  },
  longestStreak: {
    textAlign: 'center',
  },
});
