import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameMonth, isToday, parseISO, isFuture } from 'date-fns';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Workout } from '../types/workout';
import { TemplateSchedule } from '../types/template';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  workouts: Workout[];
  schedule?: TemplateSchedule[];
  onDatePress?: (date: string) => void;
  onDateSelect?: (date: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar({ workouts, schedule = [], onDatePress, onDateSelect }: Props) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  const workoutDates = useMemo(() => {
    return new Set(workouts.map((w) => w.date));
  }, [workouts]);

  const scheduledDates = useMemo(() => {
    return new Set(
      schedule
        .filter(s => !s.completed && !s.skipped)
        .map(s => s.date)
    );
  }, [schedule]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    // Adjust for Monday start
    let startDay = getDay(monthStart);
    startDay = startDay === 0 ? 6 : startDay - 1;

    // Add empty cells for days before the month starts
    const paddedDays: (Date | null)[] = Array(startDay).fill(null);

    return [...paddedDays, ...days];
  }, [currentMonth]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="titleMedium" style={[styles.monthTitle, { color: colors.text }]}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS.map((day) => (
          <Text key={day} variant="bodySmall" style={[styles.dayLabel, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = format(day, 'yyyy-MM-dd');
          const hasWorkout = workoutDates.has(dateStr);
          const hasScheduled = scheduledDates.has(dateStr);
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isFutureDay = isFuture(day);
          
          const handlePress = () => {
            if (onDatePress) {
              onDatePress(dateStr);
            } else if (onDateSelect) {
              onDateSelect(dateStr);
            } else {
              router.push(`/day/${dateStr}`);
            }
          };

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                hasWorkout && styles.workoutDay,
                hasScheduled && styles.scheduledDay,
                isCurrentDay && styles.today,
              ]}
              onPress={handlePress}
            >
              <Text
                variant="bodyMedium"
                style={[
                  styles.dayText,
                  { color: colors.text }, // Base color: white in dark mode, dark in light mode
                  hasWorkout && !isCurrentDay && [styles.workoutDayText, { backgroundColor: colors.primary + '20', color: colors.primary }], // Workout days (not today): primary color text on subtle primary background
                  hasScheduled && !hasWorkout && !isCurrentDay && [styles.scheduledDayText, { backgroundColor: colors.secondary + '20', color: colors.secondary }], // Scheduled days: secondary color
                  isCurrentDay && [styles.todayText, { borderColor: colors.text, color: colors.text }], // Today: always show border ring
                  isCurrentDay && hasWorkout && [styles.todayWithWorkoutText, { backgroundColor: colors.primary + '20', color: colors.primary }], // Today with workout: add subtle background
                  isCurrentDay && hasScheduled && !hasWorkout && [styles.todayWithScheduleText, { backgroundColor: colors.secondary + '20', color: colors.secondary }], // Today with scheduled workout
                  !isCurrentMonth && [styles.otherMonthText, { color: colors.disabled }], // Other month days: disabled color
                  isFutureDay && [styles.futureDay, { color: colors.text }], // Future days: enabled for scheduling
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.workoutDot, { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }]} />
          <Text variant="bodySmall" style={[styles.legendText, { color: colors.textSecondary }]}>Workout logged</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.scheduledDot, { backgroundColor: colors.secondary + '20', borderColor: colors.secondary || '#FF6B6B', borderWidth: 1 }]} />
          <Text variant="bodySmall" style={[styles.legendText, { color: colors.textSecondary }]}>Scheduled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.todayDot, { borderColor: colors.text }]} />
          <Text variant="bodySmall" style={[styles.legendText, { color: colors.textSecondary }]}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthTitle: {
    fontWeight: '600',
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayLabel: {
    width: 40,
    textAlign: 'center',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayText: {
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  workoutDay: {},
  workoutDayText: {
    fontWeight: '600',
    lineHeight: 32,
  },
  scheduledDay: {},
  scheduledDayText: {
    fontWeight: '600',
    lineHeight: 32,
  },
  today: {},
  todayText: {
    borderWidth: 2,
    fontWeight: '600',
    lineHeight: 28,
  },
  todayWithWorkoutText: {
    fontWeight: '600',
    lineHeight: 28,
  },
  todayWithScheduleText: {
    fontWeight: '600',
    lineHeight: 28,
  },
  otherMonthText: {
  },
  futureDay: {
    opacity: 1, // Enable future days for scheduling
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  workoutDot: {
  },
  scheduledDot: {
  },
  todayDot: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendText: {
  },
});
