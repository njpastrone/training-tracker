import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Appbar, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../stores/workoutStore';
import { parseWorkout } from '../services/claude';
import { colors, spacing } from '../constants/theme';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuickAddScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const { addWorkout } = useWorkoutStore();
  
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
      const parsed = await parseWorkout(input.trim());

      if (!parsed || parsed.exercises.length === 0) {
        setError('Could not understand the workout. Try being more specific.');
        setIsLoading(false);
        return;
      }

      const workout = {
        id: uuidv4(),
        date: targetDate,
        exercises: parsed.exercises.map((e) => ({ ...e, id: uuidv4() })),
        rawInput: input.trim(),
        muscleGroups: parsed.muscleGroups,
        notes: parsed.notes,
        createdAt: new Date().toISOString(),
      };

      addWorkout(workout);
      router.back();
    } catch (err) {
      console.error('Error parsing workout:', err);
      setError('Failed to log workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Add Workout" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.dateInfo}>
            <Text variant="bodyLarge" style={styles.dateLabel}>
              Adding workout for
            </Text>
            <Text variant="headlineSmall" style={styles.date}>
              {dateLabel}
            </Text>
          </View>

          <TextInput
            mode="outlined"
            placeholder="e.g., Bench press 3x10 @ 185lbs, incline dumbbell press 4x12..."
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (error) setError(null);
            }}
            multiline
            numberOfLines={4}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            disabled={isLoading}
            autoFocus
          />
          
          {error && (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          )}

          <View style={styles.buttons}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={isLoading}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading || !input.trim()}
              style={styles.button}
            >
              {isLoading ? 'Processing...' : 'Log Workout'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  dateInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  dateLabel: {
    color: colors.textSecondary,
  },
  date: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});