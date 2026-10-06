import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { v4 as uuidv4 } from 'uuid';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import Field from '../components/Field';
import ExercisePicker, { PickedExercise } from '../components/ExercisePicker';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { displayName } from '../services/exerciseIdentity';
import { DAYS_OPTIONS } from '../services/onboarding';
import { GOAL_MUSCLES, NO_GOALS, hasMuscleGoals, minSetsFor, muscleName } from '../services/goals';
import { muscleGroupColors, spacing } from '../constants/theme';
import type { CustomGoal, Goals, MuscleGroup, WeightUnit } from '../types/workout';

const TIMES = [
  { value: 'off', label: 'Off' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '3', label: '3×' },
];

// Your goals, checked on Progress against the last 7 days of your log. Changes save as you make them.
// Everything stacks (label above its control, rows that wrap) so nothing is cut off at large text.
export default function GoalsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings, exerciseLibrary } = useWorkoutStore();
  const goals = settings.goals ?? NO_GOALS;
  const set = (patch: Partial<Goals>) => updateSettings({ goals: { ...goals, ...patch } });
  const toggleMuscle = (g: MuscleGroup) =>
    set({ muscles: GOAL_MUSCLES.filter(m => (m === g ? !goals.muscles.includes(m) : goals.muscles.includes(m))) });

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Goals" subtitle="Checked against what you log, over the last 7 days." />

        <SectionLabel style={styles.label}>Each muscle</SectionLabel>
        <SkyCard>
          <Text variant="bodyLarge" style={{ color: colors.text }}>Times a week</Text>
          <Text variant="bodySmall" style={[styles.hint, { color: colors.textSecondary }]}>Days it's a main muscle of what you did.</Text>
          <Segmented
            value={goals.timesPerWeek ? String(goals.timesPerWeek) : 'off'}
            options={TIMES}
            onChange={v => set({ timesPerWeek: v === 'off' ? undefined : Number(v) })}
          />
          <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
            <View style={styles.fill}>
              <Text variant="bodyLarge" style={{ color: colors.text }}>Minimum sets (MEV)</Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Most people start at 6–10 sets a week. A set counts fully for its main muscle and half for helpers. Only sets you write down count.
              </Text>
            </View>
            <Switch
              value={!!goals.minSets}
              onValueChange={on => set({ minSets: on ? {} : undefined })}
              trackColor={{ true: colors.sunrise }}
              accessibilityLabel="Minimum sets"
            />
          </View>
        </SkyCard>

        {hasMuscleGoals(goals) && (
          <>
            <SectionLabel style={styles.label}>Muscles</SectionLabel>
            <SkyCard>
              {GOAL_MUSCLES.map((g, i) => {
                const on = goals.muscles.includes(g);
                return (
                  <View key={g} style={[styles.muscleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Pressable
                      onPress={() => toggleMuscle(g)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={muscleName(g)}
                      style={styles.muscleToggle}
                    >
                      <SymbolView name={on ? 'checkmark.circle.fill' : 'circle'} size={22} tintColor={on ? colors.sunrise : colors.textTertiary} />
                      <View style={[styles.dot, { backgroundColor: muscleGroupColors[g] }]} />
                      <Text variant="bodyLarge" style={[styles.shrink, { color: on ? colors.text : colors.textSecondary }]}>{muscleName(g)}</Text>
                    </Pressable>
                    {on && goals.minSets && (
                      <Stepper
                        value={minSetsFor(goals, g)}
                        label={`${muscleName(g)} sets`}
                        onChange={n => set({ minSets: { ...goals.minSets, [g]: n } })}
                      />
                    )}
                  </View>
                );
              })}
            </SkyCard>
          </>
        )}

        <SectionLabel style={styles.label}>Days a week</SectionLabel>
        <SkyCard>
          <Text variant="bodySmall" style={[styles.hint, { color: colors.textSecondary }]}>Also how much training gets your sky to full daylight.</Text>
          <Segmented value={String(settings.weeklyTarget ?? '')} options={[...DAYS_OPTIONS]} onChange={v => updateSettings({ weeklyTarget: Number(v) })} />
        </SkyCard>

        <SectionLabel style={styles.label}>Your own</SectionLabel>
        <SkyCard>
          {goals.custom.map((goal, i) => {
            const name = displayName(goal.exerciseId, exerciseLibrary) ?? goal.exerciseId;
            const title = goal.kind === 'lift' ? `${name} ${goal.weight} ${goal.unit}` : `${name} ${goal.perWeek}× a week`;
            return (
              <View key={goal.id} style={[styles.customRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>{title}</Text>
                <Pressable
                  onPress={() => set({ custom: goals.custom.filter(c => c.id !== goal.id) })}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${title}`}
                  hitSlop={10}
                >
                  <SymbolView name="minus.circle.fill" size={22} tintColor={colors.error} />
                </Pressable>
              </View>
            );
          })}
          <NewGoal unit={settings.weightUnit} first={goals.custom.length === 0} onAdd={goal => set({ custom: [...goals.custom, goal] })} />
        </SkyCard>
      </ScrollView>
    </SkyScreen>
  );
}

function Stepper({ value, label, onChange }: { value: number; label: string; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  const button = (icon: 'minus' | 'plus', next: number, name: string) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={next < 1 || next > 40}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      hitSlop={6}
      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
    >
      <SymbolView name={icon} size={14} weight="bold" tintColor={colors.text} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { backgroundColor: colors.dim }]}>
      {button('minus', value - 1, 'Fewer')}
      <Text variant="titleMedium" style={[styles.stepValue, { color: colors.text }]} accessibilityLabel={`${value} ${label}`}>{value}</Text>
      {button('plus', value + 1, 'More')}
    </View>
  );
}

// A weight to lift, or an exercise to do on so many days a week: both checked against the log
function NewGoal({ unit, first, onAdd }: { unit: WeightUnit; first: boolean; onAdd: (goal: CustomGoal) => void }) {
  const { colors } = useTheme();
  const [kind, setKind] = useState<CustomGoal['kind']>('lift');
  const [exercise, setExercise] = useState<PickedExercise | null>(null);
  const [picking, setPicking] = useState(false);
  const [weight, setWeight] = useState('');
  const [perWeek, setPerWeek] = useState('2');
  const amount = Number(weight.replace(',', '.'));
  const ready = !!exercise && (kind === 'often' || amount > 0);

  const add = () => {
    if (!exercise) return;
    onAdd(
      kind === 'lift'
        ? { id: uuidv4(), kind, exerciseId: exercise.exerciseId, weight: amount, unit }
        : { id: uuidv4(), kind, exerciseId: exercise.exerciseId, perWeek: Number(perWeek) }
    );
    setExercise(null);
    setWeight('');
  };

  return (
    <View style={[styles.newGoal, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <Text variant="titleSmall" style={{ color: colors.text }}>Add a goal</Text>
      <Segmented
        value={kind}
        options={[{ value: 'lift', label: 'Lift a weight' }, { value: 'often', label: 'Do it often' }]}
        onChange={setKind}
      />
      <Pill variant="glass" size="small" icon="magnifyingglass" label={exercise?.name ?? 'Choose exercise'} onPress={() => setPicking(true)} />
      {kind === 'lift' ? (
        <Field label={`Weight (${unit})`} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder={unit === 'kg' ? '100' : '225'} />
      ) : (
        <View>
          <Text variant="bodySmall" style={[styles.hint, { color: colors.textSecondary }]}>Days a week</Text>
          <Segmented value={perWeek} options={['1', '2', '3', '4', '5'].map(n => ({ value: n, label: `${n}×` }))} onChange={setPerWeek} />
        </View>
      )}
      <Pill icon="plus" label="Add goal" disabled={!ready} onPress={add} />
      <ExercisePicker visible={picking} onPick={e => { setExercise(e); setPicking(false); }} onDismiss={() => setPicking(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  hint: {
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    marginTop: spacing.md,
    paddingTop: spacing.gap,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  muscleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    minHeight: 44,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    marginLeft: 'auto',
  },
  stepButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  newGoal: {
    gap: spacing.gap,
    paddingTop: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
