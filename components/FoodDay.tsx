import { Alert, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { macroLine, sumMacros } from '../services/foods';
import { SkyCard, SectionLabel } from './Sky';
import FoodRows from './FoodRows';
import type { FoodItem } from '../types/food';

// Everything eaten on a day: protein and calories for the day, then each food, its amount and unit
// editable in place (tap for the rest). Nothing shows on a day with no food.
export default function FoodDay({ date, label = 'Food' }: { date: string; label?: string }) {
  const { colors } = useTheme();
  const entries = useWorkoutStore(s => s.foodEntries);
  const removeFoodItem = useWorkoutStore(s => s.removeFoodItem);
  const updateFoodItem = useWorkoutStore(s => s.updateFoodItem);
  const items = entries.filter(e => e.date === date).reverse().flatMap(e => e.items.map(i => ({ ...i, entryId: e.id })));
  if (!items.length) return null;

  const remove = (i: number) =>
    Alert.alert(`Remove ${items[i].name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFoodItem(items[i].entryId, items[i].id) },
    ]);

  // FoodRows hands back the whole list with one row changed; a swapped food comes back without its ids
  const edit = (next: (FoodItem & { entryId?: string })[]) =>
    next.forEach(({ entryId, ...item }, i) => {
      if (next[i] !== items[i]) updateFoodItem(items[i].entryId, items[i].id, item);
    });

  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>{label}</SectionLabel>
      <SkyCard>
        <Text style={[styles.total, { color: colors.text }]}>{macroLine(sumMacros(items))}</Text>
        <View style={styles.rows}>
          <FoodRows items={items} onChange={edit} onRemove={remove} />
        </View>
      </SkyCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  total: {
    fontFamily: fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rows: {
    marginTop: spacing.sm,
  },
});
