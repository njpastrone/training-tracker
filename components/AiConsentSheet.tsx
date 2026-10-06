import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useColors } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { setAiConsentAsker } from '../services/aiConsent';
import { SectionLabel } from './Sky';
import { Pill } from './Glass';

const SENT = [
  'What you type in a chat bar or fix box, and the workout card you are fixing',
  'Exercise names: the ones you use and the catalog matches',
  'Your weight unit and the date',
  'When you plan a week: a summary of your recent training and your goals',
];
const NOT_SENT = ['Your full workout history', 'Photos', 'Health data'];

// Asks once, before the first AI call, whether typed text may go to Anthropic. Settings opens it again.
// Mounted once in the root layout; services/aiConsent.ts shows it and remembers the answer.
export default function AiConsentSheet() {
  const colors = useColors();
  const [answer, setAnswer] = useState<((agreed: boolean | null) => void) | null>(null);

  useEffect(() => {
    setAiConsentAsker(() => new Promise(resolve => setAnswer(() => resolve)));
    return () => setAiConsentAsker(null);
  }, []);

  const reply = (agreed: boolean | null) => {
    answer?.(agreed);
    setAnswer(null);
  };

  const list = (items: string[]) =>
    items.map(item => (
      <Text key={item} variant="bodyLarge" style={[styles.item, { color: colors.text }]}>
        {`•  ${item}`}
      </Text>
    ));

  return (
    <Modal visible={!!answer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => reply(null)}>
      <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={{ color: colors.text }} accessibilityRole="header">
          Use AI to read your logs?
        </Text>
        <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
          LiftText sends what you type to Anthropic's Claude AI, through our server, to turn it into exercises, sets and reps.
        </Text>

        <View style={styles.section}>
          <SectionLabel>What's sent</SectionLabel>
          {list(SENT)}
        </View>
        <View style={styles.section}>
          <SectionLabel>What's not sent</SectionLabel>
          {list(NOT_SENT)}
        </View>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          Our server stores nothing but a count of requests each day. Your workouts stay saved on this phone.
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          Not now keeps AI off: each line or comma you type becomes an exercise you fill in by hand. You can change this anytime in Settings.
        </Text>

        <View style={styles.buttons}>
          <Pill label="Agree" onPress={() => reply(true)} />
          <Pill label="Not now" variant="glass" onPress={() => reply(false)} />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.screen,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  item: {
    paddingLeft: spacing.xs,
  },
  buttons: {
    gap: spacing.gap,
    marginTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
