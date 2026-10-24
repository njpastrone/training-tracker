import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { Stack } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import FoodBreakdown from '../components/FoodBreakdown';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { goalProgress } from '../services/goals';
import { foodWeek } from '../services/progress';
import { spacing } from '../constants/theme';

// Food over the last 7 days, from the Details link and the Top sources door on Food: the average, days
// at goal, a bar a day, calories, carbs · fat and where the protein came from (components/FoodBreakdown.tsx)
export default function FoodWeekScreen() {
  const { colors } = useTheme();
  const { workouts, foodEntries, exerciseLibrary, settings } = useWorkoutStore();
  const week = useMemo(() => foodWeek(foodEntries), [foodEntries]);
  const goal = useMemo(() => settings.goals && goalProgress(settings.goals, workouts, exerciseLibrary, foodEntries).food, [settings.goals, workouts, exerciseLibrary, foodEntries]);
  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Food" subtitle={week.logged ? `Logged on ${week.logged} of the last 7 days` : 'No food in the last 7 days'} />
        {week.logged ? (
          <FoodBreakdown week={week} goal={goal} />
        ) : (
          <SkyCard style={styles.empty}>
            <SymbolView name="fork.knife" size={30} tintColor={colors.food} />
            <Text variant="titleMedium" style={[styles.center, { color: colors.text }]}>Nothing in the last 7 days</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>Log a meal and this week fills in again.</Text>
          </SkyCard>
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
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
