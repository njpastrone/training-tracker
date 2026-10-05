import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLogDraft } from '../hooks/useLogDraft';
import { spacing } from '../constants/theme';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { Pill } from '../components/Glass';
import { UserBubble } from '../components/Chat';
import ParsedCard from '../components/ParsedCard';
import Field from '../components/Field';

// Log a workout for a given day: type it, review the parsed card, Save
export default function QuickAddScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const targetDate = date || format(new Date(), 'yyyy-MM-dd');
  const dateLabel = date ? format(parseISO(date), 'EEEE, MMMM d') : 'Today';
  const log = useLogDraft({ date: targetDate, onLogged: () => router.back() });

  return (
    <SkyScreen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add Workout' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LargeTitle title={dateLabel} />

          {log.sent && <UserBubble text={log.sent} />}

          {log.draft ? (
            <ParsedCard
              draft={log.draft}
              date={targetDate}
              onChange={log.setDraft}
              onSave={log.save}
              onDiscard={log.discard}
              onFix={log.fix}
              busy={log.busy}
              error={log.error}
            />
          ) : (
            <>
              <SkyCard>
                <Field
                  placeholder="e.g., Bench press 3x10 @ 185lbs, incline dumbbell press 4x12..."
                  value={log.text}
                  onChangeText={log.setText}
                  multiline
                  editable={!log.busy}
                  autoFocus
                  accessibilityLabel="Your workout"
                />
                {log.error && (
                  <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
                    {log.error}
                  </Text>
                )}
              </SkyCard>

              <View style={styles.buttons}>
                <Pill variant="glass" label="Cancel" onPress={() => router.back()} disabled={!!log.busy} style={styles.button} />
                <Pill
                  icon="sparkles"
                  label={log.busy === 'parse' ? 'Reading…' : 'Read it'}
                  onPress={log.parse}
                  loading={log.busy === 'parse'}
                  disabled={!log.text.trim()}
                  style={styles.button}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
  },
  error: {
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
  },
});
