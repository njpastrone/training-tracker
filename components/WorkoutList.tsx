import { Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { format, parseISO } from 'date-fns';
import { FoodGoal, Workout } from '../types/workout';
import WorkoutCard from './WorkoutCard';
import SwipeableWorkoutCard from './SwipeableWorkoutCard';
import DayRow from './DayRow';
import { spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { FoodDayTotal } from '../services/progress';
import { SkyCard } from './Sky';

interface Props {
  workouts: Workout[];
  groupByDate?: boolean;
  byMonth?: boolean; // grouped list: a month name above each month's days
  enableSwipe?: boolean;
  selected?: Set<string>; // select mode: a flat list where a tap toggles the workout
  onToggle?: (id: string) => void;
  food?: Map<string, FoodDayTotal>; // grouped list: days with training or food, each a day row
  goal?: FoodGoal; // grouped list: the food goal the day rows' rings measure
}

export default function WorkoutList({ workouts, groupByDate = true, byMonth = false, enableSwipe = false, selected, onToggle, food, goal }: Props) {
  const { colors } = useTheme();

  if (selected && onToggle) {
    return (
      <View style={styles.container}>
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} selected={selected.has(workout.id)} onPress={() => onToggle(workout.id)} />
        ))}
      </View>
    );
  }

  if (!groupByDate) {
    return (
      <GestureHandlerRootView>
        <View style={styles.container}>
          {workouts.map((workout) => (
            enableSwipe ? (
              <SwipeableWorkoutCard
                key={workout.id}
                workout={workout}
               
              />
            ) : (
              <WorkoutCard key={workout.id} workout={workout} />
            )
          ))}
        </View>
      </GestureHandlerRootView>
    );
  }

  // Every day with training or food, newest first: one row each, in one card (one per month when byMonth)
  const dates = [...new Set([...workouts.map(w => w.date), ...(food?.keys() ?? [])])].sort((a, b) => b.localeCompare(a));
  const months = new Map<string, string[]>();
  for (const d of dates) {
    const key = byMonth ? d.slice(0, 7) : '';
    months.set(key, [...(months.get(key) ?? []), d]);
  }

  return (
    <View>
      {[...months].map(([month, days]) => (
        <Fragment key={month}>
          {!!month && (
            <Text variant="titleSmall" accessibilityRole="header" style={[styles.month, { color: colors.textSecondary }]}>
              {format(parseISO(days[0]), 'MMMM yyyy')}
            </Text>
          )}
          <SkyCard style={styles.tight}>
            {days.map((date, i) => (
              <DayRow key={date} date={date} workouts={workouts.filter(w => w.date === date)} food={food?.get(date)} goal={goal} first={i === 0} />
            ))}
          </SkyCard>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gap,
  },
  tight: {
    paddingVertical: 6,
  },
  month: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
});
