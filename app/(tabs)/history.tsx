import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import { ChatScreen } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import PlanCard from '../../components/PlanCard';
import { usePlanner } from '../../hooks/usePlanner';
import { GOALS } from '../../services/onboarding';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/Calendar';
import SelectableWorkoutList, { UndoToast } from '../../components/SelectableWorkoutList';
import { spacing } from '../../constants/theme';
import { addDays, format, subDays } from 'date-fns';
import { getPlans, deletePlan } from '../../services/planner';
import { planChips, toChips } from '../../services/suggestions';
import { weekLine } from '../../services/format';
import { foodByDay } from '../../services/progress';
import { TrainingPlan } from '../../types/plan';

// Chat bar chips: a new plan from your own week (services/suggestions.ts), an open plan from its own tweaks
const DEFAULT_TWEAKS = ['Easier', 'Harder', '45 min max', 'Different days', 'Add cardio'];
const MONTHS_PER_PAGE = 3;

// The record: the calendar, then every day by month (its training, and its food for people who log it).
// How it's going lives on Progress.
export default function HistoryScreen() {
  const { workouts, foodEntries, schedule, loadTemplates, loadSchedule, settings, updateSettings } = useWorkoutStore();
  const { colors } = useTheme();
  const router = useRouter();

  // planId: set after Plan it, so this tab can offer Undo. request: a plan asked for from the Log tab or a day
  const { planId, request } = useLocalSearchParams<{ planId?: string; request?: string }>();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const planner = usePlanner({ plans, onPlanned: plan => router.setParams({ planId: plan.id }) });
  const planning = !!planner.sent || !!planner.draft;
  const addedPlan = plans.find(p => p.id === planId && p.status === 'active');
  const addedCount = schedule.filter(s => s.planId === planId).length;

  // A few months at a time, newest first (the store keeps the log sorted by date)
  const [pages, setPages] = useState(1);
  const food = useMemo(() => foodByDay(foodEntries), [foodEntries]);
  const foodDates = useMemo(() => new Set(food.keys()), [food]);
  const months = useMemo(() => [...new Set([...workouts.map(w => w.date), ...foodDates].map(d => d.slice(0, 7)))].sort().reverse(), [workouts, foodDates]);
  const oldestShown = months[Math.min(pages * MONTHS_PER_PAGE, months.length) - 1];
  const shown = useMemo(() => workouts.filter(w => w.date.slice(0, 7) >= oldestShown), [workouts, oldestShown]);
  const shownFood = useMemo(() => new Map([...food].filter(([date]) => date.slice(0, 7) >= oldestShown)), [food, oldestShown]);

  // The rolling 7 days: days with a workout or food logged, and planned days from today on
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisWeek = useMemo(() => {
    const first = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    const last = format(addDays(new Date(), 6), 'yyyy-MM-dd');
    const logged = new Set([...workouts.map(w => w.date), ...foodDates].filter(d => d >= first && d <= today));
    const trained = new Set(workouts.map(w => w.date));
    const planned = new Set(schedule.filter(s => s.date >= today && s.date <= last && !s.completed && !s.skipped && !trained.has(s.date)).map(s => s.date));
    return weekLine(logged.size, planned.size);
  }, [workouts, foodDates, schedule, today]);
  // Plan chips are for people who train; someone who only logs food doesn't get them
  const foodOnly = !workouts.length && foodDates.size > 0;
  const starters = useMemo(() => (foodOnly ? [] : planChips(workouts, settings.weeklyTarget)), [foodOnly, workouts, settings.weeklyTarget]);

  useEffect(() => {
    loadTemplates();
    loadSchedule();
  }, []);

  useEffect(() => {
    getPlans().then(setPlans);
  }, [schedule]);

  useEffect(() => {
    if (!request) return;
    planner.setText(request);
    router.setParams({ request: '' });
  }, [request]);

  const handleDeletePlan = async (id: string) => {
    try {
      await deletePlan(id);
      await Promise.all([loadSchedule(), loadTemplates()]);
      if (id === planId) router.setParams({ planId: '' });
    } catch (error) {
      Alert.alert("Couldn't delete the plan", 'Try again.');
    }
  };

  return (
    <ChatScreen
      bar={{
        value: planner.text,
        onChangeText: planner.setText,
        onSend: () => planner.send(planner.text),
        placeholder: planner.draft ? 'Fix or ask…' : 'Plan your week…',
        chips: planner.draft ? toChips(planner.draft.chips.length ? planner.draft.chips : DEFAULT_TWEAKS) : planner.text.trim() ? [] : starters,
        onChip: planner.send,
        busy: planner.busy,
        disabled: planner.saving,
        error: planner.draft ? null : planner.error, // the plan card shows its own errors
      }}
      follow={planning}
      overlay={<UndoToast />}
    >
      <LargeTitle title="History" subtitle={thisWeek} />

      {/* The goal is asked once planning starts, then remembered (Settings can change it) */}
      {(planning || !!planner.text.trim()) && !settings.goal && (
        <SkyCard>
          <SectionLabel>What are you training for?</SectionLabel>
          <View style={styles.goalRow}>
            {GOALS.map(goal => (
              <Pill key={goal.value} variant="glass" size="small" label={goal.label} onPress={() => updateSettings({ goal: goal.value })} />
            ))}
          </View>
        </SkyCard>
      )}

      {/* Planning: your message, then the plan to tweak in the bar and put on the calendar */}
      {planner.sent && <UserBubble text={planner.sent} />}
      {planner.draft && planner.preview && (
        <PlanCard
          draft={planner.draft}
          previous={planner.previous}
          preview={planner.preview}
          context={planner.context}
          busy={planner.busy}
          saving={planner.saving}
          error={planner.error}
          onPlanIt={planner.planIt}
          onUndo={planner.undoTweak}
          onStartOver={planner.startOver}
        />
      )}

      {!planning && (
        <>
          {addedPlan && (
            <SkyCard style={styles.planBanner}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.mint} />
              <Text variant="bodyMedium" style={[styles.planBannerText, { color: colors.text }]}>
                {addedPlan.name} added · {addedCount} workout{addedCount === 1 ? '' : 's'}
              </Text>
              <Pill variant="glass" size="small" label="Undo" onPress={() => planId && handleDeletePlan(planId)} />
              <Pressable onPress={() => router.setParams({ planId: '' })} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={15}>
                <SymbolView name="xmark" size={14} weight="semibold" tintColor={colors.textSecondary} />
              </Pressable>
            </SkyCard>
          )}

          {/* Every day opens its day screen: what was logged, or what's planned and how to change it */}
          <SkyCard>
            <Calendar workouts={workouts} schedule={schedule} foodDates={foodDates} />
          </SkyCard>

          {months.length > 0 ? (
            <>
              <SelectableWorkoutList label="Days" workouts={shown} byMonth food={shownFood} goal={settings.goals?.food} />
              {oldestShown !== months[months.length - 1] && (
                <Pill variant="glass" label="Show earlier" onPress={() => setPages(pages + 1)} style={styles.earlier} />
              )}
            </>
          ) : (
            <SkyCard style={styles.empty}>
              <SymbolView name="calendar" size={30} tintColor={colors.sunrise} />
              <Text variant="titleMedium" style={[styles.center, { color: colors.text }]}>Your workouts show up here</Text>
              <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
                Log one on the Log tab, or plan your week below.
              </Text>
            </SkyCard>
          )}
        </>
      )}
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  planBannerText: {
    flex: 1,
    fontWeight: '500',
  },
  earlier: {
    marginTop: spacing.gap,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
