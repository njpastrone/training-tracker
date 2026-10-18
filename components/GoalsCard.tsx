import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { SkyCard, SectionAction, SectionLabel } from './Sky';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { resolveId } from '../services/exerciseIdentity';
import { foodGoalName, foodMet, foodTarget, foodValue, formatSets, muscleName, trainedLine, type CustomProgress, type FoodProgress, type MuscleProgress } from '../services/goals';
import type { FoodDayTotal } from '../services/progress';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import type { FoodGoal, MuscleGroup, Workout } from '../types/workout';

// The goal cards on Progress: the last 7 days as a grid (goal muscles and the food goal down the side,
// the days across), each muscle's sets, and your own lift and "do it often" goals.

// Above this text size grids become lists, so no label is ever cut off
export const LIST_AT_FONT_SCALE = 1.3;

// A section label with its Edit link, which goes to Goals
export function GoalsHeader({ label }: { label: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <SectionLabel style={styles.fill}>{label}</SectionLabel>
      <SectionAction label="Edit" accessibilityLabel="Edit goals" onPress={() => router.push('/goals')} />
    </View>
  );
}

const unitLabel = (unit: 'lbs' | 'kg') => (unit === 'kg' ? 'kg' : 'lb');

interface GridProps {
  muscles: MuscleProgress[]; // with a times-a-week goal
  workouts: Workout[];
  food?: FoodProgress; // the food goal, when there's food in the last 7 days
  days: { date: string; total?: FoodDayTotal }[]; // the last 7 days, oldest first
}

// Last 7 days: a muscle-coloured dot on each day a goal muscle was trained as a main muscle (the same
// count as its goal), and one row of food-goal rings. Not tappable; Edit goes to Goals.
export function WeekGrid({ muscles, workouts, food, days }: GridProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const list = fontScale > LIST_AT_FONT_SCALE; // large text: each row's name on its own line
  const trained = new Set(workouts.flatMap(w => w.muscleGroups.map(g => `${w.date} ${g}`)));
  const label = (text: string, dot?: string) => (
    <View style={list ? styles.listLabel : styles.gridLabel}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text style={[styles.gridName, styles.shrink, { color: colors.text }]}>{text}</Text>
    </View>
  );

  return (
    <SkyCard style={styles.grid}>
      <View style={styles.gridRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {!list && <View style={styles.gridLabel} />}
        {days.map(d => (
          <Text key={d.date} style={[styles.cell, styles.letter, { color: colors.textTertiary }]}>{format(parseISO(d.date), 'EEEEE')}</Text>
        ))}
        <View style={styles.count} />
      </View>

      {muscles.map(m => {
        const name = muscleName(m.group);
        const met = m.times >= m.timesGoal!;
        return (
          <View key={m.group} accessible accessibilityLabel={`${name}, trained on ${m.times} of the last 7 days, goal ${m.timesGoal}${met ? ', met' : ''}`}>
            {list && label(name, muscleGroupColors[m.group])}
            <View style={styles.gridRow}>
              {!list && label(name, muscleGroupColors[m.group])}
              {days.map(d => (
                <View key={d.date} style={styles.cell}>
                  {trained.has(`${d.date} ${m.group}`) ? (
                    <View style={[styles.dayDot, { backgroundColor: muscleGroupColors[m.group] }]} />
                  ) : (
                    <View style={[styles.restDot, { backgroundColor: colors.dim }]} />
                  )}
                </View>
              ))}
              <Text style={[styles.count, styles.countText, { color: met ? colors.sunrise : colors.textSecondary }]}>
                {met ? '✓' : `${m.times}/${m.timesGoal}`}
              </Text>
            </View>
          </View>
        );
      })}

      {food && (
        <View
          accessible
          accessibilityLabel={`${foodGoalName(food.goal)}, met on ${food.hit} of ${food.logged} days with food`}
          style={muscles.length > 0 && [styles.foodRow, { borderTopColor: colors.dim }]}
        >
          {list && label(foodGoalName(food.goal))}
          <View style={styles.gridRow}>
            {!list && label(foodGoalName(food.goal))}
            <DayBars goal={food.goal} days={days} />
            <Text style={[styles.count, styles.countText, { color: colors.textSecondary }]}>{food.hit}/{food.logged}</Text>
          </View>
        </View>
      )}

    </SkyCard>
  );
}

// The food goal across the last 7 days: one bar a day toward the target (the dashed line), sunrise when met.
// Spans the grid's seven day cells.
export function DayBars({ goal, days }: { goal: FoodGoal; days: { date: string; total?: { protein: number; kcal: number } }[] }) {
  const { colors } = useTheme();
  const top = Math.max(goal.target, ...days.map(d => (d.total ? foodValue(goal, d.total) : 0))) * 1.1;
  return (
    <View style={styles.dayBars}>
      {days.map(d => (
        <View key={d.date} style={[styles.cell, styles.barCell]}>
          {d.total ? (
            <View style={[styles.dayBar, { height: `${Math.max(6, (foodValue(goal, d.total) / top) * 100)}%`, backgroundColor: foodMet(goal, d.total) ? colors.sunrise : colors.text }]} />
          ) : (
            <View style={[styles.restDot, { backgroundColor: colors.dim }]} />
          )}
        </View>
      ))}
      <View style={[styles.targetLine, { bottom: `${(goal.target / top) * 100}%`, borderColor: colors.textTertiary }]} />
    </View>
  );
}

// One row per goal muscle: its sets against the minimum (MEV) with a bar, and when it was last trained.
// Above 130% text the bar moves under the name. A row opens that muscle.
export function MuscleSetsCard({ muscles, daysSince }: { muscles: MuscleProgress[]; daysSince: Partial<Record<MuscleGroup, number>> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > LIST_AT_FONT_SCALE;
  const mins = new Set(muscles.map(m => m.setsGoal));
  const min = mins.size === 1 ? `Minimum ${muscles[0].setsGoal} sets a week (MEV).` : 'Minimum sets a week (MEV).';

  return (
    <SkyCard>
      {muscles.map((m, i) => {
        const name = muscleName(m.group);
        const met = m.sets >= m.setsGoal!;
        const sets = formatSets(m.sets, m.setsMissing);
        const last = trainedLine(daysSince[m.group]);
        const bar = <Bar progress={m.sets / m.setsGoal!} done={met} />;
        return (
          <Pressable
            key={m.group}
            onPress={() => router.push({ pathname: '/exercise', params: { group: m.group } })}
            accessibilityRole="button"
            accessibilityLabel={[name, `${sets} of ${m.setsGoal} sets`, last, met && 'goal met'].filter(Boolean).join(', ')}
            style={({ pressed }) => [styles.setRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }, pressed && styles.pressed]}
          >
            <View style={styles.setHead}>
              <View style={[styles.dot, { backgroundColor: muscleGroupColors[m.group] }]} />
              <View style={stacked ? styles.fill : styles.setName}>
                <Text style={[styles.tileName, { color: colors.text }]}>{name}</Text>
                <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{last}</Text>
              </View>
              {!stacked && <View style={styles.fill}>{bar}</View>}
              <Text style={[styles.countText, { color: met ? colors.sunrise : colors.text }]}>{met ? `${sets} ✓` : `${sets} / ${m.setsGoal}`}</Text>
            </View>
            {stacked && bar}
          </Pressable>
        );
      })}
      <Text variant="bodySmall" style={[styles.footer, { color: colors.textTertiary }]}>
        {min} A set counts fully for its main muscle and half for helpers.
      </Text>
    </SkyCard>
  );
}

// Your own goals: a lift with where it stands and its last 4 weeks, or an exercise done N× a week
export function OtherGoalsCard({ custom }: { custom: CustomProgress[] }) {
  return (
    <SkyCard style={styles.tight}>
      {custom.map((c, i) => (
        <CustomRow key={c.goal.id} c={c} first={i === 0} />
      ))}
    </SkyCard>
  );
}

function CustomRow({ c, first }: { c: CustomProgress; first: boolean }) {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xs,
    marginTop: spacing.gap, // 24 pt below the card above
    marginBottom: spacing.sm,
  },
  grid: {
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    width: 104, // fits "Hamstrings" at the default text size
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
    fontSize: 15,
    fontWeight: '600',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  letter: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  restDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  count: {
    width: 32,
  },
  countText: {
    fontFamily: fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  foodRow: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  footer: {
    marginTop: 10,
  },
  dayBars: {
    flex: 7, // the seven day cells
    flexDirection: 'row',
    height: 44,
  },
  barCell: {
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1, // solid: iOS doesn't draw a dashed border on one side only
  },
  dayBar: {
    width: 14,
    borderRadius: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  setRow: {
    paddingVertical: 10,
    minHeight: 44,
    gap: 6,
  },
  setHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
  },
  setName: {
    width: 104,
  },
  tileName: {
    fontSize: 16,
    fontWeight: '700',
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
