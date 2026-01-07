import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Text, TextInput, IconButton, FAB, Appbar, Chip, Menu, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Exercise, MuscleGroup, Workout } from '../../types/workout';
import { spacing } from '../../constants/theme';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    router.back();
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
    router.back();
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
            router.back();
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

  const addExercise = () => {
    const newExercise: Exercise = {
      id: uuidv4(),
      name: 'New Exercise',
      muscleGroup: 'full_body',
    };
    setExercises([...exercises, newExercise]);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Workout" />
        <Appbar.Action icon="delete" onPress={handleDelete} />
        {hasChanges && <Appbar.Action icon="check" onPress={handleSave} />}
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <View style={styles.dateRow}>
              <Text variant="titleLarge" style={[styles.date, { color: colors.text }]}>
                {format(workoutDate, 'EEEE, MMMM d')}
              </Text>
              <IconButton icon="calendar" size={24} />
            </View>
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

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Exercises
            </Text>
            
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
                <View style={styles.exerciseHeader}>
                  <TextInput
                    mode="flat"
                    value={exercise.name}
                    onChangeText={(text) => updateExercise(exercise.id, 'name', text)}
                    style={styles.exerciseNameInput}
                    placeholder="Exercise name"
                  />
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => removeExercise(exercise.id)}
                  />
                </View>

                <View style={styles.exerciseDetails}>
                  <View style={styles.detailRow}>
                    <TextInput
                      mode="outlined"
                      label="Sets"
                      value={exercise.sets?.toString() || ''}
                      onChangeText={(text) => updateExercise(exercise.id, 'sets', text ? parseInt(text) : undefined)}
                      keyboardType="numeric"
                      style={styles.smallInput}
                    />
                    <TextInput
                      mode="outlined"
                      label="Reps"
                      value={exercise.reps?.toString() || ''}
                      onChangeText={(text) => updateExercise(exercise.id, 'reps', text ? parseInt(text) : undefined)}
                      keyboardType="numeric"
                      style={styles.smallInput}
                    />
                    <TextInput
                      mode="outlined"
                      label="Weight"
                      value={exercise.weight?.toString() || ''}
                      onChangeText={(text) => updateExercise(exercise.id, 'weight', text ? parseFloat(text) : undefined)}
                      keyboardType="numeric"
                      style={styles.mediumInput}
                    />
                  </View>

                  <MuscleGroupSelector
                    selected={exercise.muscleGroup}
                    onSelect={(group) => updateExercise(exercise.id, 'muscleGroup', group)}
                  />
                </View>

                {index < exercises.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={addExercise}
              icon="plus"
              style={styles.addButton}
            >
              Add Exercise
            </Button>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                setHasChanges(true);
              }}
              multiline
              numberOfLines={3}
              placeholder="Add workout notes..."
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MuscleGroupSelector({ selected, onSelect }: { selected: MuscleGroup; onSelect: (group: MuscleGroup) => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Chip
          onPress={() => setVisible(true)}
          style={styles.muscleChip}
        >
          {selected.replace('_', ' ')}
        </Chip>
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  dateButton: {
    marginBottom: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseNameInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  smallInput: {
    flex: 1,
  },
  mediumInput: {
    flex: 1.5,
  },
  muscleChip: {
    alignSelf: 'flex-start',
  },
  divider: {
    marginTop: spacing.md,
    marginBottom: -spacing.xs,
  },
  addButton: {
    marginTop: spacing.xs,
  },
});