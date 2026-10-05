import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { addDays, format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { workoutSummary } from '../services/format';
import { editDraft, removeFromDraft } from '../services/draft';
import { ParsedWorkoutResponse, UnsureField } from '../types/workout';
import { SkyCard } from './Sky';
import { Pill } from './Glass';

type Draft = ParsedWorkoutResponse;
type DraftExercise = Draft['exercises'][number];

interface Props {
  draft: Draft;
  date: string; // the logging date, for day tags on multi-day logs
  title?: string;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onDiscard: () => void;
  onFix: (fix: string) => Promise<boolean>;
  busy: 'parse' | 'fix' | 'save' | null;
  error?: string | null;
}

// The parsed workout, reviewed before anything is saved: tap a number to change it, type a fix, Save.
// Values a typed fix left uncertain are highlighted; a low parse confidence shows a banner.
export default function ParsedCard({ draft, date, title, onChange, onSave, onDiscard, onFix, busy, error }: Props) {
  const { colors } = useTheme();
  const unsure = draft.unsure ?? [];
  const isUnsure = (exercise: number, field: UnsureField['field']) => unsure.some(u => u.exercise === exercise && u.field === field);
  const lowConfidence = draft.confidence < 0.6;

  const update = (i: number, field: keyof DraftExercise, value: unknown) => onChange(editDraft(draft, i, field, value));
  const remove = (i: number) => onChange(removeFromDraft(draft, i));

  const dayTag = (offset?: number) =>
    !offset ? null : offset === -1 ? 'Yesterday' : format(addDays(parseISO(date), offset), 'EEE, MMM d');

  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} layout={LinearTransition}>
      <SkyCard>
        <View style={styles.header}>
          <SymbolView name="sparkles" size={20} tintColor={colors.sunrise} />
          <Text variant="titleMedium" style={[styles.flex, { color: colors.text }]}>
            {title ?? 'Got it. Look right?'}
          </Text>
          {unsure.length > 0 && (
            <View style={[styles.checkChip, { backgroundColor: colors.warning + '22' }]}>
              <Text variant="labelMedium" style={{ color: colors.warning }}>Check {unsure.length}</Text>
            </View>
          )}
        </View>
        <Text variant="bodyMedium" style={[styles.summary, { color: colors.textSecondary }]}>
          {workoutSummary(draft.exercises)}
        </Text>

        {lowConfidence && (
          <View style={[styles.banner, { backgroundColor: colors.warning + '1A' }]} accessibilityLiveRegion="polite">
            <SymbolView name="exclamationmark.triangle" size={16} tintColor={colors.warning} />
            <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>
              I wasn't sure about parts of this. Check it before you save.
            </Text>
          </View>
        )}

        {draft.exercises.map((e, i) => (
          <View key={i} style={[styles.row, { borderTopColor: colors.dim }]}>
            <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.muscleGroup] }]} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <TextInput
                  value={e.name}
                  onChangeText={name => update(i, 'name', name)}
                  accessibilityLabel="Exercise name"
                  style={[
                    styles.name,
                    { color: colors.text },
                    isUnsure(i, 'name') && [styles.unsure, { backgroundColor: colors.warning + '22', borderColor: colors.warning }],
                  ]}
                />
                {dayTag(e.dayOffset) && (
                  <Text variant="labelSmall" style={[styles.dayTag, { color: colors.cobalt, backgroundColor: colors.cobalt + '1A' }]}>
                    {dayTag(e.dayOffset)}
                  </Text>
                )}
              </View>
              <View style={styles.numbers}>
                <NumberChip value={e.sets} suffix="sets" unsure={isUnsure(i, 'sets')} onChange={v => update(i, 'sets', v)} />
                <NumberChip value={e.reps} suffix="reps" unsure={isUnsure(i, 'reps')} onChange={v => update(i, 'reps', v)} />
                {(e.weight !== undefined || e.muscleGroup !== 'cardio') && (
                  <NumberChip value={e.weight} suffix={e.unit === 'kg' ? 'kg' : 'lb'} unsure={isUnsure(i, 'weight')} onChange={v => update(i, 'weight', v)} />
                )}
                {(e.duration !== undefined || e.muscleGroup === 'cardio') && (
                  <NumberChip value={e.duration} suffix="min" unsure={isUnsure(i, 'duration')} onChange={v => update(i, 'duration', v)} />
                )}
                {e.distance !== undefined && (
                  <NumberChip value={e.distance} suffix={e.distanceUnit ?? ''} unsure={isUnsure(i, 'distance')} onChange={v => update(i, 'distance', v)} />
                )}
              </View>
              {e.notes ? (
                <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{e.notes}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${e.name}`}>
              <SymbolView name="xmark.circle.fill" size={20} tintColor={colors.textTertiary} />
            </Pressable>
          </View>
        ))}

        {draft.notes ? (
          <Text variant="bodyMedium" style={[styles.notes, { color: colors.textSecondary }]}>{draft.notes}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pill icon="checkmark" label="Save" onPress={onSave} loading={busy === 'save'} disabled={!!busy || draft.exercises.length === 0} style={styles.save} />
          <Pill variant="glass" label="Discard" onPress={onDiscard} disabled={!!busy} style={styles.discard} />
        </View>

        <FixBox onFix={onFix} busy={busy === 'fix'} disabled={!!busy} />
        {error ? (
          <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}
      </SkyCard>
    </Animated.View>
  );
}

// A number you can tap to edit; empty clears it
function NumberChip({ value, suffix, unsure, onChange }: { value?: number | string; suffix: string; unsure: boolean; onChange: (v: number | undefined) => void }) {
  const { colors } = useTheme();
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => setText(value === undefined ? '' : String(value)), [value]);

  const commit = () => {
    const n = parseFloat(text.replace(',', '.'));
    const next = text.trim() === '' || !(n > 0) ? undefined : n;
    if (next !== (typeof value === 'number' ? value : value === undefined ? undefined : parseFloat(value))) onChange(next);
    else setText(value === undefined ? '' : String(value));
  };

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.dim },
        unsure && [styles.unsure, { backgroundColor: colors.warning + '22', borderColor: colors.warning }],
      ]}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        placeholder="–"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`${suffix}${unsure ? ', please check' : ''}`}
        accessibilityHint="Edits this number"
        style={[styles.chipInput, { color: colors.text }]}
      />
      <Text variant="labelMedium" style={{ color: colors.textSecondary }}>{suffix}</Text>
    </View>
  );
}

// "Fix something" box: a typed correction re-parses the draft
export function FixBox({ onFix, busy, disabled, placeholder = 'Fix it: "actually 3x10, not 3x8"' }: { onFix: (fix: string) => Promise<boolean>; busy: boolean; disabled?: boolean; placeholder?: string }) {
  const { colors } = useTheme();
  const [fix, setFix] = useState('');
  const send = async () => {
    if (await onFix(fix)) setFix('');
  };
  const canSend = !!fix.trim() && !disabled;
  return (
    <View style={[styles.fixBox, { backgroundColor: colors.dim }]}>
      <TextInput
        value={fix}
        onChangeText={setFix}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        editable={!disabled}
        multiline
        accessibilityLabel="Type a fix"
        style={[styles.fixInput, { color: colors.text }]}
      />
      <Pressable
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Apply fix"
        style={[styles.fixSend, { backgroundColor: colors.sunrise, opacity: canSend || busy ? 1 : 0.4 }]}
      >
        {busy ? <ActivityIndicator color={colors.onSunrise} size="small" /> : <SymbolView name="arrow.up" size={15} weight="bold" tintColor={colors.onSunrise} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summary: {
    marginLeft: 28,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    padding: spacing.gap,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginLeft: -4,
    borderRadius: 8,
  },
  dayTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  numbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 34,
  },
  chipInput: {
    minWidth: 22,
    fontFamily: fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 6,
  },
  unsure: {
    borderWidth: 1.5,
  },
  notes: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  save: {
    flex: 2,
  },
  discard: {
    flex: 1,
  },
  fixBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    marginTop: spacing.gap,
  },
  fixInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 7,
  },
  fixSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: spacing.sm,
  },
});
