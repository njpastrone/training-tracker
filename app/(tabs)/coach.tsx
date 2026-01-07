import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';

export default function CoachScreen() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="fitness" size={64} color={colors.primary} />
          </View>

          <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
            AI Coach
          </Text>

          <View style={[styles.comingSoonBadge, { backgroundColor: colors.accent }]}>
            <Text variant="labelLarge" style={styles.comingSoonText}>
              Coming Soon
            </Text>
          </View>

          <Text variant="bodyLarge" style={[styles.description, { color: colors.textSecondary }]}>
            Get personalized workout advice, form tips, and training recommendations powered by AI.
          </Text>

          <View style={styles.featureList}>
            <FeatureItem icon="chatbubble-outline" text="Ask workout questions" colors={colors} />
            <FeatureItem icon="analytics-outline" text="Get personalized tips" colors={colors} />
            <FeatureItem icon="bulb-outline" text="Improve your form" colors={colors} />
            <FeatureItem icon="trending-up-outline" text="Optimize your training" colors={colors} />
          </View>
        </Surface>

        <Text variant="bodySmall" style={[styles.footnote, { color: colors.textSecondary }]}>
          We're working hard to bring you the best AI coaching experience. Stay tuned!
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text variant="bodyMedium" style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  comingSoonBadge: {
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
    // color applied dynamically
  },
  footnote: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
