import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, muscleGroupColors } from '../constants/theme';

interface Props {
  workout: Workout;
  onPress?: () => void;
}

export default function WorkoutCard({ workout, onPress }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const formattedDate = format(parseISO(workout.date), 'EEEE, MMM d');
  const exerciseCount = workout.exercises.length;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/workout/${workout.id}`);
    }
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1} pointerEvents="box-only">
      <View style={styles.header}>
        <Text variant="titleMedium" style={[styles.date, { color: colors.text }]}>
          {formattedDate}
        </Text>
        <Text variant="bodySmall" style={[styles.count, { color: colors.textSecondary }]}>
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.muscleGroups}>
        {workout.muscleGroups.map((group) => (
          <Chip
            key={group}
            style={[
              styles.chip,
              { backgroundColor: muscleGroupColors[group] + '20' },
            ]}
            textStyle={[styles.chipText, { color: muscleGroupColors[group] }]}
            compact
          >
            {group.replace('_', ' ')}
          </Chip>
        ))}
      </View>

      <View style={styles.exercises}>
        {workout.exercises.slice(0, 3).map((exercise, index) => (
          <Text key={exercise.id} variant="bodySmall" style={[styles.exerciseText, { color: colors.textSecondary }]}>
            {exercise.name}
            {exercise.sets && exercise.reps && ` - ${exercise.sets}x${exercise.reps}`}
            {exercise.weight && ` @ ${exercise.weight}${exercise.unit || 'lbs'}`}
          </Text>
        ))}
        {workout.exercises.length > 3 && (
          <Text variant="bodySmall" style={[styles.moreText, { color: colors.primary }]}>
            +{workout.exercises.length - 3} more
          </Text>
        )}
      </View>
    </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    fontWeight: '600',
  },
  count: {
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exercises: {
    gap: 2,
  },
  exerciseText: {
  },
  moreText: {
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
