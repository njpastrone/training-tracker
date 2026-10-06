import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isToday, isPast } from 'date-fns';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Workout } from '../types/workout';
import { TemplateSchedule } from '../types/template';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing } from '../constants/theme';

interface Props {
  workouts: Workout[];
  schedule?: TemplateSchedule[];
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Month grid: logged = sunrise disc, planned = cobalt ring, today = a ring around the date.
// Every day opens the day screen, which shows what was logged or planned there.
export default function Calendar({ workouts, schedule = [] }: Props) {
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

    // Monday-first padding before the 1st
    let startDay = getDay(monthStart);
    startDay = startDay === 0 ? 6 : startDay - 1;
    const paddedDays: (Date | null)[] = Array(startDay).fill(null);

    return [...paddedDays, ...days];
  }, [currentMonth]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <View>
      <View style={styles.header}>
        <NavButton icon="chevron.left" label="Previous month" onPress={goToPrevMonth} />
        <Text variant="titleMedium" style={{ color: colors.text }}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <NavButton icon="chevron.right" label="Next month" onPress={goToNextMonth} />
      </View>

      <View style={styles.row}>
        {DAYS.map((day, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.textTertiary }]} accessibilityLabel={DAY_NAMES[i]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }

          const dateStr = format(day, 'yyyy-MM-dd');
          const hasWorkout = workoutDates.has(dateStr);
          const hasScheduled = scheduledDates.has(dateStr) && !hasWorkout;
          const today = isToday(day);
          const past = isPast(day) && !today;

          const state = [hasWorkout && 'workout logged', hasScheduled && 'workout planned', today && 'today'].filter(Boolean).join(', ');

          return (
            <Pressable
              key={dateStr}
              style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => router.push(`/day/${dateStr}`)}
              accessibilityRole="button"
              accessibilityLabel={`${format(day, 'EEEE, MMMM d')}${state ? `, ${state}` : ''}`}
            >
              <View
                style={[
                  styles.disc,
                  hasWorkout && { backgroundColor: colors.sunrise },
                  hasScheduled && { borderWidth: 2, borderColor: colors.cobalt },
                  today && { borderWidth: 2, borderColor: colors.text },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: hasWorkout ? colors.onSunrise : hasScheduled ? colors.cobalt : past ? colors.textSecondary : colors.text },
                  ]}
                  maxFontSizeMultiplier={1.4} // stays inside the 34 pt disc
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem label="Logged" swatch={{ backgroundColor: colors.sunrise }} />
        <LegendItem label="Planned" swatch={{ borderWidth: 2, borderColor: colors.cobalt }} />
        <LegendItem label="Today" swatch={{ borderWidth: 2, borderColor: colors.text }} />
      </View>
    </View>
  );
}

function NavButton({ icon, label, onPress }: { icon: 'chevron.left' | 'chevron.right'; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.nav, { backgroundColor: colors.glass, borderColor: colors.glassLine }]}
    >
      <SymbolView name={icon} size={14} weight="semibold" tintColor={colors.textSecondary} />
    </Pressable>
  );
}

function LegendItem({ label, swatch }: { label: string; swatch: object }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, swatch]} />
      <Text variant="labelMedium" style={{ color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  dayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.gap,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
