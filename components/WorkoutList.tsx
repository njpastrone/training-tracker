import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Workout } from '../types/workout';
import WorkoutCard from './WorkoutCard';
import SwipeableWorkoutCard from './SwipeableWorkoutCard';
import GroupedWorkoutCard from './GroupedWorkoutCard';

interface Props {
  workouts: Workout[];
  onWorkoutPress?: (workout: Workout) => void;
  groupByDate?: boolean;
  enableSwipe?: boolean;
}

export default function WorkoutList({ workouts, onWorkoutPress, groupByDate = true, enableSwipe = false }: Props) {
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
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={onWorkoutPress ? () => onWorkoutPress(workout) : undefined}
              />
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
        {sortedDates.map((date) => {
          const dateWorkouts = groupedWorkouts[date];
          if (dateWorkouts.length === 1) {
            // Single workout - use swipeable or regular card
            return enableSwipe ? (
              <SwipeableWorkoutCard
                key={dateWorkouts[0].id}
                workout={dateWorkouts[0]}
              />
            ) : (
              <WorkoutCard
                key={dateWorkouts[0].id}
                workout={dateWorkouts[0]}
                onPress={onWorkoutPress ? () => onWorkoutPress(dateWorkouts[0]) : undefined}
              />
            );
          } else {
            // Multiple workouts - use grouped card
            return (
              <GroupedWorkoutCard
                key={date}
                date={date}
                workouts={dateWorkouts}
              />
            );
          }
        })}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});
