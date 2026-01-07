import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { parseWorkout } from '../services/claude';
import { spacing } from '../constants/theme';
import { format } from 'date-fns';

export default function WorkoutInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addWorkout } = useWorkoutStore();
  const { colors } = useTheme();

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
        date: format(new Date(), 'yyyy-MM-dd'),
        exercises: parsed.exercises.map((e) => ({ ...e, id: uuidv4() })),
        rawInput: input.trim(),
        muscleGroups: parsed.muscleGroups,
        notes: parsed.notes,
        createdAt: new Date().toISOString(),
      };

      addWorkout(workout);
      setInput('');
    } catch (err) {
      console.error('Error parsing workout:', err);
      setError('Failed to log workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        placeholder="e.g., Just hit chest - bench press 3x10, incline dumbbell press, cable flyes"
        value={input}
        onChangeText={(text) => {
          setInput(text);
          if (error) setError(null);
        }}
        multiline
        numberOfLines={3}
        style={[styles.input, { backgroundColor: colors.background }]}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        disabled={isLoading}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading || !input.trim()}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {isLoading ? 'Processing with AI...' : 'Log Workout'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  input: {
    // backgroundColor applied dynamically
  },
  button: {
    marginTop: spacing.xs,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});
