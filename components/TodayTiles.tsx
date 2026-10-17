import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing } from '../constants/theme';
import { daysAgo, workoutName } from '../services/format';
import { calorieLeft, foodTarget, foodValue } from '../services/goals';
import type { FoodDayTotal } from '../services/progress';
import type { WorkoutTemplate } from '../types/template';
import type { FoodGoal, Workout } from '../types/workout';
import { SkyCard, SectionLabel } from './Sky';
import GoalBar from './GoalBar';
import DayRow from './DayRow';

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const count = (v: number, word: string) => `${v} ${word}${v === 1 ? '' : 's'}`;

interface Props {
  training?: { todays: Workout[]; planned?: WorkoutTemplate; last?: Workout }; // none = no Training tile
  food?: { goal?: FoodGoal; day?: FoodDayTotal }; // none = no Food tile
  today: string;
}

// Log's summary under the sun arc: today's training (what's on, large) then today's food (the goal's
// number large, its bar, the rest in a line). Training always comes first; each only when it applies.
export default function TodaySummary({ training, food, today }: Props) {
  if (!training && !food) return null;
  return (
    <View style={styles.summary}>
      {training && <TrainingToday {...training} today={today} />}
      {food && <FoodToday {...food} today={today} />}
    </View>
  );
}

// "Push today", "Legs planned", "Last: Pull yesterday"
function trainingLine({ todays, planned, last, today }: NonNullable<Props['training']> & { today: string }): [string, string?] {
  if (todays.length) {
    const groups = [...new Set(todays.flatMap(w => w.muscleGroups))];
    return [`${workoutName(groups)} today`, count(todays.reduce((s, w) => s + w.exercises.length, 0), 'exercise')];
  }
  if (planned) return [`${planned.name} planned`, count(planned.exercises.length, 'exercise')];
  if (last) return [`Last: ${workoutName(last.muscleGroups)} ${daysAgo(differenceInCalendarDays(parseISO(today), parseISO(last.date)))}`, 'Nothing yet today'];
  return ['Nothing yet today'];
}

function TrainingToday(props: NonNullable<Props['training']> & { today: string }) {
  const { colors, sky } = useTheme();
  const router = useRouter();
  const [title, sub] = trainingLine(props);
  return (
    <Pressable
      onPress={() => router.navigate('/(tabs)/progress')}
      accessibilityRole="button"
      accessibilityLabel={`Training, ${sky.done} of ${sky.target} days in the last 7. ${title}${sub ? `, ${sub}` : ''}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Text variant="headlineMedium" style={{ color: colors.text }}>{title}</Text>
      {sub && <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{sub}</Text>}
    </Pressable>
  );
}

function FoodToday({ goal, day, today }: NonNullable<Props['food']> & { today: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const meals = day && `${n(day.kcal)} kcal · ${count(day.meals, 'meal')}`;
  const value = goal && day ? foodValue(goal, day) : day?.protein ?? 0;
  const big = !goal || goal.kind === 'protein' ? `${value} g` : n(value);
  const of = goal ? ` of ${foodTarget(goal)}${goal.kind === 'protein' ? ' protein' : ' kcal'}` : ' protein';
  const sub = !day ? 'Nothing logged yet' : !goal || goal.kind === 'protein' ? meals! : `${calorieLeft(goal, day.kcal)} · ${day.protein}\u00a0g protein`; // the number keeps its unit when it wraps
  return (
    <Pressable
      onPress={() => router.push(`/day/${today}`)}
      accessibilityRole="button"
      accessibilityLabel={`Food today, ${big}${of}, ${sub}`}
      style={({ pressed }) => [styles.food, { borderTopColor: colors.dim }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.big, { color: colors.text }]}>
        {big}
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{of}</Text>
      </Text>
      {goal && <GoalBar goal={goal} day={day} />}
      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{sub}</Text>
    </Pressable>
  );
}

// "Tomorrow", "Tuesday", then "Wednesday, Oct 21" past a week
function upNextDay(date: string, today: string) {
  const days = differenceInCalendarDays(parseISO(date), parseISO(today));
  return days === 1 ? 'Tomorrow' : format(parseISO(date), days < 7 ? 'EEEE' : 'EEEE, MMM d');
}

// The next planned day after today: "Tomorrow · Legs", opens that day
export function UpNext({ date, today, template }: { date: string; today: string; template?: WorkoutTemplate }) {
  const { colors } = useTheme();
  const router = useRouter();
  const title = `${upNextDay(date, today)} · ${template?.name ?? 'Workout'}`;
  const sub = `Planned${template ? ` · ${count(template.exercises.length, 'exercise')}` : ''}`;
  return (
    <Pressable onPress={() => router.push(`/day/${date}`)} accessibilityRole="button" accessibilityLabel={`Up next, ${title}, ${sub}`} accessibilityHint="Opens the day">
      {({ pressed }) => (
        <SkyCard style={[styles.tight, pressed && { opacity: 0.7 }]}>
          <View style={styles.row}>
            <View style={[styles.ringDot, { borderColor: colors.text, borderStyle: 'dashed' }]} />
            <View style={styles.fill}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{sub}</Text>
            </View>
            <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
          </View>
        </SkyCard>
      )}
    </Pressable>
  );
}

// RECENT: the last 3 days before today with a workout or food; nothing when there are none
export function RecentDays({ workouts, food, goal, today }: { workouts: Workout[]; food: Map<string, FoodDayTotal>; goal?: FoodGoal; today: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const days = [...new Set([...workouts.map(w => w.date), ...food.keys()])]
    .filter(d => d < today)
    .sort()
    .reverse()
    .slice(0, 3);
  if (!days.length) return null;
  return (
    <>
      <View style={styles.labelRow}>
        <SectionLabel>Recent</SectionLabel>
        <Pressable onPress={() => router.navigate('/(tabs)/history')} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>All days ›</Text>
        </Pressable>
      </View>
      <SkyCard style={styles.tight}>
        {days.map((d, i) => (
          <DayRow key={d} date={d} workouts={workouts.filter(w => w.date === d)} food={food.get(d)} goal={goal} first={i === 0} />
        ))}
      </SkyCard>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  summary: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  food: {
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  big: {
    fontFamily: fonts.rounded,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  tight: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  ringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  rowTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  link: {
    fontFamily: fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
  },
});
