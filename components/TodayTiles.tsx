import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, radius, spacing } from '../constants/theme';
import { daysAgo, workoutName } from '../services/format';
import { calorieLeft, foodGoalName, foodTarget, foodValue } from '../services/goals';
import type { FoodDayTotal } from '../services/progress';
import type { WorkoutTemplate } from '../types/template';
import type { FoodGoal, Workout } from '../types/workout';
import { SkyCard, SectionLabel } from './Sky';
import GoalRing from './GoalRing';
import Ring from './Ring';
import DayRow from './DayRow';

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const count = (v: number, word: string) => `${v} ${word}${v === 1 ? '' : 's'}`;

interface Props {
  training?: { todays: Workout[]; planned?: WorkoutTemplate; last?: Workout }; // none = no Training tile
  food?: { goal?: FoodGoal; day?: FoodDayTotal }; // none = no Food tile
  today: string;
}

// Log's summary: training days in the last 7 and today's food against the food goal, side by side
// for people who log both, one full-width tile otherwise. Training always comes first.
export default function TodayTiles({ training, food, today }: Props) {
  if (!training && !food) return null;
  return (
    <View style={styles.split}>
      {training && <TrainingTile {...training} today={today} />}
      {food && <FoodTile {...food} today={today} />}
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

function TrainingTile(props: NonNullable<Props['training']> & { today: string }) {
  const { colors, sky } = useTheme();
  const router = useRouter();
  const [title, sub] = trainingLine(props);
  const met = sky.done >= sky.target;
  return (
    <Tile
      kicker="Training"
      onPress={() => router.navigate('/(tabs)/progress')}
      label={`Training, ${sky.done} of ${sky.target} days in the last 7. ${title}${sub ? `, ${sub}` : ''}`}
      title={title}
      sub={sub}
    >
      <Ring size={96} stroke={6} progress={sky.progress} color={met ? colors.mint : colors.sunrise}>
        <RingLabel value={`${sky.done}/${sky.target}`} sub="last 7 days" />
      </Ring>
    </Tile>
  );
}

function FoodTile({ goal, day, today }: NonNullable<Props['food']> & { today: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const meals = day && `${n(day.kcal)} kcal · ${count(day.meals, 'meal')}`;
  const open = () => router.push(`/day/${today}`);

  // Food goal Off: no ring, just today's protein
  if (!goal) {
    const protein = `${day?.protein ?? 0} g protein`;
    const sub = meals ?? 'Nothing logged yet';
    return (
      <Tile kicker="Food" onPress={open} label={`Food today, ${protein}, ${sub}`} title="Food today" sub={sub}>
        <Text style={[styles.mid, { color: colors.text }]}>{protein}</Text>
      </Tile>
    );
  }

  const value = day ? foodValue(goal, day) : 0;
  const centre = goal.kind === 'protein' ? `${value} g` : n(value);
  const title = `${foodGoalName(goal)} today`;
  const sub = !day ? 'Nothing logged yet' : goal.kind === 'protein' ? meals! : `${calorieLeft(goal, day.kcal)} · ${day.protein} g protein`;
  return (
    <Tile kicker="Food" onPress={open} label={`${title}, ${centre} of ${foodTarget(goal)}, ${sub}`} title={title} sub={sub}>
      <GoalRing goal={goal} day={day} size={96}>
        <RingLabel value={centre} sub={`of ${foodTarget(goal)}`} />
      </GoalRing>
    </Tile>
  );
}

function Tile({ kicker, onPress, label, title, sub, children }: { kicker: string; onPress: () => void; label: string; title: string; sub?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.fill, pressed && { opacity: 0.7 }]}>
      <SkyCard style={styles.tile}>
        <SectionLabel style={styles.kicker}>{kicker}</SectionLabel>
        <View style={styles.ring}>{children}</View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {sub && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{sub}</Text>}
      </SkyCard>
    </Pressable>
  );
}

function RingLabel({ value, sub }: { value: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.mid, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.ringSub, { color: colors.textTertiary }]}>{sub}</Text>
    </>
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
            <View style={[styles.ringDot, { borderColor: colors.cobalt }]} />
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
          <Text style={[styles.link, { color: colors.sunrise }]}>All days</Text>
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
  split: {
    flexDirection: 'row',
    gap: spacing.gap,
    marginBottom: spacing.gap,
  },
  tile: {
    flex: 1,
    borderRadius: radius.tile,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 0,
  },
  kicker: {
    marginBottom: spacing.sm,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  mid: {
    fontFamily: fonts.rounded,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ringSub: {
    fontSize: 11,
    lineHeight: 13,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 10,
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
