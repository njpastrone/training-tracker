import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, radius, spacing } from '../constants/theme';
import type { CoachLine as Line } from '../services/coachLine';

// The twins' shared pieces (DESIGN-SYSTEM.md, "Training and Food are twins"): each tab paints its hue
// in four places only, the glow, the hero card, the tab icon and the send button. Everything else is a plain card.

export type Hue = 'train' | 'food';

export function useHue(hue: Hue) {
  const { colors } = useTheme();
  return hue === 'train'
    ? { main: colors.sunrise, a: colors.trainA, b: colors.trainB, soft: colors.trainSoft }
    : { main: colors.food, a: colors.foodA, b: colors.foodB, soft: colors.foodSoft };
}

// The one bold card on a tab: a gradient from the hue's dark end to its light end, white type
export function HueCard({ hue, style, label, children }: { hue: Hue; style?: StyleProp<ViewStyle>; label?: string; children: React.ReactNode }) {
  const h = useHue(hue);
  return (
    <LinearGradient
      colors={[h.a, h.b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={[styles.hero, { shadowColor: h.a }, style]}
      accessible={!!label}
      accessibilityLabel={label}
    >
      {children}
    </LinearGradient>
  );
}

// A ring that fills clockwise from the top: a share of the goal done
export function Ring({ size, stroke, progress, track, color, children }: { size: number; stroke: number; progress: number; track: string; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotated}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {progress > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, progress)} ${c}`} />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export type DiscState = 'rest' | 'on' | 'plan' | 'future';

// One day in a hero's week strip, 34 pt: filled white when done, dashed when planned, dim in the future,
// a ring of the day's share when `ring` is given, and an outline around today
export function Disc({ label, state, today, ring, hue }: { label: string; state: DiscState; today?: boolean; ring?: number; hue: Hue }) {
  const { colors } = useTheme();
  const h = useHue(hue);
  const inner =
    ring !== undefined ? (
      <Ring size={34} stroke={3} progress={ring} track={colors.heroTrack} color={colors.onHero}>
        <Text style={[styles.discText, { color: colors.onHero }]} maxFontSizeMultiplier={1.3}>{label}</Text>
      </Ring>
    ) : (
      <View
        style={[
          styles.disc,
          state === 'on' && { backgroundColor: colors.onHero },
          state === 'rest' && { backgroundColor: colors.heroTrack },
          state === 'future' && { backgroundColor: 'rgba(255,255,255,0.1)' },
          state === 'plan' && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.onHero },
        ]}
      >
        <Text style={[styles.discText, { color: state === 'on' ? h.a : state === 'future' ? colors.onHeroSoft : colors.onHero }]} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      </View>
    );
  return <View style={[styles.discBox, today && { borderColor: colors.onHero }]}>{inner}</View>;
}

// Monday-first strip of seven discs with the day letters above; every day can open its day screen
export function WeekStrip({ days }: { days: { key: string; letter: string; today: boolean; disc: React.ReactNode; label: string; onPress?: () => void }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.strip}>
      {days.map(d => (
        <Pressable key={d.key} onPress={d.onPress} disabled={!d.onPress} accessibilityRole={d.onPress ? 'button' : undefined} accessibilityLabel={d.label} style={styles.stripDay}>
          <Text style={[styles.letter, { color: d.today ? colors.onHero : colors.onHeroSoft }]}>{d.letter}</Text>
          {d.disc}
        </Pressable>
      ))}
    </View>
  );
}

// The small caps label that names every block: "THIS WEEK", "TODAY BY MEAL"
export function Caps({ children, onHero }: { children: string; onHero?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.caps, { color: onHero ? colors.onHeroSoft : colors.textTertiary }]}>
      {children}
    </Text>
  );
}

// "Month ›", "All 17 ›": the one quiet action on a block's first line
export function Link({ label, onPress, onHero, accessibilityLabel }: { label: string; onPress: () => void; onHero?: boolean; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={10}>
      <Text style={[styles.link, { color: onHero ? colors.onHeroSoft : colors.textTertiary }]}>{label} ›</Text>
    </Pressable>
  );
}

// A block's first line: its caps label and, on the right, a link or a number
export function CardHead({ label, right, onHero }: { label: string; right?: React.ReactNode; onHero?: boolean }) {
  return (
    <View style={styles.head}>
      <Caps onHero={onHero}>{label}</Caps>
      {typeof right === 'string' ? <Text style={[styles.headValue, { color: useTheme().colors.textTertiary }]}>{right}</Text> : right}
    </View>
  );
}

// One coach sentence, the lead in bold after the coach's indigo sparkle; written on the phone, no model.
// `inset` sits it under a hairline inside a card; with `onPress` it opens more (the check-in's wins and next 7 days)
export function CoachLine({ line, inset, onPress, open, children }: { line: Line; inset?: boolean; onPress?: () => void; open?: boolean; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const body = (
    <View style={styles.coachRow}>
      <SymbolView name="sparkles" size={18} tintColor={colors.indigo} fallback={<MaterialIcons name="auto-awesome" size={18} color={colors.indigo} />} style={styles.sparkle} />
      <Text style={[styles.coachText, { color: colors.textSecondary }]}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{line.lead}</Text>
        {line.rest ? ` ${line.rest}` : ''}
      </Text>
    </View>
  );
  return (
    <View style={[inset ? styles.coachInset : styles.coach, inset && { borderTopColor: colors.dim }]}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityHint="Shows wins and the next 7 days" style={({ pressed }) => pressed && styles.pressed}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      {open && children}
    </View>
  );
}

export interface Door {
  sf: SFSymbol;
  md: string; // the Material icon shown where SF Symbols aren't (web, Android)
  label: string;
  onPress: () => void;
}

// "More": a row of small doors, each a screen that exists, its icon in the tab's hue
export function Doors({ hue, doors }: { hue: Hue; doors: Door[] }) {
  const { colors, reduceTransparency } = useTheme();
  const h = useHue(hue);
  const [wide, setWide] = useState(true);
  return (
    <View style={[styles.doors, !wide && styles.doorsWrap]} onLayout={e => setWide(e.nativeEvent.layout.width / doors.length >= 60)}>
      {doors.map(d => (
        <Pressable
          key={d.label}
          onPress={d.onPress}
          accessibilityRole="button"
          accessibilityLabel={d.label}
          style={({ pressed }) => [
            styles.door,
            !wide && styles.doorWide,
            reduceTransparency ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.card, borderColor: colors.cardLine },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView name={d.sf} size={22} tintColor={h.main} fallback={<MaterialIcons name={d.md} size={22} color={h.main} />} style={styles.doorIcon} />
          <Text style={[styles.doorLabel, { color: colors.textSecondary }]}>{d.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.gap,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  rotated: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discText: {
    fontFamily: fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  strip: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginHorizontal: -4,
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  letter: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  caps: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 20,
  },
  headValue: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  coach: {
    marginTop: spacing.xs,
    marginBottom: spacing.gap,
    marginHorizontal: 6,
  },
  coachInset: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 24,
  },
  sparkle: {
    width: 18,
    height: 18,
    marginTop: 1,
  },
  coachText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  doors: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.gap,
  },
  doorsWrap: {
    flexWrap: 'wrap',
  },
  door: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  doorWide: {
    flexBasis: '47%',
  },
  doorIcon: {
    width: 22,
    height: 22,
  },
  doorLabel: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
