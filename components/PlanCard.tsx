import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { previewPlan } from '../services/planner';
import { PlanDraft, PlannerResponse, PlanSession } from '../types/plan';
import { SkyCard } from './Sky';
import { Pill } from './Glass';
import LogoMark from './LogoMark';

interface Props {
  draft: PlannerResponse;
  previous: PlannerResponse | null;
  preview: ReturnType<typeof previewPlan>;
  context: string;
  busy: boolean;
  saving: boolean;
  error: string | null;
  onPlanIt: () => void;
  onUndo: () => void;
  onStartOver: () => void;
}

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

// The planned week, reviewed before anything is scheduled: tweak it in the chat bar, then Plan it
export default function PlanCard({ draft, previous, preview, context, busy, saving, error, onPlanIt, onUndo, onStartOver }: Props) {
  const { colors } = useTheme();
  const unit = useWorkoutStore(s => s.settings.weightUnit) === 'kg' ? 'kg' : 'lb';
  const [expanded, setExpanded] = useState<string | null>(draft.plan.sessions[0]?.date ?? null);
  const [shownFor, setShownFor] = useState(draft);
  // A new plan or tweak opens its first day
  if (shownFor !== draft) {
    setShownFor(draft);
    setExpanded(draft.plan.sessions[0]?.date ?? null);
  }

  const tags = draft.plan.sessions.map(s => rowTag(s, draft.plan, previous?.plan ?? null));
  const changedCount = previous ? tags.filter(Boolean).length : 0;
  const tagColor = (tag: string) => (tag === 'suggested' ? colors.textSecondary : tag === 'yours' ? colors.cobalt : colors.sunrise);
  // The first week as a strip of seven days, planned days filled
  const weekStart = startOfWeek(parseISO(draft.plan.sessions[0].date), { weekStartsOn: 1 });
  const plannedDates = new Set(draft.plan.sessions.map(s => s.date));

  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} layout={LinearTransition}>
      <SkyCard>
        <View style={styles.header}>
          <LogoMark size={20} color={colors.sunrise} />
          <Text variant="titleMedium" style={[styles.flex, { color: colors.text }]}>{draft.plan.name}</Text>
          <Pressable onPress={onStartOver} accessibilityRole="button" hitSlop={8}>
            <Text variant="labelLarge" style={{ color: colors.sunrise }}>Start over</Text>
          </Pressable>
        </View>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          {dateRange(draft.plan)} · {draft.plan.sessions.length} workout{draft.plan.sessions.length === 1 ? '' : 's'}
        </Text>

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

        {!!draft.reply && (
          <View style={[styles.reply, { backgroundColor: colors.cobalt + '14' }]} accessibilityLiveRegion="polite">
            <Text variant="bodyMedium" style={{ color: colors.text }}>{draft.reply}</Text>
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
                    {tag && <Text style={[styles.tag, { color: tagColor(tag), backgroundColor: tagColor(tag) + '1A' }]}>{tag}</Text>}
                  </View>
                  <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                    {day.exercises.length} exercises · {groups}
                  </Text>
                </View>
                <SymbolView name={isOpen ? 'chevron.up' : 'chevron.down'} size={13} weight="semibold" tintColor={colors.textTertiary} />
              </Pressable>
              {isOpen && (
                <View style={styles.exerciseList}>
                  {session.note && <Text variant="bodySmall" style={[styles.note, { color: colors.sunrise }]}>{session.note}</Text>}
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
            <Pill variant="glass" size="small" icon="arrow.uturn.backward" label="Undo" onPress={onUndo} disabled={busy} />
          </View>
        )}

        {preview.replaced > 0 && (
          <Text variant="bodySmall" style={[styles.replaced, { color: colors.textSecondary }]}>
            Replaces {preview.replaced} scheduled workout{preview.replaced === 1 ? '' : 's'}
          </Text>
        )}
        <Pill
          icon="calendar.badge.plus"
          label={`Plan it · ${preview.sessions.length} workout${preview.sessions.length === 1 ? '' : 's'}`}
          onPress={onPlanIt}
          loading={saving}
          disabled={busy || preview.sessions.length === 0}
          style={styles.planIt}
        />
        <Text variant="bodySmall" style={[styles.meta, { color: colors.textTertiary }]}>{context}</Text>
        {error && (
          <Text variant="bodySmall" style={[styles.meta, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>
        )}
      </SkyCard>
    </Animated.View>
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
    marginBottom: 2,
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
  reply: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.gap,
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
  replaced: {
    textAlign: 'center',
    marginTop: spacing.gap,
  },
  planIt: {
    marginTop: spacing.gap,
  },
});
