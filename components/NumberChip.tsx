import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../constants/theme';

// A number you can tap to edit; empty clears it
export default function NumberChip({ value, suffix, unsure, onChange, onFocus, onBlur, label }: { value?: number | string; suffix: string; unsure: boolean; onChange: (v: number | undefined) => void; onFocus?: () => void; onBlur?: () => void; label?: string }) {
  const { colors } = useTheme();
  const shown = value === undefined ? '' : String(value);
  const current = typeof value === 'string' ? parseFloat(value) : value;
  const [text, setText] = useState(shown);
  useEffect(() => setText(t => (toNumber(t) === current ? t : shown)), [value]);

  const edit = (t: string) => {
    setText(t);
    const next = toNumber(t);
    if (next !== current) onChange(next);
  };

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.dim },
        unsure && [styles.unsure, { backgroundColor: colors.warning + '22', borderColor: colors.warning }],
      ]}
    >
      <TextInput
        value={text}
        onChangeText={edit}
        onEndEditing={() => setText(shown)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="–"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`${label ?? suffix}${unsure ? ', please check' : ''}`}
        accessibilityHint="Edits this number"
        style={[styles.chipInput, { color: colors.text }]}
      />
      {suffix ? <Text variant="labelMedium" style={{ color: colors.textSecondary }}>{suffix}</Text> : null}
    </View>
  );
}

// Empty or not a positive number clears the value
function toNumber(text: string) {
  const n = parseFloat(text.replace(',', '.'));
  return text.trim() === '' || !(n > 0) ? undefined : n;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 34,
  },
  chipInput: {
    minWidth: 22,
    fontFamily: fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 6,
  },
  unsure: {
    borderWidth: 1.5,
  },
});
