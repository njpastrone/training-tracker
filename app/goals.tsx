import { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { v4 as uuidv4 } from 'uuid';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import Field from '../components/Field';
import NumberChip from '../components/NumberChip';
import ExercisePicker, { PickedExercise } from '../components/ExercisePicker';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { displayName } from '../services/exerciseIdentity';
import { DAYS_OPTIONS } from '../services/onboarding';
import { DEFAULT_MIN_SETS, GOAL_MUSCLES, NO_GOALS, hasMuscleGoals, minSetsFor, muscleName } from '../services/goals';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import type { CustomGoal, FoodGoal, Goals, MuscleGroup, WeightUnit } from '../types/workout';

const TIMES = [
  { value: 'off', label: 'Off' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '3', label: '3×' },
];

const FOOD_KINDS = [
  { value: 'off', label: 'Off' },
  { value: 'protein', label: 'Protein' },
  { value: 'cut', label: 'Cut' },
  { value: 'bulk', label: 'Bulk' },
] as const;

const FOOD_HELP: Record<FoodGoal['kind'], string> = {
  protein: 'Protein: at least this much a day',
  cut: 'Calories, cutting: stay under this a day',
  bulk: 'Calories, bulking: reach at least this a day',
};

// "Chest, back, shoulders": the chosen muscles in a sentence
const muscleList = (muscles: MuscleGroup[]) =>
  GOAL_MUSCLES.filter(m => muscles.includes(m))
    .map((m, i) => (i === 0 ? muscleName(m) : muscleName(m).toLowerCase()))
    .join(', ') || 'None';

// Your goals, checked on Progress against the last 7 days of your log. Changes save as you make them.
// Training, then food (food first for people who only log food), then your own goals.
export default function GoalsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings, exerciseLibrary } = useWorkoutStore();
  const foodOnly = useWorkoutStore(s => s.foodEntries.length > 0 && s.workouts.length === 0);
  const goals = settings.goals ?? NO_GOALS;
  const set = (patch: Partial<Goals>) => updateSettings({ goals: { ...goals, ...patch } });
  const toggleMuscle = (g: MuscleGroup) =>
    set({ muscles: GOAL_MUSCLES.filter(m => (m === g ? !goals.muscles.includes(m) : goals.muscles.includes(m))) });
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Switching between grams and kcal starts from the last number of that kind (this visit), or a usual one
  const food = goals.food;
  const last = useRef({ protein: 160, kcal: 2000 });
  if (food) last.current[food.kind === 'protein' ? 'protein' : 'kcal'] = food.target;
  const setFoodKind = (kind: FoodGoal['kind'] | 'off') =>
    set({ food: kind === 'off' ? undefined : { kind, target: kind === 'protein' ? last.current.protein : last.current.kcal } });

  const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim };

  const training = (first: boolean) => (
    <View key="training">
      <SectionLabel style={[styles.label, first && styles.firstLabel]}>Training</SectionLabel>
      <SkyCard>
        <Text variant="bodyLarge" style={{ color: colors.text }}>Days a week</Text>
        <View style={styles.seg}>
          <Segmented value={String(settings.weeklyTarget ?? '')} options={[...DAYS_OPTIONS]} onChange={v => updateSettings({ weeklyTarget: Number(v) })} />
        </View>
        <Text variant="bodyLarge" style={[styles.spaced, { color: colors.text }]}>Each muscle</Text>
        <View style={styles.seg}>
          <Segmented
            value={goals.timesPerWeek ? String(goals.timesPerWeek) : 'off'}
            options={TIMES}
            onChange={v => set({ timesPerWeek: v === 'off' ? undefined : Number(v) })}
          />
        </View>
        {hasMuscleGoals(goals) && (
          <>
            <Pressable
              onPress={() => setMusclesOpen(o => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: musclesOpen }}
              accessibilityLabel={`Muscles: ${muscleList(goals.muscles)}`}
              style={({ pressed }) => [styles.row, styles.musclesRow, pressed && styles.pressed]}
            >
              <View style={styles.fill}>
                <Text variant="bodyLarge" style={{ color: colors.text }}>Muscles</Text>
                <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.textSecondary }}>{muscleList(goals.muscles)}</Text>
              </View>
              <SymbolView name={musclesOpen ? 'chevron.up' : 'chevron.down'} size={13} weight="semibold" tintColor={colors.textTertiary} />
            </Pressable>
            {musclesOpen &&
              GOAL_MUSCLES.map(g => {
                const on = goals.muscles.includes(g);
                return (
                  <View key={g} style={[styles.muscleRow, divider]}>
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
          </>
        )}
        <View style={[styles.row, divider]}>
          <View style={styles.fill}>
            <Text variant="bodyLarge" style={{ color: colors.text }}>Minimum sets a week (MEV)</Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              {new Set(goals.muscles.map(g => minSetsFor(goals, g))).size > 1 ? 'Set per muscle' : `${goals.muscles.length ? minSetsFor(goals, goals.muscles[0]) : DEFAULT_MIN_SETS} per muscle`}
            </Text>
          </View>
          <Switch
            value={!!goals.minSets}
            onValueChange={on => set({ minSets: on ? {} : undefined })}
            trackColor={{ true: colors.sunrise }}
            accessibilityLabel="Minimum sets a week"
          />
        </View>
      </SkyCard>
    </View>
  );

  const foodSection = (first: boolean) => (
    <View key="food">
      <SectionLabel style={[styles.label, first && styles.firstLabel]}>Food</SectionLabel>
      <SkyCard>
        <View style={styles.foodHead}>
          <View style={styles.fill}>
            <Text variant="bodyLarge" style={{ color: colors.text }}>Food goal</Text>
            {food && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{FOOD_HELP[food.kind]}</Text>}
          </View>
          {food && (
            <NumberChip
              value={food.target}
              suffix={food.kind === 'protein' ? 'g' : 'kcal'}
              unsure={false}
              label={food.kind === 'protein' ? 'Protein a day, grams' : 'Calories a day'}
              // Empty keeps the goal while you retype; Off turns it off
              onChange={v => v !== undefined && set({ food: { kind: food.kind, target: Math.round(v) } })}
            />
          )}
        </View>
        <View style={styles.seg}>
          <Segmented value={food?.kind ?? 'off'} options={[...FOOD_KINDS]} onChange={setFoodKind} />
        </View>
        {food && <Text variant="bodySmall" style={{ color: colors.textTertiary }}>The other number still shows, as a plain number.</Text>}
        {food && food.kind !== 'protein' && (
          <Text variant="bodySmall" style={[styles.faintNext, { color: colors.textTertiary }]}>
            Restaurant and homemade foods are estimates, so treat calories as a guide.
          </Text>
        )}
      </SkyCard>
    </View>
  );

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Goals" subtitle="Checked against the last 7 days" />

        {foodOnly ? [foodSection(true), training(false)] : [training(true), foodSection(false)]}

        <SectionLabel style={styles.label}>Your other goals</SectionLabel>
        <SkyCard style={styles.tight}>
          {goals.custom.map((goal, i) => {
            const name = displayName(goal.exerciseId, exerciseLibrary) ?? goal.exerciseId;
            const title = goal.kind === 'lift' ? `${name} ${goal.weight} ${goal.unit}` : `${name} ${goal.perWeek}× a week`;
            return (
              <View key={goal.id} style={[styles.row, i > 0 && divider]}>
                <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>{title}</Text>
                <Pressable
                  onPress={() => set({ custom: goals.custom.filter(c => c.id !== goal.id) })}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${title}`}
                  hitSlop={12}
                >
                  <Text variant="bodySmall" style={{ color: colors.textTertiary }}>Remove</Text>
                </Pressable>
              </View>
            );
          })}
          <Pressable
            onPress={() => setAdding(a => !a)}
            accessibilityRole="button"
            accessibilityState={{ expanded: adding }}
            accessibilityLabel="Add a goal"
            accessibilityHint="A weight to lift, or an exercise to do often"
            style={({ pressed }) => [styles.row, goals.custom.length > 0 && divider, pressed && styles.pressed]}
          >
            <Text style={[styles.plus, { color: colors.sunrise }]}>+</Text>
            <View style={styles.fill}>
              <Text variant="bodyLarge" style={{ color: colors.sunrise }}>Add a goal</Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>A weight to lift, or an exercise to do often</Text>
            </View>
          </Pressable>
          {adding && (
            <NewGoal
              unit={settings.weightUnit}
              onAdd={goal => {
                set({ custom: [...goals.custom, goal] });
                setAdding(false);
              }}
            />
          )}
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
function NewGoal({ unit, onAdd }: { unit: WeightUnit; onAdd: (goal: CustomGoal) => void }) {
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
    <View style={[styles.newGoal, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }]}>
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
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  firstLabel: {
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  seg: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  spaced: {
    marginTop: spacing.gap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  musclesRow: {
    marginTop: 6,
  },
  foodHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faintNext: {
    paddingTop: 6,
  },
  tight: {
    paddingVertical: 6,
  },
  plus: {
    fontFamily: fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
    width: 22,
    textAlign: 'center',
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
  newGoal: {
    gap: spacing.gap,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
