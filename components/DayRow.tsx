import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useColors } from '../contexts/ThemeContext';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { workoutName } from '../services/format';
import { muscleName } from '../services/goals';
import type { FoodDayTotal } from '../services/progress';
import type { FoodGoal, MuscleGroup, Workout } from '../types/workout';
import { dayLabel } from './WorkoutCard';
import GoalRing from './GoalRing';

interface Props {
  date: string;
  workouts: Workout[]; // that day's, maybe none
  food?: FoodDayTotal;
  goal?: FoodGoal;
  first?: boolean; // no divider above
}

const n = (v: number) => v.toLocaleString('en-US');

// One even row per day, for History's Days and Log's Recent: training (name and muscles), then food
// (the number the food goal doesn't measure, and meals), the goal's number with its ring on the right.
// The whole row opens the day.
export default function DayRow({ date, workouts, food, goal, first }: Props) {
  const colors = useColors();
  const router = useRouter();
  const groups = [...new Set(workouts.flatMap(w => w.muscleGroups))];
  const name = workouts.length ? workoutName(groups) : undefined;
  const calories = goal && goal.kind !== 'protein';
  const meals = food && `${food.meals} meal${food.meals === 1 ? '' : 's'}`;
  const foodLine = food && (calories ? `${food.protein} g protein · ${meals}` : `${n(food.kcal)} kcal · ${meals}`);
  const value = food && (calories ? `${n(food.kcal)} kcal` : `${food.protein} g`);
  return (
    <Pressable
      onPress={() => router.push(`/day/${date}`)}
      accessibilityRole="button"
      accessibilityLabel={[dayLabel(date), name, foodLine && `${value}, ${foodLine}`].filter(Boolean).join(', ')}
      accessibilityHint="Opens the day"
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.text }]}>
          {dayLabel(date)}
          {name ? <Text style={{ color: colors.textSecondary }}>{` · ${name}`}</Text> : null}
        </Text>
        {groups.length > 0 && <MuscleChips groups={groups} />}
        {foodLine && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{foodLine}</Text>}
      </View>
      {food && (
        <View style={styles.right}>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
          {goal && <GoalRing goal={goal} day={food} size={28} />}
        </View>
      )}
      <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
    </Pressable>
  );
}

// "● Chest  ● Shoulders": a dot in each muscle's colour and its name, wrapping
export function MuscleChips({ groups }: { groups: MuscleGroup[] }) {
  const colors = useColors();
  return (
    <View style={styles.chips}>
      {groups.map(g => (
        <View key={g} style={styles.chip}>
          <View style={[styles.dot, { backgroundColor: muscleGroupColors[g] }]} />
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{muscleName(g)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
