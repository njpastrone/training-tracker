import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { muscleGroupColors, spacing } from '../constants/theme';
import { macroLine } from '../services/foods';
import { scoreMeal } from '../services/foodPrefs';
import { useFoodPrefs } from '../stores/workoutStore';
import type { CoachCards, CoachReply } from '../services/ask';
import type { MealCard, WorkoutCard } from '../services/coachCards';
import type { CoachTurnState } from '../stores/chatStore';
import { SkyCard, SectionLabel } from './Sky';
import { Pill } from './Glass';
import FoodRows from './FoodRows';
import Scorecard from './Scorecard';
import LogoMark from './LogoMark';

interface Props {
  reply: CoachReply;
  cards?: CoachCards;
  turn?: Pick<CoachTurnState, 'planned' | 'logged' | 'remembered'>;
  chart?: React.ReactNode; // drawn from the log, below the answer
  onPlan?: (workout: WorkoutCard) => void;
  onLogMeal?: (meal: MealCard, index: number) => void;
  onRemember?: (yes: boolean) => void;
}

// The coach's answer: headline, the answer, then any card it carries (a workout to plan, meals to log,
// a thing to remember), and the facts from your log it rests on. Cards save only on a tap.
export default function CoachCard({ reply, cards, turn, chart, onPlan, onLogMeal, onRemember }: Props) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)}>
      <SkyCard accessibilityLiveRegion="polite">
        <View style={styles.top}>
          <LogoMark size={18} color={colors.sunrise} />
          {reply.headline ? (
            <Text variant="titleMedium" style={[styles.fill, { color: colors.text }]}>{reply.headline}</Text>
          ) : null}
        </View>
        <Text variant="bodyLarge" style={[styles.answer, { color: colors.text }]}>{reply.answer}</Text>
        {chart}

        {cards?.workout && <Workout workout={cards.workout} planned={turn?.planned} onPlan={onPlan && (() => onPlan(cards.workout!))} />}
        {cards?.meals?.map((meal, k) => (
          <Meal key={k} meal={meal} logged={!!turn?.logged?.[k]} onLog={onLogMeal && (() => onLogMeal(meal, k))} />
        ))}
        {cards?.remember && turn?.remembered === undefined && onRemember && (
          <View style={[styles.remember, { backgroundColor: colors.cobalt + '14' }]}>
            <Text variant="bodyMedium" style={[styles.fill, { color: colors.text }]}>Remember "{cards.remember.text}"?</Text>
            <Pressable onPress={() => onRemember(true)} accessibilityRole="button" accessibilityLabel="Yes, remember it" hitSlop={8}>
              <SymbolView name="checkmark.circle.fill" size={26} tintColor={colors.cobalt} />
            </Pressable>
            <Pressable onPress={() => onRemember(false)} accessibilityRole="button" accessibilityLabel="No" hitSlop={8}>
              <SymbolView name="xmark.circle.fill" size={26} tintColor={colors.textTertiary} />
            </Pressable>
          </View>
        )}
        {turn?.remembered === true && (
          <Text variant="bodySmall" style={[styles.fromLog, { color: colors.textSecondary }]}>Remembered. See Settings › What LiftText knows.</Text>
        )}

        {reply.fromLog ? (
          <Text variant="bodySmall" style={[styles.fromLog, { color: colors.textTertiary }]}>From your log: {reply.fromLog}</Text>
        ) : null}
      </SkyCard>
    </Animated.View>
  );
}

// A suggested session: one row per exercise with its muscle dot and numbers; Plan it puts it on the calendar
function Workout({ workout, planned, onPlan }: { workout: WorkoutCard; planned?: string; onPlan?: () => void }) {
  const { colors } = useTheme();
  const unit = workout.exercises.find(e => e.weightUnit)?.weightUnit === 'kg' ? 'kg' : 'lb';
  return (
    <View style={styles.card}>
      <SectionLabel>{workout.name}</SectionLabel>
      {workout.why ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{workout.why}</Text> : null}
      {workout.exercises.map((e, i) => (
        <View key={i} style={[styles.row, { borderTopColor: colors.dim }]}>
          <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.muscleGroup] }]} />
          <View style={styles.fill}>
            <View style={styles.nameRow}>
              <Text variant="bodyLarge" style={{ color: colors.text }}>{e.name}</Text>
              {e.isNew && <Text variant="labelSmall" style={[styles.tag, { color: colors.cobalt, backgroundColor: colors.cobalt + '1A' }]}>new for you</Text>}
            </View>
            {e.notes ? <Text variant="bodySmall" style={{ color: colors.textTertiary }}>{e.notes}</Text> : null}
          </View>
          <Text variant="labelMedium" style={{ color: colors.textSecondary }}>
            {e.sets} × {e.reps}{e.weight ? ` · ${e.weight} ${unit}` : ''}
          </Text>
        </View>
      ))}
      {planned ? (
        <Text variant="bodySmall" style={[styles.done, { color: colors.textSecondary }]}>Planned for {workout.when}. It's on Log when you're ready.</Text>
      ) : onPlan ? (
        <View style={styles.actions}>
          <Pill icon="calendar.badge.plus" size="small" label={`Plan for ${workout.when}`} onPress={onPlan} />
        </View>
      ) : null}
    </View>
  );
}

// One suggested meal: its foods with USDA numbers; Log it saves it into today's food. With food
// preferences set, the scorecard says which it hits and which it misses; price and time are estimates.
function Meal({ meal, logged, onLog }: { meal: MealCard; logged: boolean; onLog?: () => void }) {
  const { colors } = useTheme();
  const prefs = useFoodPrefs();
  const card = prefs && scoreMeal({ items: meal.items, price: meal.price, minutes: meal.minutes, unknown: meal.unknown }, prefs);
  const estimates = [meal.minutes ? `${meal.minutes} min` : '', meal.price ? `~$${meal.price} a serving` : ''].filter(Boolean).join(' · ');
  return (
    <View style={styles.card}>
      <View style={styles.mealHeader}>
        <SectionLabel style={styles.fill}>{meal.label}</SectionLabel>
        <Text variant="labelMedium" style={{ color: colors.textSecondary }}>{macroLine(meal.total)}</Text>
      </View>
      {estimates ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{estimates}</Text> : null}
      {meal.note ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{meal.note}</Text> : null}
      {card && card.of > 0 && (
        <View style={styles.score}>
          <Scorecard card={card} />
        </View>
      )}
      <FoodRows items={meal.items} />
      {meal.unknown.length > 0 && (
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>No numbers for {meal.unknown.join(', ')}: not counted.</Text>
      )}
      {card && card.of > 0 && (
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
          Food numbers from the USDA table; price and time are estimates.{prefs.matters.includes('lowSpike') ? ' "Spike" is a judgment from carbs and fiber, not a medical measure.' : ''}
        </Text>
      )}
      {onLog && (
        <View style={styles.actions}>
          <Pill icon={logged ? 'arrow.uturn.backward' : 'checkmark'} variant={logged ? 'glass' : 'filled'} size="small" label={logged ? 'Logged · Undo' : 'Log it'} onPress={onLog} />
        </View>
      )}
    </View>
  );
}

// Shown while the AI reads the log or thinks about an answer
export function ThinkingCard({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut}>
      <SkyCard>
        <View style={styles.top}>
          <LogoMark size={18} color={colors.sunrise} />
          <Text variant="titleMedium" style={{ color: colors.text }}>{title}</Text>
        </View>
        {[0.88, 0.72, 0.8].map(w => (
          <View key={w} style={[styles.skeleton, { width: `${w * 100}%`, backgroundColor: colors.dim }]} />
        ))}
      </SkyCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  answer: {
    marginTop: spacing.xs,
  },
  fromLog: {
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.gap,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  score: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  done: {
    marginTop: spacing.sm,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.gap,
    marginTop: spacing.gap,
  },
  skeleton: {
    height: 12,
    borderRadius: 6,
    marginTop: 10,
  },
});
