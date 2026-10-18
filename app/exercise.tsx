import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill } from '../components/Glass';
import WorkoutList from '../components/WorkoutList';
import Row from '../components/Row';
import ExercisePicker, { type PickedExercise } from '../components/ExercisePicker';
import { LiftChart } from '../components/ThreadCards';
import { Toast, UndoToast } from '../components/SelectableWorkoutList';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { digest, target } from '../services/insights';
import { aliasesOf, displayName, mergedInto, ownName, resolveId, wordings } from '../services/exerciseIdentity';
import { entriesFor, metricFor, personalRecords, type PersonalRecords } from '../services/progress';
import { daysAgo, lastDoneLine } from '../services/format';
import { plural } from '../services/importHistory';
import { catalogById } from '../data/catalog';
import { formatSets, goalProgress, muscleName } from '../services/goals';
import { spacing } from '../constants/theme';
import type { ExerciseLibrary, MuscleGroup, WeightUnit } from '../types/workout';

// One exercise (id) or muscle group (group) from Progress or Exercises: add a session you forgot, or see
// every time you did it. Each workout opens its own screen, with the fix box, edit and delete. An
// exercise also shows its records and what you call it, and can be renamed, merged or split.
export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ id?: string; group?: MuscleGroup; merged?: string }>();
  const { group } = params;
  const router = useRouter();
  const { colors } = useTheme();
  const { workouts, exerciseLibrary, settings, renameExercise, removeAlias, mergeExercise, unmergeExercise, splitExercise, unsplitExercise } = useWorkoutStore();
  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);
  // An old id (merged since) opens what it is now
  const id = params.id && resolveId(params.id, exerciseLibrary);
  const name = id ? displayName(id, exerciseLibrary) : undefined; // none for an entry saved without an id

  // What the picker is open for: merging this exercise, or moving the logs written one way
  const [choosing, setChoosing] = useState<'merge' | { words: string; count: number } | null>(null);
  const [toast, setToast] = useState<{ key: string; text: string; undo: () => void } | null>(() =>
    params.merged && name
      ? { key: params.merged, text: `Merged ${ownName(params.merged, exerciseLibrary)} into ${name}`, undo: () => unmergeExercise(params.merged!) }
      : null
  );
  const entries = useMemo(() => (id && name ? entriesFor(workouts, id, exerciseLibrary) : []), [workouts, id, name, exerciseLibrary]);
  const records = id && name ? recordLines(personalRecords(entries.filter(e => e.date <= d.today), metricFor(id, exerciseLibrary), settings.weightUnit), settings.weightUnit) : [];
  const written = id && name ? wordings(workouts, id, exerciseLibrary) : [];
  const aliases = id && name ? aliasesOf(id, exerciseLibrary) : [];
  const mergedIn = id && name ? mergedInto(id, exerciseLibrary) : [];

  const rename = () =>
    Alert.prompt('Rename', 'Only the name changes. Its logs, chart and records stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: (text?: string) => renameExercise(id!, text ?? '') },
    ], 'plain-text', name);

  const pick = (p: PickedExercise) => {
    const what = choosing;
    setChoosing(null);
    if (!id || !what || resolveId(p.exerciseId, exerciseLibrary) === id) return;
    if (what === 'merge') {
      Alert.alert(`Merge into ${p.name}?`, `${plural(entries.length, 'log')} move to ${p.name} · PRs recalculated`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: () => {
            mergeExercise(id, p.exerciseId);
            router.replace({ pathname: '/exercise', params: { id: resolveId(p.exerciseId, useWorkoutStore.getState().exerciseLibrary), merged: id } });
          },
        },
      ]);
      return;
    }
    const split = splitExercise(id, what.words, p.exerciseId);
    setToast({ key: `${what.words}-${p.exerciseId}`, text: `Moved ${plural(split.moved.length, 'log')} to ${p.name}`, undo: () => unsplitExercise(split) });
  };

  const exercise = id ? d.exercises.find(e => e.id === id) : undefined;
  const trend = id ? d.liftTrends.find(t => t.id === id) : undefined;
  const next = trend && target(trend);
  const goal = useMemo(
    () => (group && settings.goals ? goalProgress(settings.goals, workouts, exerciseLibrary).muscles.find(m => m.group === group) : undefined),
    [group, settings.goals, workouts, exerciseLibrary]
  );
  const times = workouts.filter(w =>
    group
      ? w.muscleGroups.includes(group)
      : w.exercises.some(e => (e.exerciseId ? resolveId(e.exerciseId, exerciseLibrary) : e.name) === id)
  ).filter(w => w.date <= d.today);
  const last = times[0]?.date; // the store keeps workouts newest first

  const title = name ?? exercise?.name ?? (group ? muscleName(group) : '');
  const subtitle = exercise ? lastDoneLine(exercise) : group && d.daysSinceGroupTrained[group] !== undefined ? `last trained ${daysAgo(d.daysSinceGroupTrained[group]!)}` : undefined;

  // A forgotten session most likely came after the last one you logged
  const today = parseISO(d.today);
  const [day, setDay] = useState(() => (last && last < d.today ? addDays(parseISO(last), 1) : today));
  const [picking, setPicking] = useState(false);
  // A hairline between the rows of "Also logged as", none above the first
  const line = (n: number) => [styles.line, { borderTopColor: colors.border, borderTopWidth: n ? StyleSheet.hairlineWidth : 0 }];
  const addPast = () => router.push({ pathname: '/quick-add', params: { date: format(day, 'yyyy-MM-dd') } });

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title={title} subtitle={subtitle} />

        {next && (
          <>
            <SectionLabel style={styles.firstLabel}>Next time</SectionLabel>
            <SkyCard>
              <Text variant="titleMedium" style={[styles.next, { color: colors.text }]}>{next.next}</Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                Last {next.last}. {next.why}
              </Text>
            </SkyCard>
          </>
        )}

        {trend && (
          <>
            <SectionLabel style={styles.label}>Top sets</SectionLabel>
            <SkyCard>
              <LiftChart trend={trend} />
            </SkyCard>
          </>
        )}

        {records.length > 0 && (
          <>
            <SectionLabel style={styles.label}>Personal records</SectionLabel>
            <SkyCard>
              {records.map(([label, value]) => (
                <View key={label} style={styles.record}>
                  <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>{label}</Text>
                  <Text variant="bodyLarge" style={[styles.number, { color: colors.text }]}>{value}</Text>
                </View>
              ))}
            </SkyCard>
          </>
        )}

        {(written.length > 0 || aliases.length > 0 || mergedIn.length > 0) && (
          <>
            <SectionLabel style={styles.label}>Also logged as</SectionLabel>
            <SkyCard>
              {written.map((w, i) => (
                <View key={w.words} style={line(i)}>
                  <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>
                    "{w.words}" <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>×{w.count}</Text>
                  </Text>
                  {written.length > 1 && <Pill variant="glass" size="small" label="Move" onPress={() => setChoosing(w)} />}
                </View>
              ))}
              {aliases.map((a, i) => (
                <View key={a} style={line(written.length + i)}>
                  <View style={styles.fill}>
                    <Text variant="bodyLarge" style={{ color: colors.text }}>"{a}"</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Your word for it</Text>
                  </View>
                  <Pressable onPress={() => removeAlias(a)} accessibilityRole="button" accessibilityLabel={`Forget "${a}"`} hitSlop={10}>
                    <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
              {mergedIn.map((from, i) => (
                <View key={from} style={line(written.length + aliases.length + i)}>
                  <View style={styles.fill}>
                    <Text variant="bodyLarge" style={{ color: colors.text }}>{ownName(from, exerciseLibrary) ?? from}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Merged in</Text>
                  </View>
                  <Pill variant="glass" size="small" label="Undo" onPress={() => unmergeExercise(from)} />
                </View>
              ))}
            </SkyCard>
          </>
        )}

        {id && name && (
          <SkyCard style={styles.rows}>
            <Row first icon="pencil" title="Rename" subtitle="Changes only the name" onPress={rename} />
            <Row icon="arrow.triangle.merge" title="Merge into…" subtitle="Moves every log to another exercise" onPress={() => setChoosing('merge')} />
          </SkyCard>
        )}

        {goal && (
          <>
            <SectionLabel style={styles.label}>Your goals · last 7 days</SectionLabel>
            <SkyCard>
              {goal.timesGoal !== undefined && (
                <Text variant="bodyLarge" style={[styles.goalLine, { color: colors.text }]}>Trained {goal.times} of {goal.timesGoal} times</Text>
              )}
              {goal.setsGoal !== undefined && (
                <Text variant="bodyLarge" style={[styles.goalLine, { color: colors.text }]}>
                  {formatSets(goal.sets, goal.setsMissing)} of {goal.setsGoal} sets
                </Text>
              )}
              {goal.setsGoal !== undefined && goal.setsMissing && (
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Some exercises had no set count, so only written sets count.</Text>
              )}
            </SkyCard>
          </>
        )}

        <SectionLabel style={styles.label}>Forgot one?</SectionLabel>
        <SkyCard>
          <View style={styles.dayRow}>
            <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>Add a session on</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={day}
                mode="date"
                display="compact"
                maximumDate={today}
                onChange={(_, picked) => picked && setDay(picked)}
                accentColor={colors.sunrise}
                accessibilityLabel="Day of the session"
              />
            ) : (
              <>
                <Pill variant="glass" size="small" label={format(day, 'EEE, MMM d')} onPress={() => setPicking(true)} />
                {picking && (
                  <DateTimePicker
                    value={day}
                    mode="date"
                    maximumDate={today}
                    onChange={(_, picked) => {
                      setPicking(false);
                      if (picked) setDay(picked);
                    }}
                  />
                )}
              </>
            )}
          </View>
          <Pill icon="plus" label="Add a past session" onPress={addPast} />
        </SkyCard>

        {times.length > 0 && (
          <>
            <SectionLabel style={styles.label}>Every time · {times.length}</SectionLabel>
            {/* ponytail: renders every workout; window it if one exercise reaches the hundreds */}
            <WorkoutList workouts={times} groupByDate={false} />
          </>
        )}
      </ScrollView>
      {toast ? <Toast key={toast.key} icon="arrow.uturn.backward" text={toast.text} onUndo={toast.undo} onClose={() => setToast(null)} /> : <UndoToast />}
      <ExercisePicker
        visible={!!choosing}
        title={choosing === 'merge' ? `Merge ${name} into…` : choosing ? `Move "${choosing.words}" (${choosing.count}) to…` : ''}
        initialQuery={choosing && choosing !== 'merge' ? choosing.words : ''}
        exclude={id}
        newGroup={id ? muscleOf(id, exerciseLibrary) : undefined}
        onPick={pick}
        onDismiss={() => setChoosing(null)}
      />
    </SkyScreen>
  );
}

const muscleOf = (id: string, library: ExerciseLibrary): MuscleGroup | undefined =>
  catalogById.get(id)?.primary ?? library.custom.find(c => c.id === id)?.muscleGroup;

// Each record as [what, value · when]; only the ones this kind of exercise has
function recordLines(pr: PersonalRecords, unit: WeightUnit): [string, string][] {
  const u = (x?: WeightUnit) => ((x ?? unit) === 'kg' ? 'kg' : 'lb');
  const on = (date: string) => ` · ${format(parseISO(date), 'MMM d')}`;
  const lines: [string, string | undefined][] = [
    ['Heaviest', pr.heaviest && `${pr.heaviest.exercise.weight} ${u(pr.heaviest.exercise.unit)}${pr.heaviest.exercise.reps ? ` × ${pr.heaviest.exercise.reps}` : ''}${on(pr.heaviest.date)}`],
    ['Best estimated 1-rep max', pr.bestE1rm && `${pr.bestE1rm.value} ${u()}${on(pr.bestE1rm.entry.date)}`],
    ['Most reps', pr.mostReps && `${pr.mostReps.exercise.reps}${on(pr.mostReps.date)}`],
    ['Longest', pr.longest && `${pr.longest.exercise.duration} min${on(pr.longest.date)}`],
    ['Farthest', pr.longestDistance && `${pr.longestDistance.exercise.distance} ${pr.longestDistance.exercise.distanceUnit ?? 'km'}${on(pr.longestDistance.date)}`],
  ];
  return lines.flatMap(([label, value]) => (value ? [[label, value] as [string, string]] : []));
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  next: {
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  goalLine: {
    marginTop: spacing.xs,
  },
  record: {
    flexDirection: 'row',
    flexWrap: 'wrap', // at large text the value goes under its label
    columnGap: spacing.sm,
    marginTop: spacing.sm,
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  rows: {
    paddingVertical: spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.gap,
  },
  label: {
    marginTop: spacing.gap, // 24 pt below the card above
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  firstLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
});
