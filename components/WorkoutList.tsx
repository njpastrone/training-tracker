import { Fragment } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Workout } from '../types/workout';
import WorkoutCard, { dayLabel } from './WorkoutCard';
import SwipeableWorkoutCard from './SwipeableWorkoutCard';
import GroupedWorkoutCard from './GroupedWorkoutCard';
import { spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { foodDayLine } from '../services/format';
import type { FoodDayTotal } from '../services/progress';
import { SkyCard } from './Sky';

interface Props {
  workouts: Workout[];
  groupByDate?: boolean;
  byMonth?: boolean; // grouped list: a month name above each month's days
  enableSwipe?: boolean;
  selected?: Set<string>; // select mode: a flat list where a tap toggles the workout
  onToggle?: (id: string) => void;
  full?: boolean; // every exercise on each card
  food?: Map<string, FoodDayTotal>; // grouped list: days, each card with its food; a food-only day is a quiet card
}

export default function WorkoutList({ workouts, groupByDate = true, byMonth = false, enableSwipe = false, selected, onToggle, food, full }: Props) {
  const { colors } = useTheme();

  if (selected && onToggle) {
    return (
      <View style={styles.container}>
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} full={full} selected={selected.has(workout.id)} onPress={() => onToggle(workout.id)} />
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
                full={full}
              />
            ) : (
              <WorkoutCard key={workout.id} workout={workout} full={full} />
            )
          ))}
        </View>
      </GestureHandlerRootView>
    );
  }

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const date = workout.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(workout);
    return groups;
  }, {} as Record<string, Workout[]>);

  // Every day with training or food, newest first
  const sortedDates = [...new Set([...Object.keys(groupedWorkouts), ...(food?.keys() ?? [])])].sort((a, b) => b.localeCompare(a));

  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        {sortedDates.map((date, i) => {
          const dateWorkouts = groupedWorkouts[date] ?? [];
          const single = dateWorkouts.length === 1 && dateWorkouts[0];
          const ate = food?.get(date);
          return (
            <Fragment key={date}>
              {byMonth && date.slice(0, 7) !== sortedDates[i - 1]?.slice(0, 7) && (
                <Text variant="titleSmall" accessibilityRole="header" style={[styles.month, { color: colors.textSecondary }]}>
                  {format(parseISO(date), 'MMMM yyyy')}
                </Text>
              )}
              {/* One workout: its own card (swipeable where asked); several: one card for the day; none: the day's food */}
              {single ? (
                enableSwipe ? <SwipeableWorkoutCard workout={single} food={ate} /> : <WorkoutCard workout={single} food={ate} />
              ) : dateWorkouts.length ? (
                <GroupedWorkoutCard date={date} workouts={dateWorkouts} food={ate} />
              ) : (
                ate && <FoodDayCard date={date} food={ate} />
              )}
            </Fragment>
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

// A day with food and no training: its totals, opening the day
function FoodDayCard({ date, food }: { date: string; food: FoodDayTotal }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/day/${date}`)}
      accessibilityRole="button"
      accessibilityHint="Opens the day"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <SkyCard style={styles.quiet} pointerEvents="box-only">
        <View style={styles.fill}>
          <Text variant="titleMedium" style={{ color: colors.text }}>{dayLabel(date)}</Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{foodDayLine(food)}</Text>
        </View>
        <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
      </SkyCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gap,
  },
  quiet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.gap,
    marginBottom: 0,
  },
  fill: {
    flex: 1,
  },
  month: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});
