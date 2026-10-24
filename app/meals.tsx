import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { CardHead } from '../components/Hue';
import MealTimeline from '../components/MealTimeline';
import DayRow from '../components/DayRow';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { foodTarget } from '../services/goals';
import { foodByDay } from '../services/progress';
import { mealBubbles } from '../services/week';
import { spacing } from '../constants/theme';

const DAYS = 14; // days with food listed under today

const n = (v: number) => Math.round(v).toLocaleString('en-US');

// All meals, from the All meals door on Food: today by meal on a 6 am – 10 pm axis (components/MealTimeline.tsx),
// then the last days with food, each opening its day screen with every meal
export default function MealsScreen() {
  const { colors } = useTheme();
  const { workouts, foodEntries, settings } = useWorkoutStore();
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const goal = settings.goals?.food;
  const protein = !goal || goal.kind === 'protein';
  const totals = useMemo(() => foodByDay(foodEntries), [foodEntries]);
  const total = totals.get(today);
  const bubbles = useMemo(() => mealBubbles(foodEntries.filter(e => e.date === today), goal, now), [foodEntries, goal, today]);
  const days = useMemo(() => [...totals.keys()].filter(d => d < today).sort().reverse().slice(0, DAYS), [totals, today]);

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Meals" subtitle={format(now, 'EEEE, MMMM d')} />
        <SkyCard style={styles.tight}>
          <CardHead label="Today by meal" right={total ? (goal ? `${protein ? total.protein : n(total.kcal)} of ${foodTarget(goal)}` : `${total.protein} g · ${n(total.kcal)} kcal`) : undefined} />
          {bubbles.length ? (
            <>
              <MealTimeline bubbles={bubbles} />
              <View style={styles.legend}>
                <View style={[styles.legendDot, { backgroundColor: colors.food }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>g protein, sized by amount</Text>
              </View>
            </>
          ) : (
            <Text variant="bodyMedium" style={[styles.quiet, { color: colors.textSecondary }]}>Nothing logged yet today. Say what you ate in the bar on Food.</Text>
          )}
        </SkyCard>
        {days.length > 0 && (
          <>
            <SectionLabel style={styles.label}>Days with food</SectionLabel>
            <SkyCard style={styles.tight}>
              {days.map((d, i) => (
                <DayRow key={d} date={d} workouts={workouts.filter(w => w.date === d)} food={totals.get(d)} goal={goal} first={i === 0} />
              ))}
            </SkyCard>
          </>
        )}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  tight: {
    paddingVertical: 12,
  },
  quiet: {
    marginTop: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  label: {
    marginHorizontal: spacing.xs,
    marginTop: spacing.gap,
    marginBottom: spacing.sm,
  },
});
