import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen, logBar } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import ParsedCard from '../../components/ParsedCard';
import GoalsCard, { LIST_AT_FONT_SCALE } from '../../components/GoalsCard';
import { Toast } from '../../components/SelectableWorkoutList';
import { dayLabel } from '../../components/WorkoutCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useLogDraft } from '../../hooks/useLogDraft';
import { digest, target, ExerciseSummary, LiftTrend, Target } from '../../services/insights';
import { daysAgo, lastDoneLine, paceLine } from '../../services/format';
import { NO_GOALS, goalProgress, muscleName } from '../../services/goals';
import { missedChips } from '../../services/suggestions';
import { fonts, muscleGroupColors, spacing } from '../../constants/theme';
import type { MuscleGroup, Workout } from '../../types/workout';

const SHOWN = 8; // exercises before "Show all"

// How you're doing, from your own log: goals first (or a prompt to set them), then every exercise with
// when it was last done and how often; PRs, trends and next targets only where there are numbers.
// Missed a workout? Say so in the chat bar and it goes on the right day; a planned day you never logged is a chip.
export default function ProgressScreen() {
  const { colors, sky } = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const { workouts, exerciseLibrary, settings, updateSettings, deleteWorkouts, schedule, templates } = useWorkoutStore();
  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);
  const trends = useMemo(() => new Map(d.liftTrends.map(t => [t.id, { trend: t, target: target(t) }])), [d]);
  const goals = useMemo(() => settings.goals && goalProgress(settings.goals, workouts, exerciseLibrary), [settings.goals, workouts, exerciseLibrary]);
  const hasGoals = !!goals && (goals.muscles.length > 0 || goals.custom.length > 0);
  const chips = useMemo(() => missedChips(workouts, schedule, templates), [workouts, schedule, templates]);
  const [showAll, setShowAll] = useState(false);
  const [logged, setLogged] = useState<Workout[] | null>(null);

  const log = useLogDraft({ date: d.today, onLogged: (_id, _template, saved) => setLogged(saved ?? null) });

  const groups = (Object.keys(muscleGroupColors) as MuscleGroup[]).filter(g => d.daysSinceGroupTrained[g] !== undefined);
  const shown = showAll ? d.exercises : d.exercises.slice(0, SHOWN);
  const loggedDays = logged ? [...new Set(logged.map(w => w.date))] : [];
  const reviewing = !!log.sent || !!log.draft;

  return (
    <ChatScreen
      bar={logBar(log, "Forgot something? 'legs on Wed'", chips)}
      follow={reviewing}
      overlay={
        logged && (
          <Toast
            key={logged.map(w => w.id).join()}
            icon="checkmark.circle.fill"
            text={`Logged ${loggedDays.map(loggedOn).join(' and ')}`}
            onUndo={() => deleteWorkouts(logged.map(w => w.id))}
            onClose={() => setLogged(null)}
          />
        )
      }
    >
      <LargeTitle title="Progress" subtitle={paceLine(sky.done, sky.target)} />

      {/* Corrections: a missed workout in plain words goes to its own day */}
      {log.sent && <UserBubble text={log.sent} />}
      {log.draft && (
        <ParsedCard
          draft={log.draft}
          date={d.today}
          onChange={log.setDraft}
          onSave={log.save}
          onDiscard={log.discard}
          busy={log.busy}
          error={log.error}
          reply={log.reply}
        />
      )}

      {reviewing ? null : workouts.length === 0 ? (
        <SkyCard style={styles.empty}>
          <SymbolView name="chart.line.uptrend.xyaxis" size={30} tintColor={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>Your progress shows up here</Text>
          <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
            Log a workout and you'll see when you last did each exercise and how often. Numbers are optional.
          </Text>
        </SkyCard>
      ) : (
        <>
          {/* Goals lead the page; until there are some, a prompt to set them (it stays gone after Not now) */}
          {hasGoals ? (
            <GoalsCard progress={goals} daysSince={d.daysSinceGroupTrained} />
          ) : (
            !settings.goalsPromptDismissed && (
              <GoalsPrompt
                onPreset={() => updateSettings({ goals: { ...(settings.goals ?? NO_GOALS), timesPerWeek: 2 } })}
                onOwn={() => router.push('/goals')}
                onNotNow={() => updateSettings({ goalsPromptDismissed: true })}
              />
            )
          )}

          <SectionLabel style={styles.label}>Your exercises</SectionLabel>
          <SkyCard>
            {shown.map((e, i) => (
              <ExerciseRow
                key={e.id}
                exercise={e}
                lift={trends.get(e.id)}
                first={i === 0}
                onPress={() => router.push({ pathname: '/exercise', params: { id: e.id } })}
              />
            ))}
            {d.exercises.length > SHOWN && (
              <Pill
                variant="glass"
                size="small"
                label={showAll ? 'Show fewer' : `Show all ${d.exercises.length}`}
                onPress={() => setShowAll(!showAll)}
                style={styles.more}
              />
            )}
          </SkyCard>

          {/* With muscle goals on, the goals card shows each muscle instead */}
          {!goals?.muscles.length && (
            <>
              <View style={[styles.header, styles.label]}>
                <SectionLabel style={styles.fill}>Days since trained</SectionLabel>
                {!goals?.custom.length && settings.goalsPromptDismissed && (
                  <Pressable onPress={() => router.push('/goals')} accessibilityRole="button" hitSlop={10}>
                    <Text variant="labelLarge" style={{ color: colors.sunrise }}>Set goals</Text>
                  </Pressable>
                )}
              </View>
              <SkyCard>
                <View style={styles.groups}>
                  {groups.map(g => {
                    const days = d.daysSinceGroupTrained[g]!;
                    const stale = d.staleGroups.includes(g);
                    return (
                      <Pressable
                        key={g}
                        onPress={() => router.push({ pathname: '/exercise', params: { group: g } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${muscleName(g)}, ${daysAgo(days)}${stale ? ', longer than usual' : ''}`}
                        style={({ pressed }) => [
                          styles.group,
                          { width: fontScale > LIST_AT_FONT_SCALE ? '100%' : '48%' }, // two a row so names fit; one at large text
                          { backgroundColor: stale ? colors.warning + '1A' : colors.dim, borderColor: stale ? colors.warning : 'transparent' },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.groupName}>
                          <View style={[styles.dot, { backgroundColor: muscleGroupColors[g] }]} />
                          <Text variant="labelMedium" style={[styles.shrink, { color: colors.textSecondary }]}>{muscleName(g)}</Text>
                        </View>
                        <Text style={[styles.groupDays, { color: stale ? colors.warning : colors.text }]}>
                          {days === 0 ? 'Today' : `${days}d`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </SkyCard>
            </>
          )}
        </>
      )}
    </ChatScreen>
  );
}

// "today", "yesterday", "on Friday, Oct 2"
const loggedOn = (date: string) => {
  const label = dayLabel(date);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : `on ${label}`;
};

// The first-use prompt for goals: the owner's own goal in one tap, your own on the Goals screen
function GoalsPrompt({ onPreset, onOwn, onNotNow }: { onPreset: () => void; onOwn: () => void; onNotNow: () => void }) {
  const { colors } = useTheme();
  return (
    <SkyCard>
      <View style={styles.promptTop}>
        <View style={[styles.promptIcon, { backgroundColor: colors.dim }]}>
          <SymbolView name="target" size={17} weight="semibold" tintColor={colors.sunrise} />
        </View>
        <View style={styles.fill}>
          <Text variant="titleMedium" style={{ color: colors.text }}>Set a weekly goal</Text>
          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
            See which muscles you've covered in the last 7 days, and what's left.
          </Text>
        </View>
      </View>
      <View style={styles.promptActions}>
        <Pill size="small" label="Each muscle 2× a week" onPress={onPreset} />
        <Pill variant="glass" size="small" label="My own goals" onPress={onOwn} />
      </View>
      <Pressable onPress={onNotNow} accessibilityRole="button" hitSlop={10} style={styles.notNow}>
        <Text variant="labelMedium" style={{ color: colors.textTertiary }}>Not now</Text>
      </Pressable>
    </SkyCard>
  );
}

// One exercise: when and how often for everyone; trend, PR and next target only with numbers
function ExerciseRow({ exercise, lift, first, onPress }: { exercise: ExerciseSummary; lift?: { trend: LiftTrend; target: Target }; first: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const stuck = lift && lift.trend.sessionsAtSameTopSet >= 3 ? lift.trend.sessionsAtSameTopSet : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Shows every time, or adds a past session"
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.fill}>
        <View style={styles.nameRow}>
          <Text variant="bodyLarge" style={[styles.shrink, { color: colors.text }]} numberOfLines={1}>{exercise.name}</Text>
          {lift?.trend.isAllTimeBest && (
            <Text variant="labelSmall" style={[styles.badge, { color: colors.mint, backgroundColor: colors.mint + '1F' }]}>PR</Text>
          )}
        </View>
        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{lastDoneLine(exercise)}</Text>
        {lift && (
          <Text variant="bodySmall" style={{ color: stuck ? colors.warning : colors.textTertiary }}>
            {stuck ? `● stuck ${stuck} sessions · next ${lift.target.next}` : `next ${lift.target.next}`}
          </Text>
        )}
      </View>
      {lift && <Sparkline weights={lift.trend.recent.map(s => s.weight).reverse()} color={colors.sunrise} />}
      <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
    </Pressable>
  );
}

// The last few top weights, oldest to newest
function Sparkline({ weights, color }: { weights: number[]; color: string }) {
  const W = 56;
  const H = 22;
  const min = Math.min(...weights);
  const span = Math.max(...weights) - min || 1;
  const points = weights.map((w, i) => `${(i / (weights.length - 1)) * W},${H - 2 - ((w - min) / span) * (H - 4)}`).join(' ');
  return (
    <Svg width={W} height={H} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shrink: {
    flexShrink: 1,
  },
  center: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  label: {
    marginHorizontal: spacing.xs,
    marginTop: spacing.gap, // 24 pt below the card above
    marginBottom: spacing.sm,
  },
  promptTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notNow: {
    alignSelf: 'flex-start',
    marginTop: spacing.gap,
    minHeight: 24,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.6,
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  group: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  groupName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupDays: {
    fontFamily: fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
