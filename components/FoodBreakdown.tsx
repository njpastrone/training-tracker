import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Line } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { SkyCard } from './Sky';
import { useTheme } from '../contexts/ThemeContext';
import { foodTarget, type FoodProgress } from '../services/goals';
import type { FoodDayTotal, foodWeek } from '../services/progress';
import { fonts, spacing } from '../constants/theme';

interface Props {
  week: ReturnType<typeof foodWeek>;
  goal?: FoodProgress; // the food goal; none when it's Off
}

const BARS = 72; // pt

const n = (v: number) => v.toLocaleString('en-US');
const daysOf = (hit: number, of: number) => `${hit} of ${of} day${of === 1 ? '' : 's'}`;

// Food over the last 7 days, only once there is some. With a protein goal (or none): protein a day
// on average, then calories, carbs · fat and where the protein came from. With a cut or bulk: calories
// a day and how many days were on target, then protein and carbs · fat. Either way a bar a day of the
// goal's number with the target as a dashed line. Calories are never red and never a grade.
export default function FoodBreakdown({ week, goal }: Props) {
  const { colors } = useTheme();
  const g = goal?.goal;
  const calories = g && g.kind !== 'protein';
  const carbsFat: [string, string] = ['Carbs · fat', `${n(week.carbs)} g · ${n(week.fat)} g a day`];

  const head = calories ? `${n(week.kcal)} kcal a day` : `${week.protein} g protein a day`;
  const days = goal ? daysOf(goal.hit, goal.logged) : undefined;
  const line = !goal
    ? `Food on ${week.logged} of 7 days`
    : g!.kind === 'protein'
      ? `At your ${foodTarget(g!)} goal on ${daysOf(goal.hit, goal.logged)} with food`
      : g!.kind === 'cut'
        ? `Under your ${foodTarget(g!)} target (cutting) on ${daysOf(goal.hit, goal.logged)} with food`
        : `At or over your ${foodTarget(g!)} target (bulking) on ${daysOf(goal.hit, goal.logged)} with food`;
  const rows: [string, string][] = calories
    ? [['Protein', `${week.protein} g a day`], carbsFat]
    : [['Calories', `${n(week.kcal)} a day`], carbsFat, ...(week.top.length ? [['Most protein from', week.top.join(', ')] as [string, string]] : [])];

  return (
    <SkyCard>
      <View style={styles.head} accessible accessibilityLabel={[head, line].join('. ')}>
        <View style={styles.headRow}>
          <Text style={[styles.mid, styles.shrink, { color: colors.text }]}>{head}</Text>
          {days && <Text style={[styles.value, { color: colors.textSecondary }]}>{days}</Text>}
        </View>
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{line}</Text>
      </View>

      <DayBars days={week.days} kcal={!!calories} goal={g && foodTarget(g)} target={g?.target} />

      {rows.map(([label, value]) => (
        <View key={label} style={[styles.row, { borderTopColor: colors.dim }]} accessible accessibilityLabel={`${label}: ${value}`}>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{label}</Text>
          <Text style={[styles.value, styles.shrink, styles.end, { color: colors.text }]}>{value}</Text>
        </View>
      ))}
    </SkyCard>
  );
}

// Protein (or calories, for a cut or bulk) a day, one sunrise bar each (a stub on a day without food),
// with the target as a dashed line labelled "150 g" or "2,000"
function DayBars({ days, kcal, goal, target }: { days: Props['week']['days']; kcal: boolean; goal?: string; target?: number }) {
  const { colors } = useTheme();
  const value = (t: FoodDayTotal) => (kcal ? t.kcal : t.protein);
  const max = Math.max(target ?? 0, ...days.map(d => (d.total ? value(d.total) : 0)), 1) * 1.05;
  const goalY = target ? (target / max) * BARS : undefined;
  const said = days.map(d => `${format(parseISO(d.date), 'EEEE')} ${d.total ? (kcal ? `${n(d.total.kcal)} kcal` : `${d.total.protein} g`) : 'no food'}`).join(', ');
  return (
    <View accessible accessibilityLabel={`${kcal ? 'Calories' : 'Protein'} by day: ${said}`}>
      <View style={styles.bars}>
        {days.map(d => (
          <View key={d.date} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                d.total ? { height: Math.max(3, (value(d.total) / max) * BARS), backgroundColor: colors.sunrise } : { height: 3, backgroundColor: colors.dim },
              ]}
            />
          </View>
        ))}
        {goalY !== undefined && (
          <>
            <Svg width="100%" height={2} style={[styles.goalLine, { bottom: goalY - 1 }]}>
              <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.textTertiary} strokeWidth={2} strokeDasharray="4 4" />
            </Svg>
            <Text style={[styles.goalLabel, { bottom: goalY + 4, color: colors.textTertiary }]}>{goal}</Text>
          </>
        )}
      </View>
      <View style={styles.letters}>
        {days.map(d => (
          <Text key={d.date} style={[styles.letter, { color: colors.textTertiary }]}>{format(parseISO(d.date), 'EEEEE')}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: {
    flexShrink: 1,
  },
  end: {
    textAlign: 'right',
  },
  head: {
    gap: 2,
  },
  headRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  mid: {
    fontFamily: fonts.rounded,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  value: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bars: {
    height: BARS,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  letters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  letter: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gap,
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
