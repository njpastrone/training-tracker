import { View, StyleSheet } from 'react-native';
import { Workout } from '../types/workout';
import WorkoutCard from './WorkoutCard';

interface Props {
  workouts: Workout[];
  onWorkoutPress?: (workout: Workout) => void;
}

export default function WorkoutList({ workouts, onWorkoutPress }: Props) {
  return (
    <View style={styles.container}>
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          onPress={onWorkoutPress ? () => onWorkoutPress(workout) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});
