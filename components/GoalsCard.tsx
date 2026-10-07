import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SkyCard, SectionLabel } from './Sky';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { resolveId } from '../services/exerciseIdentity';
import { daysAgo } from '../services/format';
import { formatSets, muscleName, type CustomProgress, type MuscleProgress, type goalProgress } from '../services/goals';
import { muscleGroupColors, spacing } from '../constants/theme';
import type { MuscleGroup } from '../types/workout';

// Above this text size the grid becomes one muscle per row, so no label is ever cut off
export const LIST_AT_FONT_SCALE = 1.3;

interface Props {
  progress: ReturnType<typeof goalProgress>;
  daysSince: Partial<Record<MuscleGroup, number>>;
}

// Goals on Progress: each muscle's days and sets against its goals (it replaces "Days since trained"),
// then your own goals. Two muscles a row; one at large text sizes. Labels wrap, never truncate.
// The section label and Edit sit above the card, like every section label.
export default function GoalsCard({ progress, daysSince }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const perRow = fontScale > LIST_AT_FONT_SCALE ? 1 : 2;
  const { muscles, custom, timesMet, setsMet } = progress;
  const rows = Array.from({ length: Math.ceil(muscles.length / perRow) }, (_, i) => muscles.slice(i * perRow, (i + 1) * perRow));
  const total = muscles.length;
  const summary = [
    muscles[0]?.timesGoal !== undefined && `${timesMet} of ${total} trained ${muscles[0].timesGoal}×`,
    muscles[0]?.setsGoal !== undefined && `${setsMet} of ${total} at minimum sets`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <View style={styles.header}>
        <SectionLabel style={styles.fill}>Goals · last 7 days</SectionLabel>
        <Pressable onPress={() => router.push('/goals')} accessibilityRole="button" accessibilityLabel="Edit goals" hitSlop={10}>
          <Text variant="labelLarge" style={{ color: colors.sunrise }}>Edit</Text>
        </Pressable>
      </View>
      <SkyCard>
        {summary ? <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{summary}</Text> : null}

        {rows.map(row => (
          <View key={row[0].group} style={styles.gridRow}>
            {row.map(m => (
              <MuscleTile key={m.group} m={m} days={daysSince[m.group]} onPress={() => router.push({ pathname: '/exercise', params: { group: m.group } })} />
            ))}
            {row.length < perRow && <View style={styles.fill} />}
          </View>
        ))}

        {custom.map((c, i) => (
          <CustomRow key={c.goal.id} c={c} first={i === 0 && total === 0} />
        ))}
      </SkyCard>
    </>
  );
}

function MuscleTile({ m, days, onPress }: { m: MuscleProgress; days?: number; onPress: () => void }) {
  const { colors } = useTheme();
  const name = muscleName(m.group);
  const times = m.timesGoal !== undefined ? `${m.times} of ${m.timesGoal} times` : undefined;
  const sets = m.setsGoal !== undefined ? `${formatSets(m.sets, m.setsMissing)} of ${m.setsGoal} sets` : undefined;
  const last = days === undefined ? 'Not trained yet' : `Trained ${daysAgo(days)}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, times, sets, last, m.met && 'goal met'].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.dim, borderColor: m.met ? colors.mint : 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.nameRow}>
        <View style={[styles.dot, { backgroundColor: muscleGroupColors[m.group] }]} />
        <Text variant="titleSmall" style={[styles.shrink, { color: colors.text }]}>{name}</Text>
        {m.met && <SymbolView name="checkmark.circle.fill" size={15} tintColor={colors.mint} />}
      </View>
      {times && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{times}</Text>}
      {sets && (
        <>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{sets}</Text>
          <Bar progress={m.sets / m.setsGoal!} done={m.sets >= m.setsGoal!} />
        </>
      )}
      <Text variant="labelSmall" style={[styles.last, { color: colors.textTertiary }]}>{last}</Text>
    </Pressable>
  );
}

function CustomRow({ c, first }: { c: CustomProgress; first: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const library = useWorkoutStore(s => s.exerciseLibrary);
  const { goal } = c;
  const title = goal.kind === 'lift' ? `${c.name} ${goal.weight} ${goal.unit}` : `${c.name} ${goal.perWeek}× a week`;
  const status = goal.kind === 'often' ? `${c.now} of ${c.target} days` : c.met ? 'Reached' : c.now ? `${c.now} now` : 'Not logged yet';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise', params: { id: resolveId(goal.exerciseId, library) } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      style={({ pressed }) => [styles.custom, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.customText}>
        <Text variant="bodyLarge" style={[styles.shrink, { color: colors.text }]}>{title}</Text>
        <Text variant="bodyMedium" style={{ color: c.met ? colors.mint : colors.textSecondary }}>{status}</Text>
      </View>
      <Bar progress={c.now / c.target} done={c.met} />
    </Pressable>
  );
}

function Bar({ progress, done }: { progress: number; done: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.dim }]}>
      <View style={[styles.bar, { width: `${Math.min(100, progress * 100)}%`, backgroundColor: done ? colors.mint : colors.sunrise }]} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    gap: 2,
    minHeight: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  last: {
    marginTop: 2,
  },
  custom: {
    paddingVertical: spacing.gap,
    gap: 6,
    minHeight: 44,
  },
  customText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
