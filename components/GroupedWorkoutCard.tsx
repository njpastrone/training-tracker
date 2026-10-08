import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { SkyCard } from './Sky';
import ExerciseRows from './ExerciseRows';
import { dayLabel, FoodLine } from './WorkoutCard';
import type { FoodDayTotal } from '../services/progress';
import { cardTargets } from '../services/format';

interface Props {
  date: string;
  workouts: Workout[];
  food?: FoodDayTotal; // the day's food in one line, opening the day
}

// Several sessions on one day: one card, each session tappable
export default function GroupedWorkoutCard({ date, workouts, food }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);

  return (
    <SkyCard style={styles.card}>
      <Text variant="titleMedium" style={{ color: colors.text }}>
        {dayLabel(date)}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
        {totalExercises} exercise{totalExercises !== 1 ? 's' : ''} · {workouts.length} sessions
      </Text>

      {workouts.map((workout, index) => (
        <Pressable
          key={workout.id}
          onPress={() => router.push(cardTargets(workout).body)}
          accessibilityRole="button"
          accessibilityLabel={`Session ${index + 1}`}
          accessibilityHint="Opens the workout"
          style={({ pressed }) => [styles.session, { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.rows}>
            <ExerciseRows exercises={workout.exercises} limit={2} />
          </View>
          <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
        </Pressable>
      ))}
      {food && (
        <Pressable
          onPress={() => router.push(cardTargets(workouts[0]).food)}
          accessibilityRole="button"
          accessibilityHint="Opens the day"
          style={({ pressed }) => [styles.session, { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.rows}>
            <FoodLine food={food} />
          </View>
          <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
        </Pressable>
      )}
    </SkyCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    marginBottom: 0,
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: 4,
  },
  rows: {
    flex: 1,
  },
});
