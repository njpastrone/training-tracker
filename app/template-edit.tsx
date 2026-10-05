import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Portal, Dialog, Button } from 'react-native-paper';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { muscleGroupColors, spacing } from '../constants/theme';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import Field from '../components/Field';
import { TemplateExercise, WorkoutTemplate } from '../types/template';
import { templateService } from '../services/templates';
import { parseTemplateFromNL, ApiError } from '../services/claude';
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
      Alert.alert('Parse Error', error instanceof ApiError ? error.message : 'Failed to parse exercises. Please try a different format.');
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
    <SkyScreen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LargeTitle title={id ? 'Edit Template' : 'New Template'} />

          <SkyCard style={styles.card}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Push Day, Leg Day"
            />
            <Field
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Heavy compound movements"
              multiline
              style={styles.description}
            />
          </SkyCard>

          <Segmented
            value={inputMode}
            onChange={setInputMode}
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'natural', label: 'Describe it' },
            ]}
          />

          {inputMode === 'natural' ? (
            <SkyCard style={[styles.card, styles.below]}>
              <Field
                label="Describe your workout"
                value={naturalLanguageInput}
                onChangeText={setNaturalLanguageInput}
                placeholder="e.g., Bench press 5x5, OHP 4x8, dips 3x12"
                multiline
              />
              <Pill
                icon="sparkles"
                label={isParsing ? 'Reading…' : 'Parse exercises'}
                onPress={handleParseNaturalLanguage}
                loading={isParsing}
                disabled={!naturalLanguageInput.trim()}
              />
            </SkyCard>
          ) : (
            <View style={styles.below}>
              <View style={styles.exercisesHeader}>
                <SectionLabel>Exercises ({exercises.length})</SectionLabel>
                <Pill variant="glass" size="small" icon="plus" label="Add" onPress={handleAddExercise} />
              </View>

              {exercises.length > 0 ? (
                <SkyCard style={styles.list}>
                  {exercises.map((exercise, index) => (
                    <View key={index} style={[styles.exerciseRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.dim }]}>
                      <View style={[styles.dot, { backgroundColor: muscleGroupColors[exercise.muscleGroup] }]} />
                      <Pressable
                        style={styles.exerciseText}
                        onPress={() => handleEditExercise(index)}
                        accessibilityRole="button"
                        accessibilityHint="Edits this exercise"
                      >
                        <Text variant="bodyLarge" style={{ color: colors.text }}>{exercise.name}</Text>
                        <Text variant="bodySmall" style={[styles.numbers, { color: colors.textSecondary }]}>
                          {exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} ${exercise.weightUnit}` : ''}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteExercise(index)} accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`} hitSlop={8}>
                        <SymbolView name="minus.circle.fill" size={22} tintColor={colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </SkyCard>
              ) : (
                <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No exercises added yet. Tap Add to begin.
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pill variant="glass" label="Cancel" onPress={() => router.back()} style={styles.footerButton} />
          <Pill
            label={id ? 'Update' : 'Create'}
            onPress={handleSaveTemplate}
            loading={isSaving}
            disabled={!name.trim() || exercises.length === 0}
            style={styles.footerButton}
          />
        </View>

        <Portal>
          <Dialog visible={exerciseDialogVisible} onDismiss={() => setExerciseDialogVisible(false)} style={{ backgroundColor: colors.surface }}>
            <Dialog.Title>
              {editingExerciseIndex !== null ? 'Edit Exercise' : 'Add Exercise'}
            </Dialog.Title>
            <Dialog.Content style={styles.dialog}>
              <Field label="Exercise name" value={exerciseName} onChangeText={setExerciseName} />
              <View style={styles.rowInputs}>
                <Field label="Sets" value={exerciseSets} onChangeText={setExerciseSets} keyboardType="numeric" containerStyle={styles.halfInput} />
                <Field label="Reps" value={exerciseReps} onChangeText={setExerciseReps} placeholder="e.g., 10 or 8-12" containerStyle={styles.halfInput} />
              </View>
              <Field label="Weight (optional)" value={exerciseWeight} onChangeText={setExerciseWeight} keyboardType="numeric" placeholder="e.g., 135" />
              <Field label="Notes (optional)" value={exerciseNotes} onChangeText={setExerciseNotes} multiline />
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
  card: {
    gap: spacing.gap,
  },
  description: {
    minHeight: 64,
  },
  below: {
    marginTop: spacing.gap,
  },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  exerciseText: {
    flex: 1,
  },
  numbers: {
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  dialog: {
    gap: spacing.gap,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
});
