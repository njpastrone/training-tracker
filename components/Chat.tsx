import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../constants/theme';

// Your message: a sunrise bubble on the right, Messages-style
export function UserBubble({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.user, { backgroundColor: colors.sunrise }]}>
      <Text variant="bodyLarge" style={{ color: colors.onSunrise }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  user: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    borderRadius: radius.bubble,
    borderBottomRightRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
});
