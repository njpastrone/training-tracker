import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView, SFSymbol } from 'expo-symbols';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { FoodGoal, Workout } from '../types/workout';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { SectionLabel } from './Sky';
import { Pill } from './Glass';
import WorkoutList from './WorkoutList';
import type { FoodDayTotal } from '../services/progress';
import { entryLabel, movedText } from '../services/moveLog';

const plural = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;
const TOAST_MS = 6000;

interface Props {
  label: string;
  workouts: Workout[];
  groupByDate?: boolean;
  byMonth?: boolean;
  food?: Map<string, FoodDayTotal>; // a Days list: see WorkoutList. Select mode still picks workouts only
  goal?: FoodGoal;
}

// A workout list with a Select mode for deleting several at once
export default function SelectableWorkoutList({ label, workouts, groupByDate, byMonth, food, goal }: Props) {
  const deleteWithUndo = useWorkoutStore(s => s.deleteWithUndo);
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
          deleteWithUndo([...selected]);
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
        {/* A Days list can hold only food: nothing to select */}
        {workouts.length > 0 && <View style={styles.actions}>
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
        </View>}
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
        byMonth={byMonth}
        selected={selected ?? undefined}
        onToggle={toggle}
        food={food}
        goal={goal}
      />
    </View>
  );
}

// Floats over the bottom of the screen for a few seconds after any delete (deleteWithUndo) or move to
// another day (moveEntry), also on the screen you land on after doing it from the workout screen
export function UndoToast() {
  const undo = useWorkoutStore(s => s.undo);
  const restoreWorkouts = useWorkoutStore(s => s.restoreWorkouts);
  const clearUndo = useWorkoutStore(s => s.clearUndo);
  const moved = useWorkoutStore(s => s.moved);
  const moveEntry = useWorkoutStore(s => s.moveEntry);
  const clearMoved = useWorkoutStore(s => s.clearMoved);
  const workouts = useWorkoutStore(s => s.workouts);
  const foodEntries = useWorkoutStore(s => s.foodEntries);
  // One made where no toast shows isn't offered later, out of context
  const fresh = (at: number) => Date.now() - at <= TOAST_MS;
  const label = moved && entryLabel(moved, workouts, foodEntries);
  if (moved && label && fresh(moved.at) && !(undo && undo.at > moved.at)) {
    return (
      <Toast
        key={`${moved.id}-${moved.at}`}
        icon="calendar"
        text={movedText(label, moved.from, moved.to)}
        onUndo={() => moveEntry(moved, moved.from)}
        onClose={clearMoved}
      />
    );
  }
  if (!undo?.workouts.length || !fresh(undo.at)) return null;
  return (
    <Toast
      key={undo.workouts.map(w => w.id).join()}
      icon="trash"
      text={`Deleted ${plural(undo.workouts.length)}`}
      onUndo={() => restoreWorkouts(undo)}
      onClose={clearUndo}
    />
  );
}

// A few seconds of "this happened · Undo" over the bottom of the screen. Render it only while shown;
// give it a new key for a new event so its timer restarts.
export function Toast({ icon, text, onUndo, onClose }: { icon: SFSymbol; text: string; onUndo: () => void; onClose: () => void }) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut} style={styles.toastWrap} pointerEvents="box-none">
      <View style={[styles.toast, { backgroundColor: colors.glass, borderColor: colors.glassLine }]} accessibilityLiveRegion="polite">
        <SymbolView name={icon} size={18} tintColor={colors.textSecondary} />
        <Text variant="titleSmall" style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>{text}</Text>
        <Pill
          variant="glass"
          size="small"
          label="Undo"
          onPress={() => {
            onUndo();
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
  toastText: {
    flexShrink: 1,
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
