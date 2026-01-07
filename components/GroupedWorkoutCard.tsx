import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Chip, IconButton } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Workout, MuscleGroup } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, muscleGroupColors } from '../constants/theme';

interface Props {
  date: string;
  workouts: Workout[];
}

export default function GroupedWorkoutCard({ date, workouts }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const formattedDate = format(parseISO(date), 'EEEE, MMM d');
  
  // Combine all exercises from all workouts
  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  
  // Get unique muscle groups across all workouts
  const allMuscleGroups = [...new Set(workouts.flatMap(w => w.muscleGroups))];
  
  // Check if workouts are on same day
  const isMultiSession = workouts.length > 1;

  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={[styles.date, { color: colors.text }]}>
            {formattedDate}
          </Text>
          <Text variant="bodySmall" style={[styles.count, { color: colors.textSecondary }]}>
            {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
            {isMultiSession && ` • ${workouts.length} sessions`}
          </Text>
        </View>
      </View>

      <View style={styles.muscleGroups}>
        {allMuscleGroups.map((group) => (
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

      <View style={[styles.sessions, { borderTopColor: colors.border }]}>
        {workouts.map((workout, index) => (
          <Pressable 
            key={workout.id}
            onPress={() => router.push(`/workout/${workout.id}`)}
            style={({ pressed }) => [
              styles.sessionCard,
              { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border }
            ]}
          >
            <View style={styles.sessionContent}>
              <View style={styles.exerciseList}>
                {workout.exercises.slice(0, 2).map((exercise) => (
                  <Text key={exercise.id} variant="bodySmall" style={[styles.exerciseText, { color: colors.textSecondary }]}>
                    {exercise.name}
                    {exercise.sets && exercise.reps && ` - ${exercise.sets}x${exercise.reps}`}
                    {exercise.weight && ` @ ${exercise.weight}${exercise.unit || 'lbs'}`}
                  </Text>
                ))}
                {workout.exercises.length > 2 && (
                  <Text variant="bodySmall" style={[styles.moreText, { color: colors.primary }]}>
                    +{workout.exercises.length - 2} more
                  </Text>
                )}
              </View>
              <IconButton icon="chevron-right" size={20} />
            </View>
          </Pressable>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  date: {
    fontWeight: '600',
  },
  count: {
    marginTop: 2,
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
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
  sessions: {
    borderTopWidth: 1,
  },
  sessionCard: {
    borderBottomWidth: 1,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  exerciseList: {
    flex: 1,
    gap: 2,
  },
  exerciseText: {
    // color applied dynamically
  },
  moreText: {
    fontWeight: '500',
    marginTop: 2,
  },
});