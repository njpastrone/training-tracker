import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { parseWorkout } from '../services/claude';
import { spacing } from '../constants/theme';
import { format } from 'date-fns';

interface WorkoutInputProps {
  initialValue?: string;
  templateId?: string;
  templateExercises?: any; // Pre-structured exercises from template
  onWorkoutLogged?: () => void;
}

export default function WorkoutInput({ initialValue = '', templateId, templateExercises, onWorkoutLogged }: WorkoutInputProps) {
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
    // If we have pre-structured template exercises, skip validation on empty input
    if (!templateExercises && !input.trim()) {
      setError('Please enter your workout');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let parsed;
      
      // If we have pre-structured template exercises, use them directly
      if (templateExercises) {
        parsed = templateExercises;
      } else {
        // Otherwise, parse the natural language input with AI
        parsed = await parseWorkout(input.trim());

        if (!parsed || parsed.exercises.length === 0) {
          setError('Could not understand the workout. Try being more specific.');
          setIsLoading(false);
          return;
        }
      }

      const workout = {
        id: uuidv4(),
        date: format(new Date(), 'yyyy-MM-dd'),
        exercises: parsed.exercises.map((e) => ({ ...e, id: e.id || uuidv4() })),
        rawInput: input.trim() || 'Started from template',
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
      {templateId && templateExercises && (
        <View style={[styles.templateIndicator, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
            ✨ Ready to log workout from template
          </Text>
        </View>
      )}
      
      {/* Only show input field if we're not using pre-structured template data */}
      {!templateExercises && (
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
      )}
      
      {/* Show template exercises summary if using pre-structured data */}
      {templateExercises && (
        <View style={[styles.templateSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>
            Template Exercises:
          </Text>
          {templateExercises.exercises.map((exercise: any, index: number) => (
            <Text key={index} style={{ color: colors.textSecondary, fontSize: 14 }}>
              • {exercise.name} - {exercise.sets}x{exercise.reps}
              {exercise.weight ? ` @ ${exercise.weight}${exercise.unit || 'lbs'}` : ''}
            </Text>
          ))}
        </View>
      )}
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading || (!templateExercises && !input.trim())}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {isLoading ? (templateExercises ? 'Logging workout...' : 'Processing with AI...') : 'Log Workout'}
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
  templateSummary: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
