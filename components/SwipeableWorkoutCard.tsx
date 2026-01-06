import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Text, IconButton } from 'react-native-paper';
import WorkoutCard from './WorkoutCard';
import { Workout } from '../types/workout';
import { colors, spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  workout: Workout;
  onDuplicate?: (workout: Workout) => void;
}

export default function SwipeableWorkoutCard({ workout, onDuplicate }: Props) {
  const router = useRouter();
  const { deleteWorkout, addWorkout } = useWorkoutStore();
  let swipeableRef: Swipeable | null = null;

  const handleDuplicate = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const duplicatedWorkout: Workout = {
      ...workout,
      id: uuidv4(),
      date: today,
      exercises: workout.exercises.map(e => ({ ...e, id: uuidv4() })),
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
    };
    
    addWorkout(duplicatedWorkout);
    swipeableRef?.close();
    
    if (onDuplicate) {
      onDuplicate(duplicatedWorkout);
    }
    
    Alert.alert('Workout Duplicated', 'Workout has been copied to today');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => swipeableRef?.close()
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(workout.id);
            Alert.alert('Deleted', 'Workout has been removed');
          },
        },
      ]
    );
  };

  const renderLeftActions = () => {
    return (
      <View style={styles.leftAction}>
        <IconButton
          icon="content-copy"
          size={24}
          iconColor="white"
          onPress={handleDuplicate}
        />
        <Text style={styles.actionText}>Duplicate</Text>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <IconButton
          icon="delete"
          size={24}
          iconColor="white"
          onPress={handleDelete}
        />
        <Text style={styles.actionText}>Delete</Text>
      </View>
    );
  };

  return (
    <Swipeable
      ref={(ref) => (swipeableRef = ref)}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <WorkoutCard 
        workout={workout} 
        onPress={() => router.push(`/workout/${workout.id}`)}
      />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: spacing.sm,
    borderRadius: 12,
    marginRight: -spacing.xs,
  },
  rightAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: spacing.sm,
    borderRadius: 12,
    marginLeft: -spacing.xs,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
  },
});