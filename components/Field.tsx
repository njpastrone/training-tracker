import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useColors } from '../contexts/ThemeContext';
import { fonts } from '../constants/theme';

interface Props extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

// A text field on a quiet fill, with a small caps label above it
export default function Field({ label, containerStyle, style, multiline, ...props }: Props) {
  const colors = useColors();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text> : null}
      <TextInput
        {...props}
        multiline={multiline}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: colors.dim, color: colors.text },
          props.editable === false && styles.disabled,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 17,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  disabled: {
    opacity: 0.5,
  },
});
