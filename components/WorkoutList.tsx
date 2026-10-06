import { Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { format, parseISO } from 'date-fns';
import { Workout } from '../types/workout';
import WorkoutCard from './WorkoutCard';
import SwipeableWorkoutCard from './SwipeableWorkoutCard';
import GroupedWorkoutCard from './GroupedWorkoutCard';
import { spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  workouts: Workout[];
  groupByDate?: boolean;
  byMonth?: boolean; // grouped list: a month name above each month's days
  enableSwipe?: boolean;
  selected?: Set<string>; // select mode: a flat list where a tap toggles the workout
  onToggle?: (id: string) => void;
}

export default function WorkoutList({ workouts, groupByDate = true, byMonth = false, enableSwipe = false, selected, onToggle }: Props) {
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

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const date = workout.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(workout);
    return groups;
  }, {} as Record<string, Workout[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => b.localeCompare(a));

  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        {sortedDates.map((date, i) => {
          const dateWorkouts = groupedWorkouts[date];
          const single = dateWorkouts.length === 1 && dateWorkouts[0];
          return (
            <Fragment key={date}>
              {byMonth && date.slice(0, 7) !== sortedDates[i - 1]?.slice(0, 7) && (
                <Text variant="titleSmall" accessibilityRole="header" style={[styles.month, { color: colors.textSecondary }]}>
                  {format(parseISO(date), 'MMMM yyyy')}
                </Text>
              )}
              {/* One workout: its own card (swipeable where asked); several: one card for the day */}
              {single ? (
                enableSwipe ? <SwipeableWorkoutCard workout={single} /> : <WorkoutCard workout={single} />
              ) : (
                <GroupedWorkoutCard date={date} workouts={dateWorkouts} />
              )}
            </Fragment>
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gap,
  },
  month: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});
