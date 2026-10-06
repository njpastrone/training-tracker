import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Composer, Pill } from '../../components/Glass';
import { UserBubble } from '../../components/Chat';
import ParsedCard from '../../components/ParsedCard';
import { Toast } from '../../components/SelectableWorkoutList';
import { dayLabel } from '../../components/WorkoutCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useLogDraft } from '../../hooks/useLogDraft';
import { digest, target, ExerciseSummary, LiftTrend, Target } from '../../services/insights';
import { daysAgo, lastDoneLine } from '../../services/format';
import { fonts, muscleGroupColors, radius, spacing } from '../../constants/theme';
import type { MuscleGroup, Workout } from '../../types/workout';

const SHOWN = 8; // exercises before "Show all"

// How you're doing, from your own log. Detail is optional: every exercise shows when it was last
// done and how often, and PRs, trends and next targets appear only where there are numbers.
// Missed a workout? Say so in the box at the top and it goes on the right day.
export default function ProgressScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { workouts, exerciseLibrary, settings, deleteWorkouts } = useWorkoutStore();
  const d = useMemo(() => digest(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);
  const trends = useMemo(() => new Map(d.liftTrends.map(t => [t.id, { trend: t, target: target(t) }])), [d]);
  const [showAll, setShowAll] = useState(false);
  const [logged, setLogged] = useState<Workout[] | null>(null);

  const log = useLogDraft({ date: d.today, onLogged: (_id, _template, saved) => setLogged(saved ?? null) });

  const tiles = [
    { value: d.sessionsLast7, label: 'Last 7 days', note: d.usualPerWeek !== null ? `usual ${d.usualPerWeek}` : undefined },
    { value: d.weeksInARow, label: d.weeksInARow === 1 ? 'Week in a row' : 'Weeks in a row' },
    d.liftTrends.length
      ? { value: d.prsLast14Days.length, label: 'PRs · 14 days' }
      : { value: d.totalSessions, label: 'Sessions logged' },
  ];
  const groups = (Object.keys(muscleGroupColors) as MuscleGroup[]).filter(g => d.daysSinceGroupTrained[g] !== undefined);
  const shown = showAll ? d.exercises : d.exercises.slice(0, SHOWN);
  const loggedDays = logged ? [...new Set(logged.map(w => w.date))] : [];

  return (
    <SkyScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LargeTitle title="Progress" />

          {/* Corrections: a missed workout in plain words goes to its own day */}
          {log.sent && <UserBubble text={log.sent} />}
          {log.draft ? (
            <ParsedCard
              draft={log.draft}
              date={d.today}
              onChange={log.setDraft}
              onSave={log.save}
              onDiscard={log.discard}
              onFix={log.fix}
              busy={log.busy}
              error={log.error}
              reply={log.reply}
            />
          ) : (
            <View style={styles.composer}>
              <Composer
                value={log.text}
                onChangeText={log.setText}
                onSend={log.parse}
                placeholder="Forgot something? e.g. 'did legs six days ago'"
                busy={log.busy === 'parse'}
              />
              {log.error && (
                <Text variant="bodySmall" style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
                  {log.error}
                </Text>
              )}
            </View>
          )}

          {workouts.length === 0 ? (
            <SkyCard style={styles.empty}>
              <SymbolView name="chart.line.uptrend.xyaxis" size={30} tintColor={colors.sunrise} />
              <Text variant="titleMedium" style={{ color: colors.text }}>Your progress shows up here</Text>
              <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                Log a workout and you'll see when you last did each exercise and how often. Numbers are optional.
              </Text>
            </SkyCard>
          ) : (
            <>
              <View style={styles.tiles}>
                {tiles.map(tile => (
                  <SkyCard key={tile.label} style={styles.tile}>
                    <Text style={[styles.tileValue, { color: colors.text }]}>{tile.value}</Text>
                    <Text variant="labelMedium" style={{ color: colors.textSecondary }} numberOfLines={1}>{tile.label}</Text>
                    {tile.note && (
                      <Text variant="labelSmall" style={{ color: colors.textTertiary }} numberOfLines={1}>{tile.note}</Text>
                    )}
                  </SkyCard>
                ))}
              </View>

              <SkyCard>
                <SectionLabel>Your exercises</SectionLabel>
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

              <SkyCard>
                <SectionLabel>Days since trained</SectionLabel>
                <View style={styles.groups}>
                  {groups.map(g => {
                    const days = d.daysSinceGroupTrained[g]!;
                    const stale = d.staleGroups.includes(g);
                    return (
                      <Pressable
                        key={g}
                        onPress={() => router.push({ pathname: '/exercise', params: { group: g } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${groupName(g)}, ${daysAgo(days)}${stale ? ', longer than usual' : ''}`}
                        style={({ pressed }) => [
                          styles.group,
                          { backgroundColor: stale ? colors.warning + '1A' : colors.dim, borderColor: stale ? colors.warning : 'transparent' },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.groupName}>
                          <View style={[styles.dot, { backgroundColor: muscleGroupColors[g] }]} />
                          <Text variant="labelMedium" style={{ color: colors.textSecondary }} numberOfLines={1}>{groupName(g)}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
      {logged && (
        <Toast
          key={logged.map(w => w.id).join()}
          icon="checkmark.circle.fill"
          text={`Logged ${loggedDays.map(loggedOn).join(' and ')}`}
          onUndo={() => deleteWorkouts(logged.map(w => w.id))}
          onClose={() => setLogged(null)}
        />
      )}
    </SkyScreen>
  );
}

// "today", "yesterday", "on Friday, Oct 2"
const loggedOn = (date: string) => {
  const label = dayLabel(date);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : `on ${label}`;
};

const groupName = (g: MuscleGroup) => (g === 'full_body' ? 'Full body' : g.charAt(0).toUpperCase() + g.slice(1));

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
  shrink: {
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  composer: {
    marginBottom: spacing.gap,
  },
  error: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  tile: {
    flex: 1,
    marginBottom: 0,
    borderRadius: radius.tile,
    paddingHorizontal: 10,
    paddingVertical: spacing.gap,
  },
  tileValue: {
    fontFamily: fonts.rounded,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
    marginTop: spacing.sm,
  },
  group: {
    width: '31%',
    flexGrow: 1,
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
