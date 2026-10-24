import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { Segmented } from '../components/Glass';
import NumberChip from '../components/NumberChip';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { FOOD_GOAL_NAMES, NO_GOALS, foodGoalFamily, foodGoalRows, foodLogKnows, packFoodGoals, type FoodGoalFamily } from '../services/goals';
import { foodByDay } from '../services/progress';
import { spacing } from '../constants/theme';
import type { FoodGoal } from '../types/workout';

// Each family's usual number, the first time it's turned on
const DEFAULTS: Record<FoodGoalFamily, FoodGoal> = {
  protein: { kind: 'protein', target: 160 },
  calories: { kind: 'cut', target: 2000 },
  lowgi: { kind: 'lowgi', target: 2 },
  fiber: { kind: 'fiber', target: 30 },
};
const ORDER: FoodGoalFamily[] = ['protein', 'calories', 'lowgi', 'fiber'];
const HELP: Record<FoodGoalFamily, string> = {
  protein: 'At least this much a day',
  calories: 'Cutting: stay under this a day. Bulking: reach at least it',
  lowgi: 'Meals a day the food log reads as low glycemic load',
  fiber: 'At least this much a day',
};

// The food goal picker, from Edit goals on Food and the Food goals door: up to four goals, one of each kind,
// each a switch and its number. Protein (else calories) is the main goal the hero, Today and the trend use.
// Fiber and low-GI rows show on Food only once the food log carries those numbers.
export default function FoodGoalsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings, foodEntries } = useWorkoutStore();
  const goals = settings.goals ?? NO_GOALS;
  const rows = foodGoalRows(goals);
  const byFamily = (f: FoodGoalFamily) => rows.find(g => foodGoalFamily(g.kind) === f);
  // Whether any logged food carries fiber or GI numbers yet
  const known = useMemo(() => {
    const totals = foodByDay(foodEntries);
    return { fiber: foodLogKnows(DEFAULTS.fiber, totals), lowgi: foodLogKnows(DEFAULTS.lowgi, totals) };
  }, [foodEntries]);

  const save = (next: FoodGoal[]) => updateSettings({ goals: { ...goals, ...packFoodGoals(next) } });
  const toggle = (f: FoodGoalFamily, on: boolean) => save(on ? [...rows, DEFAULTS[f]] : rows.filter(g => foodGoalFamily(g.kind) !== f));
  const change = (f: FoodGoalFamily, patch: Partial<FoodGoal>) => save(rows.map(g => (foodGoalFamily(g.kind) === f ? ({ ...g, ...patch } as FoodGoal) : g)));

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Food goals" subtitle={rows.length ? `${rows.length} of 4 on` : 'None on yet'} />
        <SkyCard style={styles.tight}>
          {ORDER.map((f, i) => {
            const goal = byFamily(f);
            const kcal = f === 'calories';
            const name = f === 'calories' ? 'Calories' : FOOD_GOAL_NAMES[DEFAULTS[f].kind];
            const note = f === 'fiber' && !known.fiber ? 'Shows on Food once your food log carries fiber numbers' : f === 'lowgi' && !known.lowgi ? 'Shows on Food once your food log carries glycemic-load estimates' : undefined;
            return (
              <View key={f} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }]}>
                <View style={styles.head}>
                  <View style={styles.fill}>
                    <Text variant="bodyLarge" style={{ color: colors.text }}>{name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{HELP[f]}</Text>
                  </View>
                  {goal && (
                    <NumberChip
                      value={goal.target}
                      suffix={kcal ? 'kcal' : f === 'lowgi' ? 'meals' : 'g'}
                      unsure={false}
                      label={`${name} a day`}
                      onChange={v => v !== undefined && change(f, { target: Math.round(v) })} // empty keeps the goal while you retype
                    />
                  )}
                  <Switch value={!!goal} onValueChange={on => toggle(f, on)} trackColor={{ true: colors.food }} accessibilityLabel={`${name} goal`} />
                </View>
                {goal && kcal && (
                  <View style={styles.seg}>
                    <Segmented value={goal.kind as 'cut' | 'bulk'} options={[{ value: 'cut', label: 'Cut' }, { value: 'bulk', label: 'Bulk' }]} onChange={kind => change(f, { kind })} />
                  </View>
                )}
                {note && <Text variant="bodySmall" style={[styles.note, { color: colors.textTertiary }]}>{note}</Text>}
              </View>
            );
          })}
        </SkyCard>
        <Text variant="bodySmall" style={[styles.foot, { color: colors.textTertiary }]}>
          Goals are checked on the days with food logged. Restaurant and homemade foods are estimates, so treat calories as a guide.
        </Text>
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  tight: {
    paddingVertical: spacing.xs,
  },
  row: {
    paddingVertical: 10,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fill: {
    flex: 1,
  },
  seg: {
    marginTop: 2,
  },
  note: {
    marginTop: 2,
  },
  foot: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },
});
