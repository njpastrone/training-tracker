import { View, StyleSheet } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { Workout } from '../types/workout';
import { colors, spacing, muscleGroupColors } from '../constants/theme';

interface Props {
  workout: Workout;
  onPress?: () => void;
}

export default function WorkoutCard({ workout, onPress }: Props) {
  const formattedDate = format(parseISO(workout.date), 'EEEE, MMM d');
  const exerciseCount = workout.exercises.length;

  return (
    <Surface style={styles.card} elevation={1} onTouchEnd={onPress}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.date}>
          {formattedDate}
        </Text>
        <Text variant="bodySmall" style={styles.count}>
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
          <Text key={exercise.id} variant="bodySmall" style={styles.exerciseText}>
            {exercise.name}
            {exercise.sets && exercise.reps && ` - ${exercise.sets}x${exercise.reps}`}
            {exercise.weight && ` @ ${exercise.weight}${exercise.unit || 'lbs'}`}
          </Text>
        ))}
        {workout.exercises.length > 3 && (
          <Text variant="bodySmall" style={styles.moreText}>
            +{workout.exercises.length - 3} more
          </Text>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    color: colors.text,
    fontWeight: '600',
  },
  count: {
    color: colors.textSecondary,
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    height: 26,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exercises: {
    gap: 2,
  },
  exerciseText: {
    color: colors.textSecondary,
  },
  moreText: {
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
