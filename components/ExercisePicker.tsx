import { useState } from 'react';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { Button, List, Searchbar, Text } from 'react-native-paper';
import { useWorkoutStore } from '../stores/workoutStore';
import { useColors } from '../contexts/ThemeContext';
import { knownIdFor, searchExercises, type PickerOption } from '../services/exerciseIdentity';
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
  suggestions?: PickerOption[]; // the few it most likely is, listed first until the search changes
  title?: string;
  exclude?: string; // an exercise not to offer (the one being merged or split)
  newGroup?: MuscleGroup; // the muscle group a new exercise gets
  onPick: (exercise: PickedExercise) => void;
  onDismiss: () => void;
}

// Native sheet for choosing what a logged exercise is: your exercises first, then the catalog,
// then "New exercise" with the typed name. Suggestions, when given, come first.
export default function ExercisePicker({ visible, initialQuery = '', suggestions = [], title = 'Choose exercise', exclude, newGroup = 'full_body', onPick, onDismiss }: Props) {
  const colors = useColors();
  const { workouts, exerciseLibrary, createCustomExercise } = useWorkoutStore();
  const [query, setQuery] = useState(initialQuery);
  const suggested = query === initialQuery ? suggestions : [];
  const options = visible ? searchExercises(query, workouts, exerciseLibrary).filter(o => o.exerciseId !== exclude && !suggested.some(x => x.exerciseId === o.exerciseId)) : [];
  const typed = query.trim();
  const exact = !!knownIdFor(typed, exerciseLibrary);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={() => setQuery(initialQuery)} onRequestClose={onDismiss}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Button onPress={onDismiss}>Cancel</Button>
        </View>
        <Searchbar placeholder="Search exercises" value={query} onChangeText={setQuery} autoFocus={!suggestions.length} autoCorrect={false} />
        <FlatList
          data={options}
          keyExtractor={(o) => o.exerciseId}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Option item={item} onPick={onPick} />}
          ListHeaderComponent={
            suggested.length ? (
              <>
                <List.Subheader>Best matches</List.Subheader>
                {suggested.map(item => <Option key={item.exerciseId} item={item} onPick={onPick} />)}
                <List.Subheader>All exercises</List.Subheader>
              </>
            ) : null
          }
          ListFooterComponent={
            typed && !exact ? (
              <List.Item
                title={`New exercise "${typed}"`}
                left={(props) => <List.Icon {...props} icon="plus" />}
                onPress={() => onPick({ exerciseId: createCustomExercise(typed, newGroup), name: typed, muscleGroup: newGroup })}
              />
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

function Option({ item, onPick }: { item: PickerOption; onPick: (exercise: PickedExercise) => void }) {
  const colors = useColors();
  return (
    <List.Item
      title={item.name}
      description={item.count ? `Logged ${item.count}×` : undefined}
      left={() => <View style={[styles.dot, { backgroundColor: muscleGroupColors[item.muscleGroup] }]} />}
      right={() => <Text style={[styles.group, { color: colors.textSecondary }]}>{item.muscleGroup.replace('_', ' ')}</Text>}
      onPress={() => onPick(item)}
    />
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
  title: {
    flex: 1, // a long title wraps instead of pushing Cancel off
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
