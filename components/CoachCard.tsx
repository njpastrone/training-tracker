import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { SkyCard } from './Sky';
import LogoMark from './LogoMark';
import type { CoachReply } from '../services/ask';

// The coach's answer: headline, the answer, and the facts from your log it rests on
export default function CoachCard({ reply }: { reply: CoachReply }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)}>
      <SkyCard accessibilityLiveRegion="polite">
        <View style={styles.top}>
          <LogoMark size={18} color={colors.sunrise} />
          {reply.headline ? (
            <Text variant="titleMedium" style={[styles.fill, { color: colors.text }]}>{reply.headline}</Text>
          ) : null}
        </View>
        <Text variant="bodyLarge" style={[styles.answer, { color: colors.text }]}>{reply.answer}</Text>
        {reply.fromLog ? (
          <Text variant="bodySmall" style={[styles.fromLog, { color: colors.textTertiary }]}>From your log: {reply.fromLog}</Text>
        ) : null}
      </SkyCard>
    </Animated.View>
  );
}

// Shown while the AI reads the log or thinks about an answer
export function ThinkingCard({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut}>
      <SkyCard>
        <View style={styles.top}>
          <LogoMark size={18} color={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>{title}</Text>
        </View>
        {[0.88, 0.72, 0.8].map(w => (
          <View key={w} style={[styles.skeleton, { width: `${w * 100}%`, backgroundColor: colors.dim }]} />
        ))}
      </SkyCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  answer: {
    marginTop: spacing.xs,
  },
  fromLog: {
    marginTop: spacing.sm,
  },
  skeleton: {
    height: 12,
    borderRadius: 6,
    marginTop: 10,
  },
});
