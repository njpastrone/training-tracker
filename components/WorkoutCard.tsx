import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { cardTargets, foodDayLine, workoutSummary } from '../services/format';
import type { FoodDayTotal } from '../services/progress';
import { SkyCard } from './Sky';
import ExerciseRows from './ExerciseRows';

interface Props {
  workout: Workout;
  onPress?: () => void;
  full?: boolean; // every exercise, not the first three (the day screen)
  selected?: boolean; // set while selecting: a check circle replaces the chevron
  food?: FoodDayTotal; // History's day cards: the day's food in one line, which opens the day
}

export function dayLabel(date: string) {
  const d = parseISO(date);
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMM d');
}

export default function WorkoutCard({ workout, onPress, selected, food, full }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const targets = cardTargets(workout);
  const handlePress = onPress ?? (() => router.push(targets.body));

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole={selected === undefined ? 'button' : 'checkbox'}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      accessibilityHint={selected === undefined ? 'Opens the workout' : undefined}
      accessibilityActions={food ? [{ name: 'day', label: 'Open the day' }] : undefined}
      onAccessibilityAction={() => router.push(targets.food)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <SkyCard style={styles.card}>
        <View pointerEvents="box-only">
          <View style={styles.header}>
            <View style={styles.title}>
              <Text variant="titleMedium" style={{ color: colors.text }}>
                {dayLabel(workout.date)}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                {workoutSummary(workout.exercises)}
              </Text>
            </View>
            {selected === undefined ? (
              <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
            ) : (
              <SymbolView name={selected ? 'checkmark.circle.fill' : 'circle'} size={22} tintColor={selected ? colors.sunrise : colors.textTertiary} />
            )}
          </View>
          <ExerciseRows exercises={workout.exercises} limit={full ? undefined : 3} />
          {workout.notes ? (
            <Text variant="bodySmall" style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
              {workout.notes}
            </Text>
          ) : null}
        </View>
        {food && (
          <Pressable
            onPress={() => router.push(targets.food)}
            accessibilityRole="button"
            accessibilityHint="Opens the day"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <FoodLine food={food} />
          </Pressable>
        )}
      </SkyCard>
    </Pressable>
  );
}

// One quiet line for a day's food under its training. Wraps, never truncates.
export function FoodLine({ food }: { food: FoodDayTotal }) {
  const { colors } = useTheme();
  return (
    <View style={styles.food}>
      <SymbolView name="fork.knife" size={12} tintColor={colors.textTertiary} />
      <Text variant="bodySmall" style={[styles.foodText, { color: colors.textSecondary }]}>{foodDayLine(food)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    flex: 1,
  },
  notes: {
    marginTop: 6,
  },
  food: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  foodText: {
    flexShrink: 1,
  },
});
