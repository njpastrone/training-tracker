import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { startOfWeek, endOfWeek, parseISO, isWithinInterval, format, isSameDay, eachDayOfInterval, getDay } from 'date-fns';

interface Props {
  workouts: Workout[];
  selectedWeek: Date;
}

export default function WeeklyWorkoutPattern({ workouts, selectedWeek }: Props) {
  const { colors } = useTheme();
  // Filter workouts for the selected week
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  
  const weekWorkouts = workouts.filter(workout => {
    const workoutDate = parseISO(workout.date);
    return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
  });

  // Get all days in the week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Group workouts by day
  const workoutsByDay = weekDays.map(day => {
    const dayWorkouts = weekWorkouts.filter(workout => 
      isSameDay(parseISO(workout.date), day)
    );
    return {
      date: day,
      workouts: dayWorkouts,
      hasWorkout: dayWorkouts.length > 0,
      exerciseCount: dayWorkouts.reduce((sum, w) => sum + w.exercises.length, 0)
    };
  });

  const totalWorkouts = weekWorkouts.length;
  const totalExercises = weekWorkouts.reduce((sum, w) => sum + w.exercises.length, 0);

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.text }]}>
        Week Overview
      </Text>
      
      {totalWorkouts > 0 ? (
        <Text variant="bodySmall" style={[styles.summary, { color: colors.primary }]}>
          {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} • {totalExercises} total exercises
        </Text>
      ) : (
        <Text variant="bodySmall" style={[styles.emptyText, { color: colors.textSecondary }]}>
          No workouts this week
        </Text>
      )}
      
      <View style={styles.daysGrid}>
        {workoutsByDay.map((day, index) => {
          const dayName = format(day.date, 'EEE');
          const dayNumber = format(day.date, 'd');
          
          return (
            <View key={index} style={styles.dayContainer}>
              <Text variant="bodySmall" style={[styles.dayName, { color: colors.textSecondary }]}>
                {dayName}
              </Text>
              <Surface 
                style={[
                  styles.dayCircle,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  day.hasWorkout && [styles.workoutDay, { backgroundColor: colors.primary, borderColor: colors.primary }]
                ]} 
                elevation={day.hasWorkout ? 2 : 0}
              >
                <Text 
                  variant="bodySmall" 
                  style={[
                    styles.dayNumber,
                    { color: colors.text },
                    day.hasWorkout && [styles.workoutDayText, { color: 'white' }]
                  ]}
                >
                  {dayNumber}
                </Text>
                {day.exerciseCount > 0 && (
                  <Text variant="bodySmall" style={[styles.exerciseCount, { backgroundColor: colors.secondary }]}>
                    {day.exerciseCount}
                  </Text>
                )}
              </Surface>
            </View>
          );
        })}
      </View>
      
      {totalWorkouts > 0 && (
        <Text variant="bodySmall" style={[styles.hintText, { color: colors.textSecondary }]}>
          Numbers show exercise count per day
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  summary: {
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  emptyText: {
    marginBottom: spacing.md,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  workoutDay: {
  },
  dayNumber: {
    fontWeight: '600',
  },
  workoutDayText: {
  },
  exerciseCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
  hintText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});