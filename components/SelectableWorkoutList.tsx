import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Workout } from '../types/workout';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { SectionLabel } from './Sky';
import { Pill } from './Glass';
import WorkoutList from './WorkoutList';

const plural = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;

interface Props {
  label: string;
  workouts: Workout[];
  groupByDate?: boolean;
  enableSwipe?: boolean;
  onDeleted: (removed: Workout[]) => void; // the screen shows <UndoToast> for these
}

// A workout list with a Select mode for deleting several at once
export default function SelectableWorkoutList({ label, workouts, groupByDate, enableSwipe, onDeleted }: Props) {
  const deleteWorkouts = useWorkoutStore(s => s.deleteWorkouts);
  const [selected, setSelected] = useState<Set<string> | null>(null);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const confirmDelete = () => {
    if (!selected?.size) return;
    Alert.alert(`Delete ${plural(selected.size)}?`, 'You can undo this right after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleted(deleteWorkouts([...selected]));
          setSelected(null);
        },
      },
    ]);
  };

  const allSelected = !!selected && workouts.every(w => selected.has(w.id));

  return (
    <View>
      <View style={styles.header}>
        <SectionLabel>{label}</SectionLabel>
        <View style={styles.actions}>
          {selected && (
            <Pill
              variant="glass"
              size="small"
              label={allSelected ? 'None' : 'All'}
              onPress={() => setSelected(new Set(allSelected ? [] : workouts.map(w => w.id)))}
            />
          )}
          <Pill
            variant="glass"
            size="small"
            label={selected ? 'Cancel' : 'Select'}
            onPress={() => setSelected(selected ? null : new Set())}
          />
        </View>
      </View>
      {selected && (
        <Pill
          icon="trash"
          label={selected.size ? `Delete ${plural(selected.size)}` : 'Tap workouts to select'}
          disabled={!selected.size}
          onPress={confirmDelete}
          style={styles.delete}
        />
      )}
      <WorkoutList
        workouts={workouts}
        groupByDate={groupByDate}
        enableSwipe={enableSwipe}
        selected={selected ?? undefined}
        onToggle={toggle}
      />
    </View>
  );
}

// Floats over the bottom of the screen for a few seconds after a delete
export function UndoToast({ removed, onClose }: { removed: Workout[] | null; onClose: () => void }) {
  const restoreWorkouts = useWorkoutStore(s => s.restoreWorkouts);
  const { colors } = useTheme();

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [removed]);

  if (!removed?.length) return null;
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut} style={styles.toastWrap} pointerEvents="box-none">
      <View style={[styles.toast, { backgroundColor: colors.glass, borderColor: colors.glassLine }]} accessibilityLiveRegion="polite">
        <SymbolView name="trash" size={18} tintColor={colors.textSecondary} />
        <Text variant="titleSmall" style={{ color: colors.text }}>Deleted {plural(removed.length)}</Text>
        <Pill
          variant="glass"
          size="small"
          label="Undo"
          onPress={() => {
            restoreWorkouts(removed);
            onClose();
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  delete: {
    marginBottom: spacing.gap,
  },
  toastWrap: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 6,
    paddingLeft: spacing.md,
    paddingRight: 6,
  },
});
