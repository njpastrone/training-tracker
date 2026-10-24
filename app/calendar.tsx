import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { Stack } from 'expo-router';
import { addDays, format, subDays } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { Pill } from '../components/Glass';
import Calendar from '../components/Calendar';
import SelectableWorkoutList, { UndoToast } from '../components/SelectableWorkoutList';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { foodByDay } from '../services/progress';
import { weekLine } from '../services/format';
import { spacing } from '../constants/theme';

const MONTHS_PER_PAGE = 3;

// The record, from the Month link on Training and Food: the calendar (every day opens its day screen),
// then every day by month, its training and its food. Planning happens in Training's bar.
export default function CalendarScreen() {
  const { workouts, foodEntries, schedule, settings } = useWorkoutStore();
  const { colors } = useTheme();

  // A few months at a time, newest first (the store keeps the log sorted by date)
  const [pages, setPages] = useState(1);
  const food = useMemo(() => foodByDay(foodEntries), [foodEntries]);
  const foodDates = useMemo(() => new Set(food.keys()), [food]);
  const months = useMemo(() => [...new Set([...workouts.map(w => w.date), ...foodDates].map(d => d.slice(0, 7)))].sort().reverse(), [workouts, foodDates]);
  const oldestShown = months[Math.min(pages * MONTHS_PER_PAGE, months.length) - 1];
  const shown = useMemo(() => workouts.filter(w => w.date.slice(0, 7) >= oldestShown), [workouts, oldestShown]);
  const shownFood = useMemo(() => new Map([...food].filter(([date]) => date.slice(0, 7) >= oldestShown)), [food, oldestShown]);

  // The rolling 7 days: days with a workout or food logged, and planned days from today on
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisWeek = useMemo(() => {
    const first = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    const last = format(addDays(new Date(), 6), 'yyyy-MM-dd');
    const logged = new Set([...workouts.map(w => w.date), ...foodDates].filter(d => d >= first && d <= today));
    const trained = new Set(workouts.map(w => w.date));
    const planned = new Set(schedule.filter(s => s.date >= today && s.date <= last && !s.completed && !s.skipped && !trained.has(s.date)).map(s => s.date));
    return weekLine(logged.size, planned.size);
  }, [workouts, foodDates, schedule, today]);

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Calendar" subtitle={thisWeek} />

        <SkyCard>
          <Calendar workouts={workouts} schedule={schedule} foodDates={foodDates} />
        </SkyCard>

        {months.length > 0 ? (
          <>
            <SelectableWorkoutList label="Days" workouts={shown} byMonth food={shownFood} goal={settings.goals?.food} />
            {oldestShown !== months[months.length - 1] && (
              <Pill variant="glass" label="Show earlier" onPress={() => setPages(pages + 1)} style={styles.earlier} />
            )}
          </>
        ) : (
          <SkyCard style={styles.empty}>
            <SymbolView name="calendar" size={30} tintColor={colors.sunrise} />
            <Text variant="titleMedium" style={[styles.center, { color: colors.text }]}>Your days show up here</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              Log a workout or a meal on Today, or plan your week on Training.
            </Text>
          </SkyCard>
        )}
      </ScrollView>
      <UndoToast />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  earlier: {
    marginTop: spacing.gap,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
