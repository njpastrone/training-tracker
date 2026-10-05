import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Exercise, MuscleGroup, Workout } from '../../types/workout';
import { fonts, muscleGroupColors, spacing } from '../../constants/theme';
import { SkyScreen, SkyCard, SectionLabel } from '../../components/Sky';
import { HeaderButton, Pill } from '../../components/Glass';
import Field from '../../components/Field';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from '@react-native-community/datetimepicker';
import ExercisePicker, { PickedExercise } from '../../components/ExercisePicker';

const muscleGroups: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'
];

export default function WorkoutEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { workouts, updateWorkout, deleteWorkout, getWorkoutsByDate } = useWorkoutStore();
  const { colors } = useTheme();
  
  const workout = workouts.find(w => w.id === id);
  const [exercises, setExercises] = useState<Exercise[]>(workout?.exercises || []);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>(workout?.muscleGroups || []);
  const [notes, setNotes] = useState(workout?.notes || '');
  const [workoutDate, setWorkoutDate] = useState(workout ? parseISO(workout.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Which exercise the picker is choosing for: an exercise id, 'new' for Add Exercise, or closed
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  useEffect(() => {
    if (!workout) {
      router.back();
    }
  }, [workout]);

  if (!workout) {
    return null;
  }

  const handleSave = () => {
    const updatedMuscleGroups = [...new Set([
      ...selectedMuscleGroups,
      ...exercises.map(e => e.muscleGroup)
    ])];
    
    const newDateString = format(workoutDate, 'yyyy-MM-dd');
    
    // Check if there are other workouts on the new date
    if (newDateString !== workout?.date) {
      const workoutsOnNewDate = getWorkoutsByDate(newDateString);
      if (workoutsOnNewDate.length > 0) {
        Alert.alert(
          'Merge Workouts?',
          `There's already a workout on ${format(workoutDate, 'MMM d')}. Would you like to merge these workouts?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Keep Separate', 
              onPress: () => saveWorkout(newDateString, updatedMuscleGroups)
            },
            {
              text: 'Merge',
              style: 'default',
              onPress: () => mergeWorkouts(workoutsOnNewDate[0], newDateString, updatedMuscleGroups),
            },
          ]
        );
        return;
      }
    }
    
    saveWorkout(newDateString, updatedMuscleGroups);
  };
  
  const saveWorkout = (dateString: string, muscleGroups: MuscleGroup[]) => {
    updateWorkout(id, {
      date: dateString,
      exercises,
      muscleGroups,
      notes: notes.trim() || undefined,
    });
    // Navigate back to home screen instead of using back()
    router.replace('/');
  };
  
  const mergeWorkouts = (existingWorkout: Workout, dateString: string, muscleGroups: MuscleGroup[]) => {
    // Combine exercises from both workouts
    const mergedExercises = [...existingWorkout.exercises, ...exercises];
    const mergedMuscleGroups = [...new Set([...existingWorkout.muscleGroups, ...muscleGroups])];
    const mergedNotes = [existingWorkout.notes, notes].filter(Boolean).join('\n\n');
    
    // Update the existing workout with merged data
    updateWorkout(existingWorkout.id, {
      exercises: mergedExercises,
      muscleGroups: mergedMuscleGroups,
      notes: mergedNotes || undefined,
    });
    
    // Delete the current workout since we merged it
    deleteWorkout(id);
    // Navigate back to home screen instead of using back()
    router.replace('/');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(id);
            // Navigate back to home screen instead of using back()
            router.replace('/');
          },
        },
      ]
    );
  };

  const updateExercise = (exerciseId: string, field: keyof Exercise, value: any) => {
    setExercises(prev => prev.map(e => 
      e.id === exerciseId ? { ...e, [field]: value } : e
    ));
    setHasChanges(true);
  };

  // An explicit pick is a confirmed identity
  const pickExercise = ({ exerciseId, name, muscleGroup }: PickedExercise) => {
    const picked = { exerciseId, name, muscleGroup, match: 'sure' as const };
    setExercises(prev => pickerFor === 'new'
      ? [...prev, { id: uuidv4(), ...picked }]
      : prev.map(e => (e.id === pickerFor ? { ...e, ...picked } : e)));
    setPickerFor(null);
    setHasChanges(true);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(prev => prev.filter(e => e.id !== exerciseId));
    setHasChanges(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setWorkoutDate(selectedDate);
      setHasChanges(true);
    }
  };

  return (
    <SkyScreen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Edit Workout',
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderButton icon="trash" label="Delete workout" onPress={handleDelete} />
              {hasChanges && <HeaderButton icon="checkmark" label="Save changes" onPress={handleSave} />}
            </View>
          ),
        }}
      />

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Date, ${format(workoutDate, 'EEEE, MMMM d')}. Change date`}
          style={styles.dateRow}
        >
          <Text variant="headlineMedium" style={[styles.date, { color: colors.text }]}>
            {format(workoutDate, 'EEEE, MMMM d')}
          </Text>
          <SymbolView name="calendar" size={22} tintColor={colors.sunrise} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={workoutDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        <SectionLabel style={styles.label}>Exercises</SectionLabel>
        {exercises.map((exercise) => (
          <SkyCard key={exercise.id}>
            <View style={styles.exerciseHeader}>
              <Pressable
                onPress={() => setPickerFor(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={`Exercise, ${exercise.name}. Change`}
                style={styles.exerciseNameButton}
              >
                <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
              </Pressable>
              <Pressable
                onPress={() => removeExercise(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${exercise.name}`}
                hitSlop={8}
              >
                <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.detailRow}>
              <Field
                label="Sets"
                value={exercise.sets?.toString() || ''}
                onChangeText={(text) => updateExercise(exercise.id, 'sets', text ? parseInt(text) : undefined)}
                keyboardType="numeric"
                containerStyle={styles.smallInput}
              />
              <Field
                label="Reps"
                value={exercise.reps?.toString() || ''}
                onChangeText={(text) => updateExercise(exercise.id, 'reps', text ? parseInt(text) : undefined)}
                keyboardType="numeric"
                containerStyle={styles.smallInput}
              />
              <Field
                label="Weight"
                value={exercise.weight?.toString() || ''}
                onChangeText={(text) => updateExercise(exercise.id, 'weight', text ? parseFloat(text) : undefined)}
                keyboardType="numeric"
                containerStyle={styles.mediumInput}
              />
            </View>

            <MuscleGroupSelector
              selected={exercise.muscleGroup}
              onSelect={(group) => updateExercise(exercise.id, 'muscleGroup', group)}
            />
          </SkyCard>
        ))}

        <Pill variant="glass" icon="plus" label="Add exercise" onPress={() => setPickerFor('new')} style={styles.addButton} />

        <SectionLabel style={styles.label}>Notes</SectionLabel>
        <SkyCard>
          <Field
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              setHasChanges(true);
            }}
            multiline
            placeholder="Add workout notes..."
            accessibilityLabel="Workout notes"
          />
        </SkyCard>
      </ScrollView>

      <ExercisePicker
        visible={pickerFor !== null}
        initialQuery={exercises.find(e => e.id === pickerFor)?.name ?? ''}
        onPick={pickExercise}
        onDismiss={() => setPickerFor(null)}
      />
    </SkyScreen>
  );
}

function MuscleGroupSelector({ selected, onSelect }: { selected: MuscleGroup; onSelect: (group: MuscleGroup) => void }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Pressable
          onPress={() => setVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Muscle group, ${selected.replace('_', ' ')}. Change`}
          style={[styles.muscleChip, { backgroundColor: colors.dim }]}
        >
          <View style={[styles.dot, { backgroundColor: muscleGroupColors[selected] }]} />
          <Text variant="labelMedium" style={[styles.muscleText, { color: colors.textSecondary }]}>
            {selected.replace('_', ' ')}
          </Text>
          <SymbolView name="chevron.up.chevron.down" size={11} weight="semibold" tintColor={colors.textTertiary} />
        </Pressable>
      }
    >
      {muscleGroups.map((group) => (
        <Menu.Item
          key={group}
          onPress={() => {
            onSelect(group);
            setVisible(false);
          }}
          title={group.replace('_', ' ')}
        />
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.gap,
    marginBottom: spacing.lg,
  },
  date: {
    flex: 1,
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  exerciseNameButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  exerciseName: {
    fontFamily: fonts.rounded,
    fontSize: 19,
    fontWeight: '700',
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  smallInput: {
    flex: 1,
  },
  mediumInput: {
    flex: 1.5,
  },
  muscleChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleText: {
    textTransform: 'capitalize',
  },
  addButton: {
    marginBottom: spacing.lg,
  },
});
