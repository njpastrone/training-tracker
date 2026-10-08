import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { workoutSummary } from '../services/format';
import { editDraft, removeFromDraft } from '../services/draft';
import { sentenceCase, shownName } from '../services/exerciseIdentity';
import { useWorkoutStore } from '../stores/workoutStore';
import { ParsedWorkoutResponse, UnsureField } from '../types/workout';
import type { FoodDraft } from '../types/food';
import { SkyCard, SectionLabel } from './Sky';
import FoodRows, { EstimateNote, foodSummary } from './FoodRows';
import NumberChip from './NumberChip';
import { Pill } from './Glass';
import LogoMark from './LogoMark';

type Draft = ParsedWorkoutResponse;
type DraftExercise = Draft['exercises'][number];

interface Props {
  draft: Draft;
  date: string; // the logging date, for day tags on multi-day logs
  title?: string;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onDiscard: () => void;
  onFix?: (fix: string) => Promise<boolean>; // its own fix box; chat tabs fix through their chat bar instead
  busy: 'parse' | 'fix' | 'save' | null;
  error?: string | null;
  reply?: FixReplyState | null;
  example?: boolean; // a canned example for a first-time user: nothing to save or fix
  food?: FoodDraft | null; // what was eaten, when the same message logged food too; saved with the workout
  onFoodChange?: (food: FoodDraft) => void;
}

// The parsed workout, reviewed before anything is saved: tap a number to change it, type a fix, Save.
// Values the parse guessed or a typed fix left uncertain are highlighted; a low parse confidence shows a banner.
export default function ParsedCard({ draft, date, title, onChange, onSave, onDiscard, onFix, busy, error, reply, example, food, onFoodChange }: Props) {
  const { colors } = useTheme();
  const library = useWorkoutStore(s => s.exerciseLibrary);
  const unsure = draft.unsure ?? [];
  const isUnsure = (exercise: number, field: UnsureField['field']) => unsure.some(u => u.exercise === exercise && u.field === field);
  const lowConfidence = draft.confidence < 0.6;

  const update = (i: number, field: keyof DraftExercise, value: unknown) => onChange(editDraft(draft, i, field, value));
  const remove = (i: number) => onChange(removeFromDraft(draft, i));

  // An optional chip stays while it is being edited, even when emptied
  const [focused, setFocused] = useState<string | null>(null);
  // Detail is optional: the card shows only what was said, and "Add details" opens the number chips
  const [adding, setAdding] = useState<number | null>(null);
  const focus = (key: string) => ({ onFocus: () => setFocused(key), onBlur: () => setFocused(f => (f === key ? null : f)) });

  // A late add ("did legs six days ago") goes to one past day: show that day up top, tappable to change
  const offsets = [...new Set(draft.exercises.map(e => e.dayOffset ?? 0))];
  const single = offsets.length === 1 ? offsets[0] : null;
  // Once shown, the day row stays for this draft, so moving it to today and back to a past day still works
  const [pinned, setPinned] = useState(false);
  if (!pinned && single !== null && single < 0) setPinned(true);
  const backfill = pinned ? single : null;
  const moveTo = (day: Date) => {
    const offset = Math.min(0, differenceInCalendarDays(day, parseISO(date)));
    onChange({ ...draft, exercises: draft.exercises.map(e => ({ ...e, dayOffset: offset || undefined })) });
    // Food logged in the same message moves with it
    if (food) onFoodChange?.({ ...food, items: food.items.map(i => ({ ...i, dayOffset: offset || undefined })) });
  };

  const dayTag = (offset?: number) =>
    !offset || backfill !== null ? null : offset === -1 ? 'Yesterday' : format(addDays(parseISO(date), offset), 'EEE, MMM d');

  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} layout={LinearTransition}>
      <SkyCard>
        <View style={styles.header}>
          <LogoMark size={20} color={colors.sunrise} />
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

        {backfill !== null && (
          <View style={[styles.backfill, { backgroundColor: colors.cobalt + '14' }]}>
            <SymbolView name="calendar" size={16} tintColor={colors.cobalt} />
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={addDays(parseISO(date), backfill)}
                mode="date"
                display="compact"
                maximumDate={parseISO(date)}
                onChange={(_, day) => day && moveTo(day)}
                accentColor={colors.sunrise}
                accessibilityLabel="Day this workout goes on"
              />
            ) : (
              <Text variant="bodyMedium" style={{ color: colors.text }}>{format(addDays(parseISO(date), backfill), 'EEEE, MMM d')}</Text>
            )}
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              {backfill === 0 ? 'Today' : backfill === -1 ? 'Yesterday' : `${-backfill} days ago`}
            </Text>
          </View>
        )}

        {lowConfidence && (
          <View style={[styles.banner, { backgroundColor: colors.warning + '1A' }]} accessibilityLiveRegion="polite">
            <SymbolView name="exclamationmark.triangle" size={16} tintColor={colors.warning} />
            <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>
              I wasn't sure about parts of this. Check it before you save.
            </Text>
          </View>
        )}

        {draft.exercises.map((e, i) => {
          const shown = shownName(e, library);
          return (
          <View key={i} style={[styles.row, { borderTopColor: colors.dim }]}>
            <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.muscleGroup] }]} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <TextInput
                  value={shown.name}
                  onChangeText={name => update(i, 'name', name)}
                  accessibilityLabel="Exercise name"
                  style={[
                    styles.name,
                    { color: colors.text },
                    isUnsure(i, 'name') && [styles.unsure, { backgroundColor: colors.warning + '22', borderColor: colors.warning }],
                  ]}
                />
                {shown.catalog ? (
                  <Text variant="bodySmall" style={[styles.catalogName, { color: colors.textTertiary }]} numberOfLines={1}>· {shown.catalog}</Text>
                ) : null}
                {dayTag(e.dayOffset) && (
                  <Text variant="labelSmall" style={[styles.dayTag, { color: colors.cobalt, backgroundColor: colors.cobalt + '1A' }]}>
                    {dayTag(e.dayOffset)}
                  </Text>
                )}
              </View>
              <View style={styles.numbers}>
                {(['sets', 'reps', 'weight', 'duration', 'distance'] as const)
                  .filter(field => e[field] !== undefined || focused === `${i}:${field}` || (adding === i && (e.muscleGroup === 'cardio' ? field === 'duration' || field === 'distance' : field === 'sets' || field === 'reps' || field === 'weight')))
                  .map(field => (
                    <NumberChip
                      key={field}
                      value={e[field]}
                      suffix={field === 'weight' ? (e.unit === 'kg' ? 'kg' : 'lb') : field === 'duration' ? 'min' : field === 'distance' ? e.distanceUnit ?? '' : field}
                      unsure={isUnsure(i, field)}
                      onChange={v => update(i, field, v)}
                      {...focus(`${i}:${field}`)}
                    />
                  ))}
                {[e.sets, e.reps, e.weight, e.duration, e.distance].every(v => v === undefined) && adding !== i && (
                  <Pressable onPress={() => setAdding(i)} accessibilityRole="button" accessibilityLabel={`Add details to ${e.name}`} hitSlop={6} style={styles.addDetails}>
                    <SymbolView name="plus" size={11} weight="semibold" tintColor={colors.textTertiary} />
                    <Text variant="labelMedium" style={{ color: colors.textTertiary }}>Add details</Text>
                  </Pressable>
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
          );
        })}

        {draft.notes ? (
          <Text variant="bodyMedium" style={[styles.notes, { color: colors.textSecondary }]}>{draft.notes}</Text>
        ) : null}

        {food ? (
          <View style={styles.food}>
            <SectionLabel>Food</SectionLabel>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{foodSummary(food)}</Text>
            <View style={styles.foodRows}>
              <FoodRows items={food.items} onChange={items => onFoodChange?.({ ...food, items })} date={date} />
            </View>
            <EstimateNote food={food} />
          </View>
        ) : null}

        {example ? (
          <View style={styles.actions}>
            <Pill icon="square.and.pencil" label="Log my own" onPress={onDiscard} style={styles.save} />
          </View>
        ) : (
          <>
            <View style={styles.actions}>
              <Pill icon="checkmark" label="Save" onPress={onSave} loading={busy === 'save'} disabled={!!busy || (draft.exercises.length === 0 && !food?.items.length)} style={styles.save} />
              <Pill variant="glass" label="Discard" onPress={onDiscard} disabled={!!busy} style={styles.discard} />
            </View>
            {onFix && <FixBox onFix={onFix} busy={busy === 'fix'} disabled={!!busy} />}
          </>
        )}
        {reply ? <FixReply reply={reply} /> : null}
        {error ? (
          <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}
      </SkyCard>
    </Animated.View>
  );
}

// "Fix something" box: a typed correction re-parses the draft; a question gets a FixReply
export function FixBox({ onFix, busy, disabled, placeholder = 'Fix or ask: "it was rows, not pulldowns"' }: { onFix: (fix: string) => Promise<boolean>; busy: boolean; disabled?: boolean; placeholder?: string }) {
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
        accessibilityLabel="Type a fix or a question"
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

// What the fix box said back: the answer to a question, or that nothing changed
export interface FixReplyState {
  text: string;
  callIt?: { exerciseId: string; words: string }; // offer to call the exercise by the user's words
}

// The fix box's reply, with a one-tap "Call it 'Machine flys' from now on" when the question showed
// the user knows an exercise by other words. Cards then show their words, the catalog name beside it.
export function FixReply({ reply }: { reply: FixReplyState }) {
  const { colors } = useTheme();
  const rememberName = useWorkoutStore(s => s.rememberName);
  const [named, setNamed] = useState(false);
  useEffect(() => setNamed(false), [reply]);
  const words = reply.callIt && sentenceCase(reply.callIt.words);
  return (
    <View style={[styles.reply, { backgroundColor: colors.cobalt + '14' }]} accessibilityLiveRegion="polite">
      <Text variant="bodyMedium" style={{ color: colors.text }}>{reply.text}</Text>
      {reply.callIt && !named ? (
        <Pressable
          onPress={() => {
            rememberName(reply.callIt!.exerciseId, reply.callIt!.words);
            setNamed(true);
          }}
          accessibilityRole="button"
          hitSlop={6}
          style={[styles.callIt, { borderColor: colors.cobalt }]}
        >
          <Text variant="labelLarge" style={{ color: colors.cobalt }}>Call it "{words}" from now on</Text>
        </Pressable>
      ) : null}
      {named ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Done. It's "{words}" from now on.</Text> : null}
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
  backfill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: spacing.gap,
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
  addDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
  },
  numbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  unsure: {
    borderWidth: 1.5,
  },
  notes: {
    marginTop: spacing.sm,
  },
  food: {
    marginTop: spacing.lg,
  },
  foodRows: {
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
  catalogName: {
    flexShrink: 1,
  },
  reply: {
    gap: spacing.sm,
    borderRadius: 14,
    padding: spacing.gap,
    marginTop: spacing.sm,
  },
  callIt: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
