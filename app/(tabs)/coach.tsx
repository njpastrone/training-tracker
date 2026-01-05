import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

export default function CoachScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.iconContainer}>
            <Ionicons name="fitness" size={64} color={colors.primary} />
          </View>

          <Text variant="headlineMedium" style={styles.title}>
            AI Coach
          </Text>

          <View style={styles.comingSoonBadge}>
            <Text variant="labelLarge" style={styles.comingSoonText}>
              Coming Soon
            </Text>
          </View>

          <Text variant="bodyLarge" style={styles.description}>
            Get personalized workout advice, form tips, and training recommendations powered by AI.
          </Text>

          <View style={styles.featureList}>
            <FeatureItem icon="chatbubble-outline" text="Ask workout questions" />
            <FeatureItem icon="analytics-outline" text="Get personalized tips" />
            <FeatureItem icon="bulb-outline" text="Improve your form" />
            <FeatureItem icon="trending-up-outline" text="Optimize your training" />
          </View>
        </Surface>

        <Text variant="bodySmall" style={styles.footnote}>
          We're working hard to bring you the best AI coaching experience. Stay tuned!
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text variant="bodyMedium" style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  comingSoonBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  featureText: {
    color: colors.text,
  },
  footnote: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
