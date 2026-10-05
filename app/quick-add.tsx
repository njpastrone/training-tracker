import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { parseWorkout, workoutsFromParse, ApiError } from '../services/claude';
import { spacing } from '../constants/theme';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { Pill } from '../components/Glass';
import Field from '../components/Field';

export default function QuickAddScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const { addWorkout, settings } = useWorkoutStore();
  const { colors } = useTheme();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date || format(new Date(), 'yyyy-MM-dd');
  const dateLabel = date ? format(parseISO(date), 'EEEE, MMMM d') : 'Today';

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('Please enter your workout');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseWorkout(input.trim(), { date: targetDate, unit: settings.weightUnit });

      if (!parsed || parsed.exercises.length === 0) {
        setError('Could not understand the workout. Try being more specific.');
        setIsLoading(false);
        return;
      }

      workoutsFromParse(parsed, input.trim(), targetDate).forEach(addWorkout);
      router.back();
    } catch (err) {
      console.error('Error parsing workout:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to log workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SkyScreen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add Workout' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LargeTitle title={dateLabel} />
          <SkyCard>
            <Field
              placeholder="e.g., Bench press 3x10 @ 185lbs, incline dumbbell press 4x12..."
              value={input}
              onChangeText={(text) => {
                setInput(text);
                if (error) setError(null);
              }}
              multiline
              editable={!isLoading}
              autoFocus
              accessibilityLabel="Your workout"
            />
            {error && (
              <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
          </SkyCard>

          <View style={styles.buttons}>
            <Pill variant="glass" label="Cancel" onPress={() => router.back()} disabled={isLoading} style={styles.button} />
            <Pill
              icon="checkmark"
              label={isLoading ? 'Reading…' : 'Log workout'}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!input.trim()}
              style={styles.button}
            />
          </View>
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
