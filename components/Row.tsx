import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { useColors } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

interface Props {
  icon: SFSymbol;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  first?: boolean; // no divider above
}

// A settings-style row inside a SkyCard: symbol, title, optional subtitle and accessory
export default function Row({ icon, title, subtitle, right, onPress, destructive, disabled, first }: Props) {
  const colors = useColors();
  const tint = destructive ? colors.error : colors.sunrise;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        (pressed || disabled) && styles.dim,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.dim }]}>
        <SymbolView name={icon} size={17} weight="semibold" tintColor={tint} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyLarge" style={{ color: destructive ? colors.error : colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  dim: {
    opacity: 0.5,
  },
});
