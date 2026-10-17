import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { muscleGroupColors, radius, spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { muscleName } from '../services/goals';
import { dayLabel } from './WorkoutCard';
import { Pill } from './Glass';
import type { ChatItem } from '../stores/chatStore';
import type { LiftTrend } from '../services/insights';
import type { MuscleGroup } from '../types/workout';
import type { Opener } from '../services/opener';
import { openerText } from '../services/opener';

// The app's side of the Chat thread: what was logged or planned (read live from the log, so edits and
// deletes show), the opener, and the lift chart under an answer. Reply bubbles on the left; yours are
// UserBubbles on the right.

function Reply({ children, label }: { children: React.ReactNode; label?: string }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} accessibilityLabel={label} style={[styles.reply, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </Animated.View>
  );
}

function Header({ title, onOpen }: { title: string; onOpen?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Text variant="titleSmall" style={[styles.fill, { color: colors.text }]}>{title}</Text>
      {onOpen && (
        <Pressable onPress={onOpen} accessibilityRole="link" hitSlop={10}>
          <Text variant="bodyMedium" style={{ color: colors.cobalt, fontWeight: '600' }}>Open ›</Text>
        </Pressable>
      )}
    </View>
  );
}

export function LoggedCard({ item }: { item: Extract<ChatItem, { kind: 'logged' }> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const allWorkouts = useWorkoutStore(s => s.workouts);
  const allFood = useWorkoutStore(s => s.foodEntries);
  const templates = useWorkoutStore(s => s.templates);
  const workouts = allWorkouts.filter(w => item.workoutIds.includes(w.id));
  const food = allFood.filter(e => item.foodEntryIds.includes(e.id));
  if (!workouts.length && !food.length) {
    return (
      <Reply>
        <Text variant="bodyMedium" style={{ color: colors.textTertiary }}>Deleted</Text>
      </Reply>
    );
  }

  const groups = [...new Set(workouts.flatMap(w => w.muscleGroups as MuscleGroup[]))];
  const template = templates.find(t => t.id === workouts[0]?.templateId)?.name;
  const name = template ?? (groups.length ? groups.slice(0, 2).map(muscleName).join(', ') : workouts.length ? 'Workout' : 'Food');
  const exercises = workouts.reduce((n, w) => n + w.exercises.length, 0);
  const items = food.flatMap(e => e.items);
  const kcal = Math.round(items.reduce((n, i) => n + i.macros.kcal, 0));
  const protein = Math.round(items.reduce((n, i) => n + i.macros.protein, 0));
  const open = () => router.push(workouts.length === 1 && !food.length ? `/workout/${workouts[0].id}` : `/day/${item.day}`);

  return (
    <Reply>
      <Header title={`Logged · ${name}`} onOpen={open} />
      {groups.length > 0 && (
        <Text variant="bodyMedium" style={[styles.line, { color: colors.textSecondary }]}>
          {groups.map(g => (
            <Text key={g}>
              <Text style={{ color: muscleGroupColors[g] }}>● </Text>
              {muscleName(g)}{'  '}
            </Text>
          ))}
        </Text>
      )}
      <Text variant="bodyMedium" style={[styles.line, { color: colors.textSecondary }]}>
        {[exercises ? `${exercises} exercise${exercises === 1 ? '' : 's'}` : '', items.length ? `${kcal} kcal · ${protein} g protein` : ''].filter(Boolean).join(' · ')}
      </Text>
    </Reply>
  );
}

export function PlannedCard({ item }: { item: Extract<ChatItem, { kind: 'planned' }> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const schedule = useWorkoutStore(s => s.schedule);
  const templates = useWorkoutStore(s => s.templates);
  const days = schedule.filter(s => item.dates.includes(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) {
    return (
      <Reply>
        <Text variant="bodyMedium" style={{ color: colors.textTertiary }}>Plan removed</Text>
      </Reply>
    );
  }
  const first = days[0];
  const name = templates.find(t => t.id === first.templateId)?.name ?? 'Workout';
  return (
    <Reply>
      <Header title={`Planned · ${name}, ${dayLabel(first.date)}`} onOpen={() => router.push(`/day/${first.date}`)} />
      {days.length > 1 && (
        <Text variant="bodyMedium" style={[styles.line, { color: colors.textSecondary }]}>
          {days.length} workouts on the calendar
        </Text>
      )}
    </Reply>
  );
}

export function OpenerCard({ opener, onStart, onNotToday }: { opener: NonNullable<Opener>; onStart?: () => void; onNotToday?: () => void }) {
  const { colors } = useTheme();
  return (
    <Reply>
      <Text variant="bodyLarge" style={{ color: colors.text }}>{openerText(opener)}</Text>
      {opener.kind === 'planned' && opener.note && (
        <Text variant="bodyMedium" style={[styles.line, { color: colors.textSecondary }]}>{opener.note}</Text>
      )}
      {opener.kind === 'planned' && (
        <View style={styles.actions}>
          <Pill size="small" icon="play.fill" label={`Start ${opener.name.toLowerCase()}`} onPress={() => onStart?.()} />
          <Pill size="small" variant="glass" label="Not today" onPress={() => onNotToday?.()} />
        </View>
      )}
    </Reply>
  );
}

// The last few top sets, oldest to newest, the latest darkest. Every number is from the log.
export function LiftChart({ trend }: { trend: LiftTrend }) {
  const { colors } = useTheme();
  const sets = [...trend.recent].reverse();
  const max = Math.max(...sets.map(s => s.weight));
  const first = sets[0];
  const last = sets[sets.length - 1];
  const unit = last.unit === 'kg' ? 'kg' : 'lb';
  const scheme = last.sets && last.reps ? ` · ${last.sets}×${last.reps}` : last.reps ? ` · ${last.reps} reps` : '';
  const caption = `${first.weight} → ${last.weight} ${unit}${scheme}`;
  return (
    <View style={styles.chart} accessible accessibilityLabel={`${trend.lift}: ${caption}`}>
      <View style={styles.bars}>
        {sets.map((s, i) => (
          <View
            key={s.date}
            style={[styles.bar, { height: `${Math.max(20, (s.weight / max) * 100)}%`, backgroundColor: i === sets.length - 1 ? colors.text : colors.dim }]}
          />
        ))}
      </View>
      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reply: {
    alignSelf: 'flex-start',
    width: '86%',
    borderRadius: radius.bubble,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  fill: {
    flex: 1,
  },
  line: {
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  chart: {
    marginTop: spacing.sm,
    gap: 6,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 40,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
  },
});
