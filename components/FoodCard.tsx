import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import type { FoodDraft } from '../types/food';
import { SkyCard } from './Sky';
import { Pill } from './Glass';
import LogoMark from './LogoMark';
import FoodRows, { EstimateNote, foodSummary } from './FoodRows';
import { FixBox, FixReply, type FixReplyState } from './ParsedCard';

interface Props {
  food: FoodDraft;
  date: string;
  onChange: (food: FoodDraft) => void;
  onSave: () => void;
  onDiscard: () => void;
  onFix?: (fix: string) => Promise<boolean>; // its own fix box; chat tabs fix through their chat bar instead
  busy: 'parse' | 'fix' | 'save' | null;
  error?: string | null;
  reply?: FixReplyState | null;
}

// What the user ate, reviewed before saving, like ParsedCard for a workout: tap an amount to change
// it, tap a row for the rest of the numbers, fix by typing in the chat bar, Save.
export default function FoodCard({ food, date, onChange, onSave, onDiscard, onFix, busy, error, reply }: Props) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} layout={LinearTransition}>
      <SkyCard>
        <View style={styles.header}>
          <LogoMark size={20} color={colors.sunrise} />
          <Text variant="titleMedium" style={[styles.flex, { color: colors.text }]}>Got it. Look right?</Text>
        </View>
        <Text variant="bodyMedium" style={[styles.summary, { color: colors.textSecondary }]}>
          {foodSummary(food)}
        </Text>
        {food.confidence < 0.6 && (
          <View style={[styles.banner, { backgroundColor: colors.warning + '1A' }]} accessibilityLiveRegion="polite">
            <SymbolView name="exclamationmark.triangle" size={16} tintColor={colors.warning} />
            <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>
              I wasn't sure about parts of this. Check it before you save.
            </Text>
          </View>
        )}
        <FoodRows items={food.items} onChange={items => onChange({ ...food, items })} date={date} />
        <EstimateNote food={food} />
        <View style={styles.actions}>
          <Pill icon="checkmark" label="Save" onPress={onSave} loading={busy === 'save'} disabled={!!busy || food.items.length === 0} style={styles.save} />
          <Pill variant="glass" label="Discard" onPress={onDiscard} disabled={!!busy} style={styles.discard} />
        </View>
        {onFix && <FixBox onFix={onFix} busy={busy === 'fix'} disabled={!!busy} placeholder={'Fix or ask: "it was 3 eggs, not 2"'} />}
        {reply ? <FixReply reply={reply} /> : null}
        {error ? (
          <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}
      </SkyCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summary: {
    marginLeft: 28,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    padding: spacing.gap,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  save: {
    flex: 2,
  },
  discard: {
    flex: 1,
  },
  error: {
    marginTop: spacing.sm,
  },
});
