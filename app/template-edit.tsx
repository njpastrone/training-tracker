import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { 
  Text, Surface, TextInput, Button, IconButton, List, 
  Chip, Portal, Dialog, FAB, SegmentedButtons 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { TemplateExercise, WorkoutTemplate } from '../types/template';
import { templateService } from '../services/templates';
import { parseTemplateFromNL } from '../services/claude';
import { MuscleGroup } from '../types/workout';

export default function TemplateEditScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getTemplate, addTemplate, updateTemplate, loadTemplates } = useWorkoutStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [inputMode, setInputMode] = useState<'manual' | 'natural'>('manual');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Exercise dialog state
  const [exerciseDialogVisible, setExerciseDialogVisible] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('3');
  const [exerciseReps, setExerciseReps] = useState('10');
  const [exerciseWeight, setExerciseWeight] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState('');

  useEffect(() => {
    loadTemplates();
    if (id && typeof id === 'string') {
      const template = getTemplate(id);
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setExercises(template.exercises);
      }
    }
  }, [id]);

  const handleParseNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) return;
    
    setIsParsing(true);
    try {
      const parsedExercises = await parseTemplateFromNL(naturalLanguageInput);
      setExercises(parsedExercises);
      setInputMode('manual');
      Alert.alert('Success', `Parsed ${parsedExercises.length} exercises from your description.`);
    } catch (error) {
      Alert.alert('Parse Error', 'Failed to parse exercises. Please try a different format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddExercise = () => {
    setEditingExerciseIndex(null);
    setExerciseName('');
    setExerciseSets('3');
    setExerciseReps('10');
    setExerciseWeight('');
    setExerciseNotes('');
    setExerciseDialogVisible(true);
  };

  const handleEditExercise = (index: number) => {
    const exercise = exercises[index];
    setEditingExerciseIndex(index);
    setExerciseName(exercise.name);
    setExerciseSets(exercise.sets.toString());
    setExerciseReps(exercise.reps.toString());
    setExerciseWeight(exercise.weight?.toString() || '');
    setExerciseNotes(exercise.notes || '');
    setExerciseDialogVisible(true);
  };

  const handleSaveExercise = () => {
    const muscleGroup = detectMuscleGroup(exerciseName);
    const newExercise: TemplateExercise = {
      name: exerciseName,
      muscleGroup,
      sets: parseInt(exerciseSets) || 3,
      reps: exerciseReps,
      weight: exerciseWeight ? parseFloat(exerciseWeight) : undefined,
      weightUnit: 'lbs',
      notes: exerciseNotes || undefined,
    };

    if (editingExerciseIndex !== null) {
      const updatedExercises = [...exercises];
      updatedExercises[editingExerciseIndex] = newExercise;
      setExercises(updatedExercises);
    } else {
      setExercises([...exercises, newExercise]);
    }

    setExerciseDialogVisible(false);
  };

  const handleDeleteExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const detectMuscleGroup = (exerciseName: string): MuscleGroup => {
    const lower = exerciseName.toLowerCase();
    if (lower.includes('bench') || lower.includes('chest')) return 'chest';
    if (lower.includes('squat') || lower.includes('leg press')) return 'quads';
    if (lower.includes('deadlift') || lower.includes('rdl')) return 'hamstrings';
    if (lower.includes('row') || lower.includes('pull')) return 'back';
    if (lower.includes('press') && !lower.includes('bench')) return 'shoulders';
    if (lower.includes('curl')) return 'biceps';
    if (lower.includes('tricep') || lower.includes('dip')) return 'triceps';
    return 'full_body';
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setIsSaving(true);
    try {
      if (id && typeof id === 'string') {
        await updateTemplate(id, {
          name,
          description,
          exercises,
          muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))],
        });
      } else {
        const newTemplate = await templateService.createTemplate({
          name,
          description,
          exercises,
          muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))],
        });
        addTemplate(newTemplate);
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>
              {id ? 'Edit Template' : 'Create Template'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
            <TextInput
              label="Template Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Push Day, Leg Day"
            />
            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Heavy compound movements"
              multiline
              numberOfLines={2}
            />
          </Surface>

          <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
            <SegmentedButtons
              value={inputMode}
              onValueChange={value => setInputMode(value as 'manual' | 'natural')}
              buttons={[
                { value: 'manual', label: 'Manual Entry' },
                { value: 'natural', label: 'Natural Language' },
              ]}
              style={styles.segmentedButtons}
            />

            {inputMode === 'natural' ? (
              <View>
                <TextInput
                  label="Describe Your Workout"
                  value={naturalLanguageInput}
                  onChangeText={setNaturalLanguageInput}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g., Bench press 5x5, OHP 4x8, dips 3x12"
                  multiline
                  numberOfLines={4}
                />
                <Button
                  mode="contained"
                  onPress={handleParseNaturalLanguage}
                  loading={isParsing}
                  disabled={isParsing || !naturalLanguageInput.trim()}
                  style={styles.parseButton}
                >
                  Parse Exercises
                </Button>
              </View>
            ) : (
              <View>
                <View style={styles.exercisesHeader}>
                  <Text variant="titleMedium" style={{ color: colors.text }}>
                    Exercises ({exercises.length})
                  </Text>
                  <Button mode="text" onPress={handleAddExercise} icon="plus">
                    Add Exercise
                  </Button>
                </View>

                {exercises.map((exercise, index) => (
                  <List.Item
                    key={index}
                    title={exercise.name}
                    description={`${exercise.sets}x${exercise.reps}${exercise.weight ? ` @ ${exercise.weight}${exercise.weightUnit}` : ''}`}
                    left={props => <List.Icon {...props} icon="dumbbell" />}
                    right={() => (
                      <View style={styles.exerciseActions}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEditExercise(index)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => handleDeleteExercise(index)}
                          iconColor={colors.error}
                        />
                      </View>
                    )}
                    style={styles.exerciseItem}
                  />
                ))}

                {exercises.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    No exercises added yet. Tap "Add Exercise" to begin.
                  </Text>
                )}
              </View>
            )}
          </Surface>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.footerButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSaveTemplate}
            loading={isSaving}
            disabled={isSaving || !name.trim() || exercises.length === 0}
            style={styles.footerButton}
          >
            {id ? 'Update Template' : 'Create Template'}
          </Button>
        </View>

        <Portal>
          <Dialog visible={exerciseDialogVisible} onDismiss={() => setExerciseDialogVisible(false)}>
            <Dialog.Title>
              {editingExerciseIndex !== null ? 'Edit Exercise' : 'Add Exercise'}
            </Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Exercise Name"
                value={exerciseName}
                onChangeText={setExerciseName}
                mode="outlined"
                style={styles.dialogInput}
              />
              <View style={styles.rowInputs}>
                <TextInput
                  label="Sets"
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.dialogInput, styles.halfInput]}
                />
                <TextInput
                  label="Reps"
                  value={exerciseReps}
                  onChangeText={setExerciseReps}
                  mode="outlined"
                  placeholder="e.g., 10 or 8-12"
                  style={[styles.dialogInput, styles.halfInput]}
                />
              </View>
              <TextInput
                label="Weight (Optional)"
                value={exerciseWeight}
                onChangeText={setExerciseWeight}
                mode="outlined"
                keyboardType="numeric"
                placeholder="e.g., 135"
                style={styles.dialogInput}
              />
              <TextInput
                label="Notes (Optional)"
                value={exerciseNotes}
                onChangeText={setExerciseNotes}
                mode="outlined"
                multiline
                style={styles.dialogInput}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setExerciseDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleSaveExercise} disabled={!exerciseName.trim()}>
                {editingExerciseIndex !== null ? 'Update' : 'Add'}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: -8,
    marginRight: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  segmentedButtons: {
    marginBottom: spacing.md,
  },
  parseButton: {
    marginTop: spacing.sm,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    marginVertical: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerButton: {
    flex: 1,
  },
  dialogInput: {
    marginBottom: spacing.sm,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
});