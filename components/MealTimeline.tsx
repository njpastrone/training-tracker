import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../constants/theme';
import { layoutMeals, type MealBubble } from '../services/week';

const GAP = 72; // pt between bubble centres, so names never overlap
const TICKS: [string, number][] = [['6 am', 0.04], ['2 pm', 0.5], ['10 pm', 0.96]];

// Today by meal: one mint bubble per meal on a 6 am – 10 pm axis, sized by its protein, the grams
// inside, name and time beneath, and a dashed bubble for what's left where the next meal usually lands
export default function MealTimeline({ bubbles }: { bubbles: MealBubble[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const xs = layoutMeals(bubbles.map(b => b.hour), width, GAP);
  const said = bubbles.map(b => `${b.name} ${b.grams} g${b.toGo ? ' to go' : ` at ${b.time}`}`).join(', ');
  return (
    <View style={styles.timeline} onLayout={e => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={`By meal: ${said}`}>
      <View style={[styles.axis, { backgroundColor: colors.dim }]} />
      {TICKS.map(([label, at]) => (
        <Text key={label} style={[styles.tick, { left: `${at * 100}%`, color: colors.textTertiary }]} numberOfLines={1}>{label}</Text>
      ))}
      {width > 0 &&
        bubbles.map((b, i) => {
          const d = 2 * (18 + 12 * Math.min(1, b.grams / 60));
          return (
            <View key={`${b.name}-${i}`}>
              <View
                style={[
                  styles.bubble,
                  { left: xs[i] - d / 2, top: AXIS - d, width: d, height: d, borderRadius: d / 2 },
                  b.toGo ? { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.food } : { backgroundColor: colors.food },
                ]}
              >
                <Text style={[styles.grams, { color: b.toGo ? colors.food : colors.onHero, fontSize: d >= 56 ? 18 : d >= 48 ? 15 : 13 }]} maxFontSizeMultiplier={1.2}>
                  {b.grams}
                </Text>
              </View>
              <View style={[styles.label, { left: xs[i] - GAP / 2, width: GAP }]}>
                <Text style={[styles.name, { color: colors.text }]} maxFontSizeMultiplier={1.3}>{b.name}</Text>
                <Text style={[styles.time, { color: colors.textTertiary }]} maxFontSizeMultiplier={1.3}>{b.time}</Text>
              </View>
            </View>
          );
        })}
    </View>
  );
}

const AXIS = 62;

const styles = StyleSheet.create({
  timeline: {
    height: 108,
    marginTop: 8,
  },
  axis: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: AXIS,
    height: 2,
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    top: AXIS + 4,
    width: 40,
    textAlign: 'center',
    fontFamily: fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    transform: [{ translateX: -20 }],
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grams: {
    fontFamily: fonts.rounded,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  label: {
    position: 'absolute',
    top: AXIS + 18,
    alignItems: 'center',
  },
  name: {
    fontFamily: fonts.rounded,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
});
