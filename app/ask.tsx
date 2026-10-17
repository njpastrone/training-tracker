import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChatScreen } from '../components/ChatBar';
import { UserBubble } from '../components/Chat';
import CoachCard, { ThinkingCard } from '../components/CoachCard';
import { LargeTitle, SkyCard } from '../components/Sky';
import { HeaderButton } from '../components/Glass';
import LogoMark from '../components/LogoMark';
import { useTheme } from '../contexts/ThemeContext';
import { useCoach } from '../hooks/useCoach';
import { toChips } from '../services/suggestions';
import { spacing } from '../constants/theme';

// Questions anyone asks a coach, until the first answer brings its own follow-ups
const STARTERS = toChips(["I've taken a few days off. What should I start with?", 'Suggest high-protein meals from what I usually eat', "How's my week going?", 'What should I train today?']);

// Ask about your training and food: a sheet from Progress (and where a composer reads a question).
// The coach answers from a summary of your last 4 weeks (services/coachPack.ts): one thread per visit.
export default function AskScreen() {
  const { question } = useLocalSearchParams<{ question?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const coach = useCoach();

  // A question typed into a Log or Progress composer arrives already asked
  useEffect(() => {
    if (question) coach.ask(question);
  }, []);

  return (
    <ChatScreen
      bar={{
        value: coach.text,
        onChangeText: coach.setText,
        onSend: () => coach.ask(coach.text),
        placeholder: coach.turns.length ? 'Ask a follow-up…' : 'Ask about your training or food…',
        chips: coach.text.trim() ? [] : coach.turns.length ? toChips(coach.chips) : STARTERS,
        onChip: coach.ask,
        busy: coach.busy,
        error: coach.error,
      }}
      follow
    >
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="xmark" label="Done" onPress={() => router.back()} />,
          headerLeft: coach.turns.length ? () => <HeaderButton icon="arrow.counterclockwise" label="Start over" onPress={coach.startOver} /> : undefined,
        }}
      />
      <LargeTitle title="Ask" subtitle="Answers from your log" />

      {coach.turns.length === 0 && (
        <SkyCard style={styles.hint}>
          <LogoMark size={30} color={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>Ask the coach</Text>
          <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
            It knows what you logged, your goals, what you usually eat and what you've told it to remember. It can suggest a workout or meals you save with a tap. General training information, not medical advice.
          </Text>
        </SkyCard>
      )}

      {coach.turns.map((turn, i) => (
        <View key={i}>
          <UserBubble text={turn.question} />
          {turn.reply ? (
            <CoachCard
              reply={turn.reply}
              cards={turn.cards}
              turn={turn}
              onPlan={workout => coach.plan(i, workout)}
              onLogMeal={(meal, k) => coach.logMeal(i, meal, k)}
              onRemember={yes => coach.remember(i, yes)}
            />
          ) : (
            <ThinkingCard title="Thinking about your log…" />
          )}
        </View>
      ))}
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 22,
  },
  center: {
    textAlign: 'center',
  },
});
