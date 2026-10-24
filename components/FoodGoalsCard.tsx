import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, foodGoalColors, spacing } from '../constants/theme';
import { foodGoalFamily, foodGoalName, foodTarget } from '../services/goals';
import type { GoalCell, GoalWeek } from '../services/week';
import { CardHead, Link } from './Hue';

const n = (v: number) => Math.round(v).toLocaleString('en-US');

// Food's breakdown: your goals, one row each in the same shape: dot and name, days at goal this week,
// the week as seven small cells (met, partly, missed, today as a ring), today's value against the goal.
// A new goal kind costs a row, not a design. "Edit goals" opens the picker.
export default function FoodGoalsCard({ rows, onEdit }: { rows: GoalWeek[]; onEdit: () => void }) {
  const { colors } = useTheme();
  return (
    <>
      <CardHead label="Your goals" right={<Link label="Edit goals" onPress={onEdit} />} />
      {rows.map((r, i) => {
        const colour = foodGoalColors[foodGoalFamily(r.goal.kind)];
        const kcal = r.goal.kind === 'cut' || r.goal.kind === 'bulk';
        const unit = r.goal.kind === 'lowgi' ? ` meal${r.goal.target === 1 ? '' : 's'}` : kcal ? '' : ' g';
        const days = `${r.hit} of ${r.logged} day${r.logged === 1 ? '' : 's'}${r.goal.kind === 'cut' ? ' under' : ''}`;
        const value = r.today === undefined ? '–' : kcal ? n(r.today) : String(r.today);
        const firstFuture = r.cells.indexOf('future');
        const todayAt = firstFuture === -1 ? 6 : firstFuture - 1;
        return (
          <View
            key={r.goal.kind}
            accessible
            accessibilityLabel={`${foodGoalName(r.goal)}, at goal on ${days} this week, today ${value} of ${foodTarget(r.goal)}`}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }]}
          >
            <View style={[styles.dot, { backgroundColor: colour }]} />
            <View style={styles.name}>
              <Text style={[styles.title, { color: colors.text }]}>{foodGoalName(r.goal)}</Text>
              <Text style={[styles.days, { color: colors.textTertiary }]}>{days}</Text>
            </View>
            <View style={styles.cells}>
              {r.cells.map((c, j) => (
                <Cell key={j} state={c} colour={colour} today={j === todayAt} />
              ))}
            </View>
            <Text style={[styles.value, { color: colors.text }]}>
              {value}
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{` / ${kcal ? n(r.goal.target) : r.goal.target}${unit}`}</Text>
            </Text>
          </View>
        );
      })}
    </>
  );
}

// One day: filled when met, half when partly, dim when missed or not logged, lighter in the future, a ring around today
function Cell({ state, colour, today }: { state: GoalCell; colour: string; today: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cell, { backgroundColor: state === 'met' ? colour : colors.dim }, state === 'future' && styles.future, today && { borderWidth: 1.5, borderColor: colour }]}>
      {state === 'partly' && <View style={[styles.half, { backgroundColor: colour }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  days: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  cells: {
    flexDirection: 'row',
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderRadius: 3.5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  half: {
    height: '50%',
  },
  future: {
    opacity: 0.45,
  },
  value: {
    fontFamily: fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'right',
    marginLeft: spacing.xs,
  },
});
