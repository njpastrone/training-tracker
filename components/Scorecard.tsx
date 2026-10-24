import { PixelRatio, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import type { Scorecard as Card, Verdict } from '../services/foodPrefs';

const ICON: Record<Verdict, SFSymbol> = { hit: 'checkmark.circle.fill', miss: 'minus.circle', unknown: 'questionmark.circle' };

// A meal checked against your food preferences (services/foodPrefs.ts): "Likely hits 4 of 5", then one
// short row per preference, a sunrise ✓ for a hit, a warning dash for a miss, grey for unknown, never red
// and never a grade. Two columns; one above 130% text.
export default function Scorecard({ card }: { card: Card }) {
  const { colors } = useTheme();
  if (!card.of) return null;
  const tint: Record<Verdict, string> = { hit: colors.sunrise, miss: colors.warning, unknown: colors.textTertiary };
  const oneColumn = PixelRatio.getFontScale() > 1.3;
  return (
    <View accessible accessibilityLabel={`${card.headline} of your preferences. ${card.rows.map(r => `${r.label}, ${r.why}: ${r.verdict}`).join('. ')}`}>
      <Text variant="bodyMedium" style={{ color: colors.text }}>
        <Text style={styles.bold}>{card.headline}</Text> of your preferences
      </Text>
      <View style={styles.grid}>
        {card.rows.map(r => (
          <View key={r.pref} style={[styles.cell, oneColumn && styles.full]}>
            <SymbolView name={ICON[r.verdict]} size={16} tintColor={tint[r.verdict]} />
            <Text variant="bodySmall" style={[styles.text, { color: colors.text }]}>
              {r.label}
              <Text style={{ color: colors.textSecondary }}> · {r.why}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  cell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingRight: spacing.sm,
  },
  full: {
    width: '100%',
  },
  text: {
    flexShrink: 1,
  },
});
