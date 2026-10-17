import { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useColors } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { legalUrl, setAiConsentAsker, type AiConsentAnswer } from '../services/aiConsent';
import { SectionLabel } from './Sky';
import { Pill } from './Glass';
import LogoMark from './LogoMark';

const SENT = [
  'What you type in a chat bar or fix box, and the workout or food card you are fixing',
  'Anything you type, including notes like pain or injuries',
  'Exercise names: the ones you use and the catalog matches',
  'Food names from the built-in food list that match what you typed',
  'Your weight unit and the date',
  'When you plan a week: a summary of your recent training and your goals',
  'When you ask the coach: a summary of your last 4 weeks of training and food (the numbers on Progress), your goals, the things you asked it to remember, your question, your earlier questions to it that day with its answers, and what the question needs (one exercise\'s history, a day\'s meals)',
  'A random ID for this phone',
];
const NOT_SENT = ['Your full workout or food history: only a summary and what a question needs', 'Who you are', 'Photos', 'Apple Health data'];

// Asks once, before the first AI call, whether typed text may go to Anthropic, and whether the user is
// 18 or older (AI is 18+; under 18 it stays off). Settings opens it again.
// Mounted once in the root layout; services/aiConsent.ts shows it and remembers the answer.
export default function AiConsentSheet() {
  const colors = useColors();
  const [answer, setAnswer] = useState<((reply: AiConsentAnswer | null) => void) | null>(null);

  useEffect(() => {
    setAiConsentAsker(() => new Promise(resolve => setAnswer(() => resolve)));
    return () => setAiConsentAsker(null);
  }, []);

  const reply = (r: AiConsentAnswer | null) => {
    answer?.(r);
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
        <LogoMark size={44} color={colors.sunrise} />
        <Text variant="headlineSmall" style={{ color: colors.text }} accessibilityRole="header">
          Use AI to read your logs?
        </Text>
        <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
          LiftText sends what you type to Anthropic's Claude AI, through our server, to turn it into exercises, sets and reps, the food you ate into amounts and macros, and to answer questions about your training and food.
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
          Anthropic deletes it within 30 days and doesn't use it to train its AI. Our server never stores what you type: it keeps daily request counts per phone (using a random ID, deleted after 2 days) and request logs without your text for 7 days. Your workouts and food stay saved on this phone.
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          AI is for people 18 and older. Under 18, or with Not now, AI stays off: each line or comma you type becomes an exercise you fill in by hand, common foods are looked up on this phone, and nothing you type leaves it. You can change this anytime in Settings.
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(legalUrl('privacy'))}>
          Read the privacy policy
        </Text>

        <View style={styles.buttons}>
          <Pill label="I'm 18 or older, agree" onPress={() => reply('granted')} />
          <Pill label="I'm under 18" variant="glass" onPress={() => reply('under18')} />
          <Pill label="Not now" variant="glass" onPress={() => reply('declined')} />
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
