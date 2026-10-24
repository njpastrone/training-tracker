import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useColors } from '../contexts/ThemeContext';
import { fonts, foodCategoryColors, spacing } from '../constants/theme';
import { useFoodPrefs, useWorkoutStore } from '../stores/workoutStore';
import { foodById } from '../data/foods';
import { mealsOf, sumMacros } from '../services/foods';
import { amountLabel } from '../services/foodUnits';
import { calorieLeft, foodTarget } from '../services/goals';
import { scoreMeal, swapQuestion } from '../services/foodPrefs';
import type { FoodEntry, FoodItem } from '../types/food';
import type { FoodGoal, FoodPrefs } from '../types/workout';
import { SectionLabel, SkyCard } from './Sky';
import FoodRows from './FoodRows';
import GoalBar from './GoalBar';
import { Pill } from './Glass';

const n = (v: number) => Math.round(v).toLocaleString('en-US');

// A day's food for the day screen: the goal and its ring, the plain macros, then each meal (one
// logged message) with its foods. Rows are read-only; tapping a food opens its editor in place; Move
// on a meal moves it to another day. Nothing shows on a day with no food.
export default function FoodDay({ entries, goal, onMove }: { entries: FoodEntry[]; goal?: FoodGoal; onMove?: (entry: FoodEntry) => void }) {
  const colors = useColors();
  const removeFoodItem = useWorkoutStore(s => s.removeFoodItem);
  const updateFoodItem = useWorkoutStore(s => s.updateFoodItem);
  const prefs = useFoodPrefs();
  const [open, setOpen] = useState<string | null>(null);
  if (!entries.length) return null;

  const t = sumMacros(entries.flatMap(e => e.items));
  const calories = goal && goal.kind !== 'protein';
  // The numbers the goal header doesn't already say
  const macros = [
    calories || !goal ? `${t.protein} g protein` : '',
    calories ? '' : `${n(t.kcal)} kcal`,
    `${t.carbs} g carbs`,
    `${t.fat} g fat`,
  ].filter(Boolean).join(' · ');

  const remove = (entryId: string, item: FoodItem & { id: string }) =>
    Alert.alert(`Remove ${item.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setOpen(null); removeFoodItem(entryId, item.id); } },
    ]);

  return (
    <View>
      <SectionLabel style={styles.label}>Food</SectionLabel>
      <SkyCard>
        {goal && (
          <View style={styles.goal}>
            <View style={styles.flex}>
              <Text style={[styles.mid, { color: colors.text }]}>
                {calories ? `${n(t.kcal)} kcal` : `${t.protein} g protein`}
                <Text style={[styles.of, { color: colors.textSecondary }]}>{` of ${foodTarget(goal)}`}</Text>
              </Text>
              {calories && <Text style={[styles.faint, { color: colors.textTertiary }]}>{calorieLeft(goal, t.kcal)}</Text>}
            </View>
            <GoalBar goal={goal} day={t} />
          </View>
        )}
        <Text style={[styles.faint, { color: colors.textTertiary }]}>{macros}</Text>

        {mealsOf(entries).map(({ entry, name, time, macros: m }) => (
          <View key={entry.id} style={[styles.meal, { borderTopColor: colors.dim }]}>
            <View style={styles.mealHead}>
              <SectionLabel style={styles.flex}>{`${name} · ${time}`}</SectionLabel>
              <Text style={[styles.faint, { color: colors.textTertiary }]}>{calories ? `${n(m.kcal)} kcal` : `${m.protein} g protein`}</Text>
              {onMove && (
                <Pressable onPress={() => onMove(entry)} accessibilityRole="button" accessibilityLabel={`Move ${name.toLowerCase()} meal to another day`} hitSlop={10}>
                  <Text style={[styles.move, { color: colors.textSecondary }]}>Move</Text>
                </Pressable>
              )}
            </View>
            {entry.items.map(item =>
              open === item.id ? (
                <FoodRows
                  key={item.id}
                  items={[item]}
                  onChange={([next]) => updateFoodItem(entry.id, item.id, next)}
                  onRemove={() => remove(entry.id, item)}
                  onClose={() => setOpen(null)}
                />
              ) : (
                <FoodLine key={item.id} item={item} onPress={() => setOpen(item.id)} />
              )
            )}
            {prefs && <MealCheck items={entry.items} meal={name} prefs={prefs} />}
          </View>
        ))}

        <Text style={[styles.faint, styles.footer, { color: colors.textTertiary }]}>Tap a food to change the amount</Text>
      </SkyCard>
    </View>
  );
}

// A logged meal against your preferences (data/lt-ui-g/report.md §3.6): one quiet line, "Hit 4 of 5 ·
// spike likely · rice", never a grade; when it missed one, Make the swap version asks the coach on Chat
function MealCheck({ items, meal, prefs }: { items: FoodItem[]; meal: string; prefs: FoodPrefs }) {
  const colors = useColors();
  const router = useRouter();
  const card = scoreMeal({ items, eaten: true }, prefs);
  if (!card.of) return null;
  const misses = card.rows.filter(r => r.verdict !== 'hit');
  return (
    <View style={styles.check}>
      <Text style={[styles.faint, { color: colors.textSecondary }]}>
        {card.headline} of your preferences{misses.length ? ` · ${misses.map(r => `${r.label.toLowerCase()} · ${r.why}`).join(', ')}` : ''}
      </Text>
      {misses.length > 0 && (
        <View style={styles.swap}>
          <Pill
            size="small"
            variant="glass"
            icon="fork.knife"
            label="Make the swap version"
            onPress={() => router.navigate({ pathname: '/(tabs)/chat', params: { question: swapQuestion(meal, items.map(i => i.said ?? i.name)) } })}
          />
        </View>
      )}
    </View>
  );
}

// One read-only food: category dot (a ring for the AI's estimates), name and amount, protein and calories
function FoodLine({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  const colors = useColors();
  const food = item.foodId ? foodById.get(item.foodId) : undefined;
  const estimate = item.source === 'estimate';
  const color = foodCategoryColors[food?.category ?? 'other'];
  const amount = amountLabel(item.qty, item.unit, food);
  const kcal = `${estimate ? '≈ ' : ''}${n(item.macros.kcal)} kcal`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${amount}, ${Math.round(item.macros.protein)} grams protein, ${kcal}`}
      accessibilityHint="Opens it to change the amount"
      style={({ pressed }) => [styles.food, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.dot, estimate ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }]} />
      <View style={styles.flex}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        {!!amount && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{amount}</Text>}
      </View>
      <View style={styles.right}>
        <Text style={[styles.value, { color: colors.textSecondary }]}>{Math.round(item.macros.protein)} g</Text>
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{kcal}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  goal: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mid: {
    fontFamily: fonts.rounded,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  of: {
    fontSize: 15,
    fontWeight: '600',
  },
  faint: {
    fontSize: 13,
    lineHeight: 18,
  },
  meal: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 4,
    marginTop: 10,
  },
  mealHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.gap,
  },
  move: {
    fontSize: 13,
    fontWeight: '600',
  },
  food: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingVertical: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  check: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  swap: {
    flexDirection: 'row',
  },
});
