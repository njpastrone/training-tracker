import { ActivityIndicator, Pressable, StyleProp, StyleSheet, TextInput, View, ViewProps, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, radius, shadows } from '../constants/theme';
import LogoMark from './LogoMark';

const liquidGlass = isLiquidGlassAvailable();

// Liquid Glass for controls (never content). Translucent before iOS 26, solid under Reduce Transparency.
export function GlassSurface({ style, interactive, ...props }: ViewProps & { interactive?: boolean }) {
  const { colors, reduceTransparency } = useTheme();
  if (liquidGlass && !reduceTransparency) {
    return <GlassView {...props} isInteractive={interactive} style={style} />;
  }
  return (
    <View
      {...props}
      style={[
        reduceTransparency
          ? { backgroundColor: colors.surface, borderColor: colors.border }
          : { backgroundColor: colors.glass, borderColor: colors.glassLine },
        styles.fallbackEdge,
        style,
      ]}
    />
  );
}

interface PillProps {
  label: string;
  onPress: () => void;
  icon?: SFSymbol | 'logo'; // 'logo' is the LiftText mark, used for AI actions
  variant?: 'filled' | 'glass';
  disabled?: boolean;
  loading?: boolean;
  size?: 'regular' | 'small';
  style?: StyleProp<ViewStyle>;
}

// 50 pt pill button: sunrise for the main action, glass for the rest
export function Pill({ label, onPress, icon, variant = 'filled', disabled, loading, size = 'regular', style }: PillProps) {
  const { colors } = useTheme();
  const filled = variant === 'filled';
  const fg = filled ? colors.onSunrise : colors.text;
  const small = size === 'small';
  const content = (
    <View style={styles.pillContent}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon === 'logo' ? (
        <LogoMark size={small ? 15 : 19} color={fg} />
      ) : icon ? (
        <SymbolView name={icon} size={small ? 14 : 18} weight="bold" tintColor={fg} />
      ) : null}
      <Text style={[styles.pillLabel, small && styles.pillLabelSmall, { color: fg }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [small ? styles.pillSmall : styles.pill, { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {filled ? (
        <View style={[styles.pillInner, small && styles.pillInnerSmall, { backgroundColor: colors.sunrise }]}>{content}</View>
      ) : (
        <GlassSurface interactive style={[styles.pillInner, small && styles.pillInnerSmall]}>
          {content}
        </GlassSurface>
      )}
    </Pressable>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Two or three options in a capsule, the chosen one lifted on a card
export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.dim }]} accessibilityRole="tablist">
      {options.map(option => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: colors.surface }, on && shadows.float]}
          >
            <Text style={[styles.segmentLabel, { color: on ? colors.text : colors.textSecondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A symbol button for the navigation bar; iOS 26 puts it on glass
export function HeaderButton({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.headerButton}>
      <SymbolView name={icon} size={20} weight="medium" tintColor={colors.text} />
    </Pressable>
  );
}

interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  busy?: boolean;
  disabled?: boolean;
}

// Messages-style glass capsule. Dictation is the keyboard's mic key.
export function Composer({ value, onChangeText, onSend, placeholder, busy, disabled }: ComposerProps) {
  const { colors } = useTheme();
  const canSend = !!value.trim() && !busy && !disabled;
  return (
    <GlassSurface
      style={[
        styles.composer,
        shadows.float,
        busy && { borderColor: colors.sunriseSoft, borderWidth: 1.5, shadowColor: colors.sunriseSoft, shadowOpacity: 0.5 },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        editable={!busy && !disabled}
        style={[styles.composerInput, { color: colors.text }]}
        accessibilityLabel={placeholder}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        style={[styles.send, { backgroundColor: colors.sunrise, opacity: canSend || busy ? 1 : 0.4 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.onSunrise} />
        ) : (
          <SymbolView name="arrow.up" size={18} weight="bold" tintColor={colors.onSunrise} />
        )}
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontFamily: fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEdge: {
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pill: {
    minHeight: 50,
  },
  pillInner: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.control,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  pillSmall: {
    minHeight: 36,
  },
  pillInnerSmall: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillLabelSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pillLabel: {
    fontFamily: fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 52,
    borderRadius: radius.control,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    maxHeight: 120,
    paddingTop: 9,
    paddingBottom: 9,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
