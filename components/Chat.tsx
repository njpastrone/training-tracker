import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../constants/theme';
import LogoMark from './LogoMark';

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

// The coach's message: a LiftText-mark avatar and a glass bubble on the left
export function CoachBubble({ text, muted }: { text: string; muted?: boolean }) {
  const { colors, reduceTransparency } = useTheme();
  return (
    <View style={styles.coachRow}>
      <LinearGradient colors={[colors.sunriseSoft, colors.sunrise]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        <LogoMark size={15} color={colors.onSunrise} />
      </LinearGradient>
      <View
        style={[
          styles.coach,
          reduceTransparency
            ? { backgroundColor: colors.surface, borderColor: colors.border }
            : { backgroundColor: colors.glass, borderColor: colors.glassLine },
        ]}
      >
        <Text variant="bodyLarge" style={{ color: muted ? colors.textSecondary : colors.text }}>
          {text}
        </Text>
      </View>
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
  coachRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    maxWidth: '92%',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coach: {
    flexShrink: 1,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
});
