import { useState } from 'react';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { Button, List, Searchbar, Text } from 'react-native-paper';
import { useWorkoutStore } from '../stores/workoutStore';
import { useColors } from '../contexts/ThemeContext';
import { knownIdFor, searchExercises } from '../services/exerciseIdentity';
import { muscleGroupColors, spacing } from '../constants/theme';
import type { MuscleGroup } from '../types/workout';

export interface PickedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
}

interface Props {
  visible: boolean;
  initialQuery?: string;
  onPick: (exercise: PickedExercise) => void;
  onDismiss: () => void;
}

// Native sheet for choosing what a logged exercise is: your exercises first, then the catalog,
// then "New exercise" with the typed name.
export default function ExercisePicker({ visible, initialQuery = '', onPick, onDismiss }: Props) {
  const colors = useColors();
  const { workouts, exerciseLibrary, createCustomExercise } = useWorkoutStore();
  const [query, setQuery] = useState(initialQuery);
  const options = visible ? searchExercises(query, workouts, exerciseLibrary) : [];
  const typed = query.trim();
  const exact = !!knownIdFor(typed, exerciseLibrary);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={() => setQuery(initialQuery)} onRequestClose={onDismiss}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: colors.text }}>Choose exercise</Text>
          <Button onPress={onDismiss}>Cancel</Button>
        </View>
        <Searchbar placeholder="Search exercises" value={query} onChangeText={setQuery} autoFocus autoCorrect={false} />
        <FlatList
          data={options}
          keyExtractor={(o) => o.exerciseId}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.count ? `Logged ${item.count}×` : undefined}
              left={() => <View style={[styles.dot, { backgroundColor: muscleGroupColors[item.muscleGroup] }]} />}
              right={() => <Text style={[styles.group, { color: colors.textSecondary }]}>{item.muscleGroup.replace('_', ' ')}</Text>}
              onPress={() => onPick(item)}
            />
          )}
          ListFooterComponent={
            typed && !exact ? (
              <List.Item
                title={`New exercise "${typed}"`}
                left={(props) => <List.Icon {...props} icon="plus" />}
                onPress={() => onPick({ exerciseId: createCustomExercise(typed, 'full_body'), name: typed, muscleGroup: 'full_body' })}
              />
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  group: {
    alignSelf: 'center',
    textTransform: 'capitalize',
  },
});
