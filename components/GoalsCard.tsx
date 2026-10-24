import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { resolveId } from '../services/exerciseIdentity';
import { formatSets, muscleName, type CustomProgress } from '../services/goals';
import type { Cell, MuscleWeekRow, WeekDay } from '../services/week';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import type { MuscleGroup } from '../types/workout';

// The goal cards on Training: this week as a grid (goal muscles down the side, the days across, sets on
// the right), and your own lift and "do it often" goals.

// Above this text size grids become lists, so no label is ever cut off
export const LIST_AT_FONT_SCALE = 1.3;

const unitLabel = (unit: 'lbs' | 'kg') => (unit === 'kg' ? 'kg' : 'lb');

// This week: a muscle-coloured dot on each day a goal muscle was trained as a main muscle, a dashed ring
// on a day it's planned, and its sets so far, ✓ in the tab's hue once the goal is met. Tapping a row opens the muscle.
export function MuscleGrid({ rows, days }: { rows: MuscleWeekRow[]; days: WeekDay[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const list = fontScale > LIST_AT_FONT_SCALE; // large text: each row's name on its own line
  const label = (group: MuscleGroup) => (
    <View style={list ? styles.listLabel : styles.gridLabel}>
      <View style={[styles.dot, { backgroundColor: muscleGroupColors[group] }]} />
      <Text style={[styles.gridName, styles.shrink, { color: colors.text }]}>{muscleName(group)}</Text>
    </View>
  );
  const cell = (c: Cell, group: MuscleGroup) =>
    c === 'on' ? (
      <View style={[styles.dayDot, { backgroundColor: muscleGroupColors[group] }]} />
    ) : c === 'plan' ? (
      <View style={[styles.planDot, { borderColor: colors.textTertiary }]} />
    ) : (
      <View style={[styles.restDot, { backgroundColor: colors.dim }]} />
    );

  return (
    <View style={styles.grid}>
      <View style={styles.gridRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {!list && <View style={styles.gridLabel} />}
        {days.map(d => (
          <Text key={d.date} style={[styles.cell, styles.letter, { color: d.today ? colors.text : colors.textTertiary }]}>{d.letter}</Text>
        ))}
        <Text style={[styles.count, styles.setsHead, { color: colors.textTertiary }]}>sets</Text>
      </View>

      {rows.map(m => {
        const sets = formatSets(m.sets, m.setsMissing);
        const planned = m.cells.includes('plan');
        return (
          <Pressable
            key={m.group}
            onPress={() => router.push({ pathname: '/exercise', params: { group: m.group } })}
            accessibilityRole="button"
            accessibilityLabel={[muscleName(m.group), `trained on ${m.times} of the days this week`, planned && 'planned', `${sets} sets`, m.met && 'goal met'].filter(Boolean).join(', ')}
            style={({ pressed }) => pressed && styles.pressed}
          >
            {list && label(m.group)}
            <View style={styles.gridRow}>
              {!list && label(m.group)}
              {m.cells.map((c, i) => (
                <View key={days[i].date} style={styles.cell}>
                  {cell(c, m.group)}
                </View>
              ))}
              <Text style={[styles.count, styles.countText, { color: m.met ? colors.sunrise : colors.textSecondary }]}>
                {m.met ? `${sets} ✓` : sets}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// One of your own goals: a lift with where it stands and its last 4 weeks, or an exercise done N× a week
export function CustomRow({ c, first }: { c: CustomProgress; first: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const library = useWorkoutStore(s => s.exerciseLibrary);
  const { goal } = c;
  const unit = goal.kind === 'lift' ? unitLabel(goal.unit) : '';
  const title = goal.kind === 'lift' ? `${c.name} ${goal.weight} ${unit}` : `${c.name} ${goal.perWeek}× a week`;
  const status = goal.kind === 'often' ? `${c.now} of ${c.target}` : c.now ? `${c.now} now` : 'Not logged yet';
  const change =
    goal.kind !== 'lift' || !c.now || c.change === undefined ? undefined : c.change > 0 ? `+${c.change} ${unit} in 4 weeks` : 'same as 4 weeks ago';
  const points = (c.weeks ?? []).flatMap((v, i) => (v === undefined ? [] : [{ i, v }]));
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise', params: { id: resolveId(goal.exerciseId, library) } })}
      accessibilityRole="button"
      accessibilityLabel={[title, status, change, c.met && 'goal met'].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.custom, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }, pressed && styles.pressed]}
    >
      <View style={styles.customHead}>
        <Text style={[styles.customTitle, styles.shrink, { color: colors.text }]}>{title}</Text>
        <View style={styles.right}>
          <Text style={[styles.value, { color: goal.kind === 'lift' ? colors.text : colors.textSecondary }]}>{status}</Text>
          {change && <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{change}</Text>}
        </View>
      </View>
      <Bar progress={c.now / c.target} done={c.met} />
      {points.length >= 2 && <Trend points={points} color={colors.text} />}
    </Pressable>
  );
}

// Heaviest set a week over the last 4 weeks (i = 0 oldest … 3 this week); no goal line
function Trend({ points, color }: { points: { i: number; v: number }[]; color: string }) {
  const [width, setWidth] = useState(0);
  const H = 52;
  const P = 6; // room for the points and the line's caps
  const values = points.map(p => p.v);
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo;
  const pad = span * 0.2;
  const y = (v: number) => (span ? H - P - ((v - lo + pad) / (span + 2 * pad)) * (H - 2 * P) : H / 2);
  const xy = points.map(p => ({ x: P + (p.i / 3) * (width - 2 * P), y: y(p.v) }));
  return (
    <View style={styles.trend} onLayout={e => setWidth(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 && (
        <Svg width={width} height={H}>
          <Polyline points={xy.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {xy.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />)}
        </Svg>
      )}
    </View>
  );
}

// A progress bar: ink toward the target, sunrise once met; never shorter than a stub
export function Bar({ progress, done }: { progress: number; done: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.dim }]}>
      <View style={[styles.bar, { width: `${Math.max(4, Math.min(100, progress * 100))}%`, backgroundColor: done ? colors.sunrise : colors.text }]} />
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
  grid: {
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    width: 98, // fits "Hamstrings" at the default text size
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  gridName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  letter: {
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
  },
  planDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  restDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  count: {
    width: 40,
  },
  countText: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  setsHead: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  tight: {
    paddingVertical: 6,
  },
  custom: {
    paddingVertical: 10,
    minHeight: 52,
  },
  customHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  customTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  trend: {
    height: 52,
    marginTop: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.6,
  },
});
