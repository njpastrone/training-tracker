import { createContext, useContext } from 'react';
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewProps } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { SKY } from '../services/sky';
import { fonts, radius, spacing } from '../constants/theme';

// A screen on the sky. Light mode tracks the last 7 days of training (services/sky.ts); Dark Mode is night.
// Native tabs inset the scroll view for the tab bar, so only the top edge is padded by default.
export function SkyScreen({ children, edges = ['top'] }: { children: React.ReactNode; edges?: Edge[] }) {
  const { isDarkMode, sky } = useTheme();
  const stops = isDarkMode ? SKY.night : sky.stops;
  return (
    <View style={[styles.fill, { backgroundColor: stops[3] }]}>
      {/* ponytail: one 45% fade for every screen; the spec's 30% for short headers can come later if History or Settings look washed out */}
      <LinearGradient colors={stops} locations={[0, 0.15, 0.3, 0.45]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={isDarkMode ? ['rgba(42,39,102,0.9)', 'rgba(42,39,102,0)'] : ['rgba(255,248,232,0.75)', 'rgba(255,248,232,0)']}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.35, y: 0.45 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={edges} style={styles.fill}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const SheetContext = createContext(false);

// A tab's one surface under the hero: full width, 32 pt top corners, the card material. Cards inside it
// render as flat sections split by hairlines (SkyCard reads SheetContext), so a tab never stacks cards.
export function SkySheet({ children }: { children: React.ReactNode }) {
  const { colors, reduceTransparency } = useTheme();
  return (
    <View
      style={[
        styles.sheet,
        reduceTransparency ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.card, borderColor: colors.cardLine },
      ]}
    >
      <SheetContext.Provider value={true}>{children}</SheetContext.Provider>
    </View>
  );
}

// A screen's one big number: "2 of 3", an optional sunrise note ("goal met ✓"), and what it counts
export function Hero({ value, of, note, sub }: { value: string; of?: string; note?: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hero} accessible accessibilityLabel={[value, of, note, sub].filter(Boolean).join(' ')}>
      <View style={styles.heroLine}>
        <Text variant="displaySmall" style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
          {value}
          {of ? <Text variant="displaySmall" style={{ color: colors.textTertiary }}>{` ${of}`}</Text> : null}
        </Text>
        {note ? <Text variant="titleMedium" style={{ color: colors.sunrise }}>{note}</Text> : null}
      </View>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{sub}</Text>
    </View>
  );
}

// Content card: standard material over the sky, solid under Reduce Transparency. Inside a SkySheet it's
// a flat section with a hairline under it instead, unless `card` (empty states and first-use prompts stay cards).
export function SkyCard({ style, card, ...props }: ViewProps & { card?: boolean }) {
  const { colors, reduceTransparency } = useTheme();
  const inSheet = useContext(SheetContext);
  if (inSheet && !card) return <View {...props} style={[styles.section, { borderBottomColor: colors.dim }, style]} />;
  return (
    <View
      {...props}
      style={[
        styles.card,
        reduceTransparency
          ? { backgroundColor: colors.surface, borderColor: colors.border }
          : { backgroundColor: colors.card, borderColor: colors.cardLine },
        style,
      ]}
    />
  );
}

// Small caps label for a section or card
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.label, { color: colors.textTertiary }, style]}>
      {children}
    </Text>
  );
}

// The one action on a section label's line ("Edit", "Select"): quiet text, not a button
export function SectionAction({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={10}>
      <Text variant="labelLarge" style={{ color: colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

// The large rounded title at the top of a screen, with an optional subtitle and a small control on the right
export function LargeTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.titleBlock, right ? styles.titleRow : undefined]}>
      <View style={styles.fill} accessibilityRole="header">
        <Text variant="headlineLarge" style={{ color: colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '500' }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: spacing.md,
    paddingHorizontal: 18,
    marginBottom: spacing.gap,
  },
  sheet: {
    marginHorizontal: -spacing.screen,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: 72, // clears the 60 pt fade above the chat bar
    flexGrow: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  section: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, // below, so the first section doesn't double the sheet's edge
  },
  hero: {
    marginBottom: spacing.lg,
    gap: 2,
  },
  heroLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  label: {
    fontFamily: fonts.rounded,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
  titleBlock: {
    marginTop: spacing.gap,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
