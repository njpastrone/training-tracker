import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { SectionLabel } from '../components/Sky';
import { Pill } from '../components/Glass';
import { UserBubble } from '../components/Chat';
import { FixBox } from '../components/ParsedCard';
import Field from '../components/Field';
import { ApiError } from '../services/claude';
import { getPlans, planWorkouts, previewPlan, savePlan, summarizeHistory } from '../services/planner';
import { PlanDraft, PlannerResponse, PlanSession, TrainingPlan } from '../types/plan';

// ponytail: ~8 AI turns per planning session keeps one user from draining the shared daily cap
const MAX_TURNS = 8;
const STARTERS = ['Re-entry week', 'Next week', 'PPL split', 'Upper / lower', '3 days a week'];
const DEFAULT_TWEAKS = ['Easier', 'Harder', '45 min max', 'Different days', 'Add cardio'];
const RETRY_MESSAGE = "Couldn't build that, try again.";

// "new" / "changed" after a tweak; otherwise "yours" / "suggested" when the plan mixes in the user's own days
function rowTag(session: PlanSession, plan: PlanDraft, previous: PlanDraft | null): string | null {
  if (previous) {
    const old = previous.sessions.find(s => s.date === session.date);
    if (!old) return 'new';
    const same = JSON.stringify(previous.days[old.day]) === JSON.stringify(plan.days[session.day]) && old.note === session.note;
    return same ? null : 'changed';
  }
  if (!Object.values(plan.days).some(d => d.source === 'mine')) return null;
  return plan.days[session.day].source === 'mine' ? 'yours' : 'suggested';
}

function dateRange(plan: PlanDraft): string {
  const first = parseISO(plan.sessions[0].date);
  const last = parseISO(plan.sessions[plan.sessions.length - 1].date);
  const range = format(first, 'MMM') === format(last, 'MMM')
    ? `${format(first, 'MMM d')}–${format(last, 'd')}`
    : `${format(first, 'MMM d')}–${format(last, 'MMM d')}`;
  return plan.repeatWeeks > 1 ? `${format(first, 'MMM d')} · ${plan.repeatWeeks} weeks` : range;
}

export default function PlanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { workouts, schedule, settings, loadSchedule, loadTemplates } = useWorkoutStore();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [draft, setDraft] = useState<PlannerResponse | null>(null);
  const [previous, setPrevious] = useState<PlannerResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
    getPlans().then(setPlans);
  }, []);

  const history = useMemo(
    () => summarizeHistory(workouts, schedule, plans, settings.weightUnit),
    [workouts, schedule, plans, settings.weightUnit]
  );
  const preview = draft ? previewPlan(draft.plan, schedule) : null;
  const unit = settings.weightUnit === 'kg' ? 'kg' : 'lb';

  // Returns whether the plan was updated
  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return false;
    if (turns >= MAX_TURNS) {
      setError('Start a new plan to keep going.');
      return false;
    }
    setBusy(true);
    setError(null);
    setTurns(turns + 1);
    try {
      const result = await planWorkouts(message, draft?.plan ?? null, history, messages);
      if (!result) {
        setError(RETRY_MESSAGE);
        return false;
      }
      setPrevious(draft);
      setDraft(result);
      setMessages([...messages, message]);
      setInput('');
      setExpanded(result.plan.sessions[0].date);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const undoTweak = () => {
    setDraft(previous);
    setPrevious(null);
    setMessages(messages.slice(0, -1));
  };

  const startOver = () => {
    setDraft(null);
    setPrevious(null);
    setMessages([]);
    setTurns(0);
    setInput('');
    setError(null);
  };

  const planIt = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const plan = await savePlan(draft.plan, messages[0], settings.weightUnit);
      await Promise.all([loadSchedule(), loadTemplates()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate({ pathname: '/(tabs)/history', params: { planId: plan.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const lastWorkout = history.daysSinceLastWorkout === null
    ? null
    : format(subDays(new Date(), history.daysSinceLastWorkout), 'MMM d');
  const context = lastWorkout
    ? `From your log: last workout ${lastWorkout} (${history.daysSinceLastWorkout} days ago) · about ${history.workoutsPerWeek.prior8w || history.workoutsPerWeek.last4w}/week before that${history.usualDays.length ? `, usually ${history.usualDays.join(', ')}` : ''}`
    : 'No workouts logged yet, so the plan starts from scratch.';

  const tags = draft ? draft.plan.sessions.map(s => rowTag(s, draft.plan, previous?.plan ?? null)) : [];
  const changedCount = previous ? tags.filter(Boolean).length : 0;
  const tagColor = (tag: string) => (tag === 'suggested' ? colors.textSecondary : tag === 'yours' ? colors.cobalt : colors.sunrise);
  // The first week as a strip of seven days, planned days filled
  const weekStart = draft ? startOfWeek(parseISO(draft.plan.sessions[0].date), { weekStartsOn: 1 }) : null;
  const plannedDates = new Set(draft?.plan.sessions.map(s => s.date));

  return (
    // Presented as a form sheet (app/_layout.tsx); the grabber replaces a header
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.sheetHead}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={[styles.round, { backgroundColor: colors.dim }]}>
            <SymbolView name="xmark" size={14} weight="semibold" tintColor={colors.textSecondary} />
          </Pressable>
          <Text variant="titleMedium" style={{ color: colors.text }}>Plan</Text>
          {draft ? (
            <Pressable onPress={startOver} accessibilityRole="button" hitSlop={8}>
              <Text variant="labelLarge" style={{ color: colors.sunrise }}>Start over</Text>
            </Pressable>
          ) : (
            <View style={styles.round} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!draft ? (
            <>
              <Text style={[styles.bigTitle, { color: colors.text }]}>What should we plan?</Text>
              <Field
                placeholder="e.g., Get me back in the gym this week"
                value={input}
                onChangeText={setInput}
                multiline
                editable={!busy}
                accessibilityLabel="What should we plan?"
              />
              <View style={styles.chipRow}>
                {STARTERS.map(label => (
                  <Pill key={label} variant="glass" size="small" label={label} onPress={() => send(label)} disabled={busy} />
                ))}
              </View>
              <Pill
                icon="text.bubble"
                label={busy ? 'Planning…' : 'Plan it for me'}
                onPress={() => send(input)}
                loading={busy}
                disabled={!input.trim()}
              />
              <Text variant="bodySmall" style={[styles.context, { color: colors.textTertiary }]}>{context}</Text>
            </>
          ) : (
            <>
              <UserBubble text={messages[messages.length - 1]} />
              <Text style={[styles.bigTitle, styles.planTitle, { color: colors.text }]}>{draft.plan.name}</Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                {dateRange(draft.plan)} · {draft.plan.sessions.length} workout{draft.plan.sessions.length === 1 ? '' : 's'}
              </Text>

              {weekStart && (
                <View style={styles.week}>
                  {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(d => {
                    const on = plannedDates.has(format(d, 'yyyy-MM-dd'));
                    return (
                      <View key={d.toISOString()} style={styles.weekDay} accessible accessibilityLabel={`${format(d, 'EEEE')}${on ? ', workout' : ''}`}>
                        <View style={[styles.weekDot, on ? { backgroundColor: colors.cobalt } : { borderWidth: 1.5, borderColor: colors.dim }]}>
                          <Text style={[styles.weekLetter, { color: on ? colors.onSunrise : colors.textTertiary }]}>{format(d, 'EEEEE')}</Text>
                        </View>
                        <Text style={[styles.weekNumber, { color: colors.textTertiary }]}>{format(d, 'd')}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {!!draft.reply && (
                <View style={styles.coachLine}>
                  <SymbolView name="text.bubble" size={16} tintColor={colors.sunrise} />
                  <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>{draft.reply}</Text>
                </View>
              )}

              {draft.plan.sessions.map((session, i) => {
                const day = draft.plan.days[session.day];
                const isOpen = expanded === session.date;
                const groups = [...new Set(day.exercises.map(e => e.muscleGroup))].slice(0, 3).join(', ');
                const tag = tags[i];
                return (
                  <View key={session.date} style={[styles.dayRow, { borderTopColor: colors.dim }]}>
                    <Pressable
                      style={styles.dayHeader}
                      onPress={() => setExpanded(isOpen ? null : session.date)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={`${day.name} on ${format(parseISO(session.date), 'EEEE MMMM d')}`}
                    >
                      <View style={styles.dow}>
                        <Text style={[styles.dowName, { color: colors.textTertiary }]}>{format(parseISO(session.date), 'EEE')}</Text>
                        <Text style={[styles.dowNumber, { color: colors.text }]}>{format(parseISO(session.date), 'd')}</Text>
                      </View>
                      <View style={styles.flex}>
                        <View style={styles.nameRow}>
                          <Text variant="bodyLarge" style={{ color: colors.text, fontWeight: '600' }}>{day.name}</Text>
                          {tag && (
                            <Text style={[styles.tag, { color: tagColor(tag), backgroundColor: tagColor(tag) + '1A' }]}>{tag}</Text>
                          )}
                        </View>
                        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                          {day.exercises.length} exercises · {groups}
                        </Text>
                      </View>
                      <SymbolView name={isOpen ? 'chevron.up' : 'chevron.down'} size={13} weight="semibold" tintColor={colors.textTertiary} />
                    </Pressable>
                    {isOpen && (
                      <View style={styles.exerciseList}>
                        {session.note && (
                          <Text variant="bodySmall" style={[styles.note, { color: colors.sunrise }]}>{session.note}</Text>
                        )}
                        {day.exercises.map((e, j) => (
                          <View key={j} style={styles.exerciseRow}>
                            <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.muscleGroup] }]} />
                            <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>{e.name}</Text>
                            <Text variant="labelMedium" style={{ color: colors.textSecondary }}>
                              {e.sets} × {e.reps}{e.weight ? ` · ${e.weight} ${unit}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {draft.plan.repeatWeeks > 1 && (
                <Text variant="bodySmall" style={[styles.meta, { color: colors.textSecondary }]}>
                  Repeats every week for {draft.plan.repeatWeeks} weeks
                </Text>
              )}
              {previous && (
                <View style={styles.undoRow}>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                    Changed {changedCount} day{changedCount === 1 ? '' : 's'}
                  </Text>
                  <Pill variant="glass" size="small" icon="arrow.uturn.backward" label="Undo" onPress={undoTweak} />
                </View>
              )}

              <SectionLabel style={styles.tweakLabel}>Tweak it</SectionLabel>
              <View style={styles.chipRow}>
                {(draft.chips.length ? draft.chips : DEFAULT_TWEAKS).map(label => (
                  <Pill key={label} variant="glass" size="small" label={label} onPress={() => send(label)} disabled={busy} />
                ))}
              </View>
              <FixBox onFix={send} busy={busy} disabled={busy} placeholder="Or tell me what to change…" />
            </>
          )}
          {error && (
            <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>
          )}
        </ScrollView>

        {draft && preview && (
          <View style={styles.footer}>
            {preview.replaced > 0 && (
              <Text variant="bodySmall" style={[styles.replaced, { color: colors.textSecondary }]}>
                Replaces {preview.replaced} scheduled workout{preview.replaced === 1 ? '' : 's'}
              </Text>
            )}
            <Pill
              icon="calendar.badge.plus"
              label={`Plan it · ${preview.sessions.length} workout${preview.sessions.length === 1 ? '' : 's'}`}
              onPress={planIt}
              loading={saving}
              disabled={busy || preview.sessions.length === 0}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
  },
  bigTitle: {
    fontFamily: fonts.rounded,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    marginBottom: spacing.gap,
  },
  planTitle: {
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: spacing.gap,
  },
  context: {
    marginTop: spacing.md,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.gap,
  },
  weekDay: {
    alignItems: 'center',
    gap: 4,
  },
  weekDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLetter: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
  weekNumber: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
  },
  coachLine: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayRow: {
    borderTopWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    minHeight: 52,
  },
  dow: {
    width: 44,
    alignItems: 'center',
  },
  dowName: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
  dowNumber: {
    fontFamily: fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    fontSize: 11.5,
    fontWeight: '600',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  exerciseList: {
    paddingLeft: 44 + spacing.sm,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  note: {
    fontWeight: '500',
  },
  meta: {
    marginTop: spacing.sm,
  },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  tweakLabel: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  replaced: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
