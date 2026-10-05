import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SectionLabel } from './Sky';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing } from '../constants/theme';
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
      <SectionLabel>Week overview</SectionLabel>
      
      {totalWorkouts > 0 ? (
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} • {totalExercises} total exercises
        </Text>
      ) : (
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          No workouts this week
        </Text>
      )}
      
      <View style={styles.daysGrid}>
        {workoutsByDay.map((day, index) => {
          const dayName = format(day.date, 'EEE');
          const dayNumber = format(day.date, 'd');
          
          return (
            <View
              key={index}
              style={styles.dayContainer}
              accessible
              accessibilityLabel={`${format(day.date, 'EEEE')}${day.hasWorkout ? `, ${day.exerciseCount} exercises` : ', rest'}`}
            >
              <Text style={[styles.dayName, { color: colors.textTertiary }]}>{dayName}</Text>
              <View
                style={[
                  styles.dayCircle,
                  day.hasWorkout ? { backgroundColor: colors.sunrise } : { borderWidth: 1.5, borderColor: colors.dim },
                ]}
              >
                <Text style={[styles.dayNumber, { color: day.hasWorkout ? colors.onSunrise : colors.textTertiary }]}>
                  {dayNumber}
                </Text>
                {day.exerciseCount > 0 && (
                  <Text style={[styles.exerciseCount, { backgroundColor: colors.cobalt, color: colors.onSunrise }]}>
                    {day.exerciseCount}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      
      {totalWorkouts > 0 && (
        <Text variant="bodySmall" style={[styles.hintText, { color: colors.textTertiary }]}>
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
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  dayName: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontFamily: fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    textAlign: 'center',
    lineHeight: 17,
    overflow: 'hidden',
  },
  hintText: {
    textAlign: 'center',
  },
});
