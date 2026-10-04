import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, Surface, TextInput, Button, IconButton, Chip, Icon, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, parseISO, subDays } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
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

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    if (turns >= MAX_TURNS) {
      setError('Start a new plan to keep going.');
      return;
    }
    setBusy(true);
    setError(null);
    setTurns(turns + 1);
    try {
      const result = await planWorkouts(message, draft?.plan ?? null, history, messages);
      if (!result) {
        setError(RETRY_MESSAGE);
        return;
      }
      setPrevious(draft);
      setDraft(result);
      setMessages([...messages, message]);
      setInput('');
      setExpanded(result.plan.sessions[0].date);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : RETRY_MESSAGE);
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
  const tagColor = (tag: string) => (tag === 'suggested' ? colors.textSecondary : tag === 'yours' ? colors.secondary : colors.primary);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.titleRow}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.back()} style={styles.backButton} />
          <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>Plan</Text>
          {draft && (
            <Text variant="bodyMedium" numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
              {draft.plan.name}
            </Text>
          )}
          {draft && <Button compact onPress={startOver} textColor={colors.textSecondary}>Start over</Button>}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!draft ? (
            <>
              <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>
                  What should we plan?
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g., Get me back in the gym this week"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  style={{ backgroundColor: colors.background }}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  disabled={busy}
                />
                <View style={styles.chipRow}>
                  {STARTERS.map(label => (
                    <Chip key={label} compact mode="outlined" onPress={() => send(label)} disabled={busy}>
                      {label}
                    </Chip>
                  ))}
                </View>
                <Button
                  mode="contained"
                  icon="creation"
                  onPress={() => send(input)}
                  loading={busy}
                  disabled={busy || !input.trim()}
                  contentStyle={styles.buttonContent}
                >
                  {busy ? 'Planning...' : 'Plan it for me'}
                </Button>
              </Surface>
              <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{context}</Text>
              </Surface>
            </>
          ) : (
            <>
              <Text variant="bodySmall" style={[styles.lastAsk, { color: colors.textSecondary }]}>
                You: {messages[messages.length - 1]}
              </Text>
              <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={[styles.cardTitleInline, { color: colors.text }]}>
                    {draft.plan.name}
                  </Text>
                  <Chip compact style={styles.compactChip} textStyle={styles.compactChipText}>
                    {dateRange(draft.plan)}
                  </Chip>
                </View>
                {!!draft.reply && (
                  <View style={[styles.coachLine, { backgroundColor: colors.primary + '15' }]}>
                    <Icon source="lightbulb-outline" size={16} color={colors.primary} />
                    <Text variant="bodySmall" style={[styles.flex, { color: colors.text }]}>{draft.reply}</Text>
                  </View>
                )}

                {draft.plan.sessions.map((session, i) => {
                  const day = draft.plan.days[session.day];
                  const isOpen = expanded === session.date;
                  const groups = [...new Set(day.exercises.map(e => e.muscleGroup))].slice(0, 3).join(', ');
                  const tag = tags[i];
                  return (
                    <View key={session.date} style={[styles.dayRow, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        style={styles.dayHeader}
                        onPress={() => setExpanded(isOpen ? null : session.date)}
                        accessibilityRole="button"
                        accessibilityLabel={`${day.name} on ${format(parseISO(session.date), 'EEEE MMMM d')}`}
                      >
                        <View style={styles.dow}>
                          <Text variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                            {format(parseISO(session.date), 'EEE')}
                          </Text>
                          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                            {format(parseISO(session.date), 'd')}
                          </Text>
                        </View>
                        <View style={styles.flex}>
                          <View style={styles.nameRow}>
                            <Text variant="bodyLarge" style={{ color: colors.text, fontWeight: '600' }}>{day.name}</Text>
                            {tag && (
                              <Text style={[styles.tag, { color: tagColor(tag), borderColor: tagColor(tag) }]}>{tag}</Text>
                            )}
                          </View>
                          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                            {day.exercises.length} exercises · {groups}
                          </Text>
                        </View>
                        <Icon source={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={styles.exerciseList}>
                          {session.note && (
                            <Text variant="bodySmall" style={[styles.note, { color: colors.primary }]}>{session.note}</Text>
                          )}
                          {day.exercises.map((e, j) => (
                            <View key={j} style={styles.exerciseRow}>
                              <Text variant="bodyMedium" style={[styles.flex, { color: colors.text }]}>{e.name}</Text>
                              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                                {e.sets}×{e.reps}{e.weight ? ` · ${e.weight} ${unit}` : ''}
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
                    <Button compact onPress={undoTweak}>Undo</Button>
                  </View>
                )}
              </Surface>

              <View style={styles.tweakLabel}>
                <Icon source="lightbulb-outline" size={16} color={colors.primary} />
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Tweak it</Text>
              </View>
              <View style={styles.chipRow}>
                {(draft.chips.length ? draft.chips : DEFAULT_TWEAKS).map(label => (
                  <Chip key={label} compact mode="outlined" onPress={() => send(label)} disabled={busy}>
                    {label}
                  </Chip>
                ))}
              </View>
              <View style={styles.sendRow}>
                <TextInput
                  mode="outlined"
                  placeholder="Or tell me what to change…"
                  value={input}
                  onChangeText={setInput}
                  dense
                  style={[styles.flex, { backgroundColor: colors.background }]}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  disabled={busy}
                  onSubmitEditing={() => send(input)}
                />
                <IconButton
                  icon="send"
                  mode="contained"
                  containerColor={colors.primary}
                  iconColor="#FFFFFF"
                  onPress={() => send(input)}
                  disabled={busy || !input.trim()}
                  loading={busy}
                  accessibilityLabel="Send"
                />
              </View>
            </>
          )}
          {error && <HelperText type="error" visible>{error}</HelperText>}
        </ScrollView>

        {draft && preview && (
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {preview.replaced > 0 && (
              <Text variant="bodySmall" style={[styles.replaced, { color: colors.textSecondary }]}>
                Replaces {preview.replaced} scheduled workout{preview.replaced === 1 ? '' : 's'}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={planIt}
              loading={saving}
              disabled={saving || busy || preview.sessions.length === 0}
              contentStyle={styles.buttonContent}
            >
              Plan it · {preview.sessions.length} workout{preview.sessions.length === 1 ? '' : 's'}
            </Button>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  backButton: {
    marginLeft: -8,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitleInline: {
    fontWeight: '600',
    flex: 1,
  },
  compactChip: {
    height: 24,
  },
  compactChipText: {
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  lastAsk: {
    marginBottom: spacing.sm,
  },
  coachLine: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  dayRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  dow: {
    width: 36,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  exerciseList: {
    paddingLeft: 36 + spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replaced: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
