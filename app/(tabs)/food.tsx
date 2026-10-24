import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import Svg, { Line } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { SkyCard, LargeTitle } from '../../components/Sky';
import { ChatScreen, logBar } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import { CardHead, CoachLine, Disc, Doors, HueCard, Link, WeekStrip } from '../../components/Hue';
import FoodGoalsCard from '../../components/FoodGoalsCard';
import ParsedCard from '../../components/ParsedCard';
import FoodCard from '../../components/FoodCard';
import { ThinkingCard } from '../../components/CoachCard';
import { MovePickCard } from '../../components/ThreadCards';
import { UndoToast } from '../../components/SelectableWorkoutList';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useLogDraft } from '../../hooks/useLogDraft';
import { foodGoalName, foodGoalRows, foodTarget } from '../../services/goals';
import { foodByDay } from '../../services/progress';
import { toChips, usualMeal } from '../../services/suggestions';
import { foodLine } from '../../services/coachLine';
import { foodTrend, foodWeekOf, goalWeek, weekRange } from '../../services/week';
import { fonts, spacing } from '../../constants/theme';

const BAR_H = 44; // the trend's tallest bar
const FOOD_EXAMPLES = toChips(['2 eggs and toast', 'Chicken, rice and broccoli', 'Greek yogurt and a banana']);
const n = (v: number) => Math.round(v).toLocaleString('en-US');

// How food is going, in the same four blocks as Training: the goal and this week (the hero, a ring a
// day), your goals a row each, the 4-week trend with one coach line, then the doors. The bar logs what you ate.
export default function FoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { foodEntries, settings, loadSchedule, loadTemplates } = useWorkoutStore();
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const goal = settings.goals?.food;
  const protein = !goal || goal.kind === 'protein';
  const [logged, setLogged] = useState(false);

  const log = useLogDraft({
    date: today,
    withFood: true,
    moves: true,
    onQuestion: question => router.navigate({ pathname: '/(tabs)/chat', params: { question } }),
    onLogged: () => setLogged(true),
  });
  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);
  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setLogged(false), 2500);
    return () => clearTimeout(timer);
  }, [logged]);

  const week = useMemo(() => foodWeekOf(foodEntries, goal, now), [foodEntries, goal, today]);
  const trend = useMemo(() => foodTrend(foodEntries, goal, now), [foodEntries, goal, today]);
  // Every goal row this week; fiber and low-GI rows wait for the log to carry those numbers
  const rows = useMemo(() => {
    const totals = foodByDay(foodEntries);
    return foodGoalRows(settings.goals).map(g => goalWeek(g, totals, now)).filter(r => r.known || (r.goal.kind !== 'fiber' && r.goal.kind !== 'lowgi'));
  }, [foodEntries, settings.goals, today]);
  const line = useMemo(() => foodLine(foodEntries, goal, now), [foodEntries, goal, today]);
  const chips = useMemo(() => {
    const usual = usualMeal(foodEntries, now);
    return usual.length || foodEntries.length ? usual : FOOD_EXAMPLES;
  }, [foodEntries]);

  const eats = foodEntries.length > 0;
  const unit = protein ? 'g' : 'kcal';
  const goalWords = goal ? `goal ${foodTarget(goal)} ${goal.kind === 'protein' ? 'protein a day' : goal.kind === 'cut' ? 'or under a day' : 'or more a day'}` : 'no food goal yet';
  const reviewing = !!log.sent || !!log.draft || !!log.food;
  const max = Math.max(goal?.target ?? 0, ...trend.weeks.map(w => w ?? 0), 1);
  const goalY = goal ? (goal.target / max) * BAR_H : undefined;

  return (
    <ChatScreen bar={logBar(log, "What'd you eat?", chips)} follow={reviewing} overlay={<UndoToast />} hue={{ glow: [colors.foodSoft], accent: colors.food }}>
      <LargeTitle title="Food" subtitle={`${weekRange(now)} · ${goalWords}`} />

      {log.sent && <UserBubble text={log.sent} />}
      {log.busy === 'parse' && <ThinkingCard title="Reading it…" />}
      {log.picking && <MovePickCard entries={log.picking.entries} to={log.picking.to} onPick={entry => log.pickMove(entry, log.picking!.to)} onCancel={log.discard} />}
      {log.draft && (
        <ParsedCard draft={log.draft} date={today} onChange={log.setDraft} onSave={log.save} onDiscard={log.discard} busy={log.busy} error={log.error} reply={log.reply} food={log.food} onFoodChange={log.setFood} />
      )}
      {log.food && !log.draft && (
        <FoodCard food={log.food} date={today} onChange={log.setFood} onSave={log.save} onDiscard={log.discard} busy={log.busy} error={log.error} reply={log.reply} />
      )}

      {!reviewing && (
        <>
          {/* Slot 1: the goal and this week, a ring a day */}
          <HueCard hue="food" label={`${week.avg} ${unit} a day this week${goal ? `, at goal on ${week.hit} of ${week.logged} days` : `, food on ${week.logged} days`}`}>
            <CardHead label="This week" onHero right={<Link label="Month" onHero onPress={() => router.push('/calendar')} accessibilityLabel="Open the calendar" />} />
            <View style={styles.heroNum}>
              <Text style={[styles.big, { color: colors.onHero }]}>{protein ? `${week.avg} g` : n(week.avg)}</Text>
              <Text style={[styles.of, { color: colors.onHeroSoft }]}>{protein ? 'a day' : 'kcal a day'}</Text>
              <Text style={[styles.right, { color: colors.onHeroSoft }]}>{goal ? `At goal\n${week.hit} of ${week.logged} day${week.logged === 1 ? '' : 's'}` : `Food on\n${week.logged} day${week.logged === 1 ? '' : 's'}`}</Text>
            </View>
            <WeekStrip
              days={week.days.map(day => ({
                key: day.date,
                letter: day.letter,
                today: day.today,
                label: `${format(parseISO(day.date), 'EEEE d')}${day.total ? `, ${day.total.protein} g protein${day.met ? ', at goal' : ''}` : ''}`,
                onPress: () => router.push(`/day/${day.date}`),
                disc: <Disc hue="food" label={format(parseISO(day.date), 'd')} today={day.today} ring={day.total && goal ? day.ratio : undefined} state={day.future ? 'future' : day.total ? 'on' : 'rest'} />,
              }))}
            />
          </HueCard>

          {/* Slot 2: your goals, a row each; fiber and low-GI rows only once the log carries those numbers */}
          {eats || goal ? (
            <SkyCard card style={styles.tight}>
              {rows.length ? (
                <FoodGoalsCard rows={rows} onEdit={() => router.push('/food-goals')} />
              ) : (
                <>
                  <CardHead label="Your goals" right={<Link label="Edit goals" onPress={() => router.push('/food-goals')} />} />
                  <Text variant="bodyMedium" style={[styles.quiet, { color: colors.textSecondary }]}>Set a protein or calorie goal and each day shows up here against it.</Text>
                </>
              )}
            </SkyCard>
          ) : (
            <SkyCard card style={styles.empty}>
              <SymbolView name="fork.knife" size={30} tintColor={colors.food} />
              <Text variant="titleMedium" style={{ color: colors.text }}>Your food shows up here</Text>
              <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                Say what you ate in the bar, like “2 eggs and toast”. Amounts are optional. Set a protein goal in Food goals.
              </Text>
            </SkyCard>
          )}

          {/* Slot 3: the 4-week trend and the coach line */}
          {(eats || line) && (
            <SkyCard card style={styles.tight}>
              <CardHead label={`${goal ? foodGoalName(goal) : 'Protein'} · 4 weeks`} right={<Link label="Details" onPress={() => router.push('/food-week')} accessibilityLabel="Food over the last 7 days" />} />
              <View style={styles.trend} accessible accessibilityLabel={`${trend.from !== undefined ? `${trend.from} to ` : ''}${trend.to ?? 0} ${unit} ${trend.line}; weekly averages ${trend.weeks.map(w => w ?? 'none').join(', ')}${goal ? `, goal ${goal.target}` : ''}`}>
                <View style={styles.fill}>
                  <Text style={[styles.trendBig, { color: colors.text }]} numberOfLines={1}>
                    {trend.to === undefined ? '—' : trend.from !== undefined ? `${protein ? trend.from : n(trend.from)} → ${protein ? trend.to : n(trend.to)}` : protein ? trend.to : n(trend.to)}
                    <Text style={[styles.trendUnit, { color: colors.textSecondary }]}> {unit}</Text>
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{trend.line}</Text>
                </View>
                <View style={styles.bars}>
                  {trend.weeks.map((w, i) => (
                    <View key={i} style={[styles.bar, { height: Math.max(3, ((w ?? 0) / max) * BAR_H), backgroundColor: w === undefined ? colors.dim : i === 3 ? colors.food : colors.foodSoft }]} />
                  ))}
                  {goalY !== undefined && (
                    <Svg width="100%" height={2} style={[styles.goalLine, { bottom: goalY - 1 }]}>
                      <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.textTertiary} strokeWidth={1.5} strokeDasharray="4 4" />
                    </Svg>
                  )}
                </View>
              </View>
              {line && <CoachLine line={line} inset />}
            </SkyCard>
          )}

          {/* Slot 4: everything else, one tap away */}
          <Doors
            hue="food"
            doors={[
              { sf: 'target', md: 'track-changes', label: 'Food goals', onPress: () => router.push('/food-goals') },
              { sf: 'list.bullet', md: 'format-list-bulleted', label: 'All meals', onPress: () => router.push('/meals') },
              { sf: 'chart.bar', md: 'bar-chart', label: 'Top sources', onPress: () => router.push('/food-week') },
              { sf: 'scalemass', md: 'monitor-weight', label: 'Body weight', onPress: () => router.push('/health') },
            ]}
          />
        </>
      )}
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    textAlign: 'center',
  },
  heroNum: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  big: {
    fontFamily: fonts.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  of: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  right: {
    marginLeft: 'auto',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  tight: {
    paddingVertical: 12,
  },
  quiet: {
    marginTop: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  trendBig: {
    fontFamily: fonts.rounded,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  trendUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: BAR_H,
  },
  bar: {
    width: 22,
    borderRadius: 5,
  },
  goalLine: {
    position: 'absolute',
    left: -4,
    right: -4,
    opacity: 0.6,
  },
});
