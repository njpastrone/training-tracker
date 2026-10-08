import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { addDays, format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, foodCategoryColors, spacing } from '../constants/theme';
import { foodById } from '../data/foods';
import { macroLine, setQty, setUnit, sumMacros } from '../services/foods';
import { amountLabel, unitsFor } from '../services/foodUnits';
import type { FoodDraft, FoodItem, Macros } from '../types/food';
import NumberChip from './NumberChip';

type Item = FoodItem & { dayOffset?: number };

interface Props {
  items: Item[];
  onChange?: (items: Item[]) => void; // editable: amount chips, unit switch, estimate numbers, remove
  onRemove?: (index: number) => void; // read-only lists that still let you delete a row
  date?: string; // the logging date, for day tags on multi-day logs
}

// Food rows: dot, name, amount, protein and calories up front; tap a row for carbs, fat, fiber and
// where the numbers come from. USDA rows get a filled category dot; the AI's estimates (branded,
// restaurant, homemade) an open ring and a "≈" on the calories.
export default function FoodRows({ items, onChange, onRemove, date }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  const edit = (i: number, item: Item) => onChange?.(items.map((x, k) => (k === i ? item : x)));
  const remove = (i: number) => (onChange ? onChange(items.filter((_, k) => k !== i)) : onRemove?.(i));

  return (
    <>
      {items.map((item, i) => {
        const food = item.foodId ? foodById.get(item.foodId) : undefined;
        const estimate = item.source === 'estimate';
        const color = foodCategoryColors[food?.category ?? 'other'];
        const day = item.dayOffset && date ? (item.dayOffset === -1 ? 'Yesterday' : format(addDays(parseISO(date), item.dayOffset), 'EEE, MMM d')) : null;
        // A name alone is the default serving: editing starts from it
        const base: Item = item.qty === undefined && food ? { ...item, qty: food.serving.qty, unit: food.serving.unit } : item;
        const units = food ? unitsFor(food) : [];
        return (
          <View key={i} style={[styles.row, { borderTopColor: colors.dim }]}>
            <View style={[styles.dot, estimate ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }]} />
            <View style={styles.flex}>
              <Pressable
                onPress={() => setOpen(open === i ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === i }}
                accessibilityHint="Shows carbs, fat and where the numbers come from"
                style={styles.top}
              >
                <View style={styles.flex}>
                  <Text variant="bodyLarge" style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  {day && <Text variant="labelSmall" style={[styles.dayTag, { color: colors.cobalt, backgroundColor: colors.cobalt + '1A' }]}>{day}</Text>}
                </View>
                <View style={styles.numbers}>
                  <Text style={[styles.protein, { color: colors.text }]}>{Math.round(item.macros.protein)} g protein</Text>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                    {estimate ? '≈ ' : ''}{Math.round(item.macros.kcal).toLocaleString('en-US')} kcal
                  </Text>
                </View>
              </Pressable>

              {onChange ? (
                <View style={styles.amount}>
                  <NumberChip
                    value={base.qty}
                    suffix=""
                    label={`Amount of ${item.name}`}
                    unsure={false}
                    onChange={v => v !== undefined && edit(i, setQty(base, v))}
                  />
                  {units.length > 1 ? (
                    <Pressable
                      onPress={() => edit(i, setUnit(base, units[(units.indexOf(base.unit ?? units[0]) + 1) % units.length]))}
                      accessibilityRole="button"
                      accessibilityLabel={`Unit: ${unitText(base)}. Tap to switch`}
                      hitSlop={6}
                      style={[styles.unit, { backgroundColor: colors.dim }]}
                    >
                      <Text variant="labelLarge" style={{ color: colors.text }}>{unitText(base)}</Text>
                      <SymbolView name="arrow.left.arrow.right" size={11} tintColor={colors.textTertiary} />
                    </Pressable>
                  ) : unitText(base) ? (
                    <Text variant="labelLarge" style={{ color: colors.textSecondary }}>{unitText(base)}</Text>
                  ) : null}
                </View>
              ) : (
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{amountLabel(item.qty, item.unit, food)}</Text>
              )}

              {open === i && (
                <View style={[styles.detail, { backgroundColor: colors.dim }]}>
                  {estimate && onChange ? (
                    <View style={styles.macroChips}>
                      {(['kcal', 'protein', 'carbs', 'fat'] as const).map(k => (
                        <NumberChip
                          key={k}
                          value={item.macros[k]}
                          suffix={k === 'kcal' ? 'kcal' : `g ${k}`}
                          unsure={false}
                          onChange={v => edit(i, { ...item, macros: { ...item.macros, [k]: v ?? 0 } as Macros })}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text variant="bodyMedium" style={{ color: colors.text }}>
                      {`${Math.round(item.macros.carbs)} g carbs · ${Math.round(item.macros.fat)} g fat${item.macros.fiber !== undefined ? ` · ${Math.round(item.macros.fiber)} g fiber` : ''}`}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                    {food
                      ? `USDA${item.grams ? `, ${item.grams} g` : ''}: ${food.source}`
                      : `A best guess from AI${item.said ? ` for “${item.said}”` : ''}. Tap a number to change it.`}
                  </Text>
                </View>
              )}
            </View>
            {(onChange || onRemove) && (
              <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
                <SymbolView name="xmark.circle.fill" size={20} tintColor={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        );
      })}
    </>
  );
}

// The unit part of an amount: "large", "cups", "g"
const unitText = (item: Item) => amountLabel(item.qty, item.unit, item.foodId ? foodById.get(item.foodId) : undefined).replace(/^[\d.,½¼¾⅓⅔⅛\s]+/, '');

// "3 foods · 42 g protein · 520 kcal"
export const foodSummary = (food: FoodDraft) =>
  `${food.items.length} ${food.items.length === 1 ? 'food' : 'foods'} · ${macroLine(sumMacros(food.items))}`;

// One quiet line when some numbers are the AI's guess rather than USDA data
export function EstimateNote({ food }: { food: FoodDraft }) {
  const { colors } = useTheme();
  if (!food.items.some(i => i.source === 'estimate')) return null;
  return (
    <Text variant="bodySmall" style={[styles.note, { color: colors.textTertiary }]}>
      ≈ is a best guess from AI. The rest is USDA data. Tap a row to see or change it.
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    fontWeight: '500',
  },
  dayTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  numbers: {
    alignItems: 'flex-end',
  },
  protein: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  unit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 34,
  },
  detail: {
    gap: 4,
    borderRadius: 12,
    padding: 10,
    marginTop: spacing.sm,
  },
  note: {
    marginTop: spacing.xs,
  },
  macroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
