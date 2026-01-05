import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameMonth, isToday, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { Workout } from '../types/workout';
import { colors, spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  workouts: Workout[];
  onDateSelect?: (date: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar({ workouts, onDateSelect }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const workoutDates = useMemo(() => {
    return new Set(workouts.map((w) => w.date));
  }, [workouts]);

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
        <Text variant="titleMedium" style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS.map((day) => (
          <Text key={day} variant="bodySmall" style={styles.dayLabel}>
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
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                hasWorkout && styles.workoutDay,
                isCurrentDay && styles.today,
              ]}
              onPress={() => onDateSelect?.(dateStr)}
              disabled={!hasWorkout}
            >
              <Text
                variant="bodyMedium"
                style={[
                  styles.dayText,
                  hasWorkout && styles.workoutDayText,
                  isCurrentDay && styles.todayText,
                  !isCurrentMonth && styles.otherMonthText,
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.workoutDot]} />
          <Text variant="bodySmall" style={styles.legendText}>Workout logged</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.todayDot]} />
          <Text variant="bodySmall" style={styles.legendText}>Today</Text>
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
    color: colors.text,
    fontWeight: '600',
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayLabel: {
    width: 40,
    textAlign: 'center',
    color: colors.textSecondary,
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
    color: colors.text,
    width: 32,
    height: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  workoutDay: {},
  workoutDayText: {
    backgroundColor: colors.secondary,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  today: {},
  todayText: {
    borderWidth: 2,
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: '600',
  },
  otherMonthText: {
    color: colors.disabled,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.secondary,
  },
  todayDot: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  legendText: {
    color: colors.textSecondary,
  },
});
