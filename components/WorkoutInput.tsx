import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { parseWorkout } from '../services/claude';
import { spacing } from '../constants/theme';
import { format } from 'date-fns';

interface WorkoutInputProps {
  initialValue?: string;
  templateId?: string;
  onWorkoutLogged?: () => void;
}

export default function WorkoutInput({ initialValue = '', templateId, onWorkoutLogged }: WorkoutInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addWorkout, markTemplateUsed } = useWorkoutStore();
  const { colors } = useTheme();

  // Set initial value when component mounts or initialValue changes
  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

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
        templateId: templateId, // Add template reference if workout was started from template
      };

      addWorkout(workout);
      
      // Mark template as used if workout was created from template
      if (templateId) {
        try {
          await markTemplateUsed(templateId);
        } catch (error) {
          console.log('Warning: Could not mark template as used:', error);
        }
      }
      
      setInput('');
      
      // Call callback if provided (useful for closing dialogs/modals)
      if (onWorkoutLogged) {
        onWorkoutLogged();
      }
    } catch (err) {
      console.error('Error parsing workout:', err);
      setError('Failed to log workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {templateId && initialValue && (
        <View style={[styles.templateIndicator, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
            ✨ Auto-filled from template - edit as needed
          </Text>
        </View>
      )}
      
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
  templateIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
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
