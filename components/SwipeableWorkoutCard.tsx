import { Alert, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import WorkoutCard from './WorkoutCard';
import { Workout } from '../types/workout';
import type { FoodDayTotal } from '../services/progress';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  workout: Workout;
  food?: FoodDayTotal;
}

export default function SwipeableWorkoutCard({ workout, food }: Props) {
  const { deleteWithUndo, addWorkout } = useWorkoutStore();
  const { colors } = useTheme();
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
    Alert.alert('Workout Duplicated', 'Workout has been copied to today');
  };

  // No confirm: the screen's <UndoToast> offers Undo
  const handleDelete = () => deleteWithUndo([workout.id]);

  const renderLeftActions = () => {
    return (
      <Pressable onPress={handleDuplicate} accessibilityRole="button" style={[styles.leftAction, { backgroundColor: colors.mint }]}>
        <SymbolView name="plus.square.on.square" size={22} tintColor={colors.onSunrise} />
        <Text style={[styles.actionText, { color: colors.onSunrise }]}>Duplicate</Text>
      </Pressable>
    );
  };

  const renderRightActions = () => {
    return (
      <Pressable onPress={handleDelete} accessibilityRole="button" style={[styles.rightAction, { backgroundColor: colors.error }]}>
        <SymbolView name="trash" size={22} tintColor={colors.onSunrise} />
        <Text style={[styles.actionText, { color: colors.onSunrise }]}>Delete</Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={(ref) => { swipeableRef = ref; }}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <WorkoutCard workout={workout} food={food} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: 96,
    borderRadius: radius.card,
    marginRight: 8,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: 96,
    borderRadius: radius.card,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
