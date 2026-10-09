import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { format, parseISO } from 'date-fns';
import { useColors } from '../contexts/ThemeContext';
import { radius, spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { workoutName } from '../services/format';
import type { Workout } from '../types/workout';
import { SectionLabel, SkyCard } from './Sky';
import { MuscleChips } from './DayRow';
import ExerciseRows from './ExerciseRows';

// A day's training, in full: one card per workout with every exercise. The card opens the workout
// editor; swipe left to delete (the screen's UndoToast offers Undo).
export default function DayTraining({ workouts }: { workouts: Workout[] }) {
  if (!workouts.length) return null;
  return (
    <GestureHandlerRootView>
      <SectionLabel style={styles.label}>Training</SectionLabel>
      {workouts.map(w => <WorkoutBlock key={w.id} workout={w} />)}
    </GestureHandlerRootView>
  );
}

function WorkoutBlock({ workout }: { workout: Workout }) {
  const colors = useColors();
  const router = useRouter();
  const deleteWithUndo = useWorkoutStore(s => s.deleteWithUndo);
  const name = workoutName(workout.muscleGroups);
  const time = format(parseISO(workout.createdAt), 'h:mm a').toLowerCase();
  // Each muscle once, in exercise order
  const groups = [...new Set(workout.exercises.map(e => e.muscleGroup))];
  const remove = () => deleteWithUndo([workout.id]);

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable onPress={remove} accessibilityRole="button" accessibilityLabel={`Delete ${name}`} style={[styles.delete, { backgroundColor: colors.error }]}>
          <SymbolView name="trash" size={22} tintColor={colors.onSunrise} />
          <Text style={[styles.deleteText, { color: colors.onSunrise }]}>Delete</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => router.push(`/workout/${workout.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'}, logged ${time}`}
        accessibilityHint="Opens the workout to edit"
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={remove}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <SkyCard>
          <View style={styles.header}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{`${time} · Edit ›`}</Text>
          </View>
          <View style={styles.muscles}>
            <MuscleChips groups={groups} />
          </View>
          <ExerciseRows exercises={workout.exercises} />
        </SkyCard>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  muscles: {
    marginTop: 2,
    marginBottom: 4,
  },
  delete: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: 96,
    borderRadius: radius.card,
    marginLeft: 8,
    marginBottom: spacing.gap,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
