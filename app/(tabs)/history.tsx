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
import { format } from 'date-fns';
import { getPlans, deletePlan } from '../../services/planner';
import { TrainingPlan } from '../../types/plan';

// Chat bar chips: a new plan from a starter, an open plan from its own tweaks
const STARTERS = ['Re-entry week', 'Next week', 'PPL split', 'Upper / lower', '3 days a week'];
const DEFAULT_TWEAKS = ['Easier', 'Harder', '45 min max', 'Different days', 'Add cardio'];
const MONTHS_PER_PAGE = 3;

// The record: the calendar, then every workout by month. How it's going lives on Progress.
export default function HistoryScreen() {
  const { workouts, schedule, loadTemplates, loadSchedule, settings, updateSettings } = useWorkoutStore();
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
  const months = useMemo(() => [...new Set(workouts.map(w => w.date.slice(0, 7)))], [workouts]);
  const oldestShown = months[Math.min(pages * MONTHS_PER_PAGE, months.length) - 1];
  const shown = useMemo(() => workouts.filter(w => w.date.slice(0, 7) >= oldestShown), [workouts, oldestShown]);

  // Training days, the unit the sky and Progress count in
  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const daysThisMonth = useMemo(() => new Set(workouts.filter(w => w.date.startsWith(thisMonth)).map(w => w.date)).size, [workouts, thisMonth]);

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
      Alert.alert('Error', 'Failed to delete the plan.');
    }
  };

  return (
    <ChatScreen
      bar={{
        value: planner.text,
        onChangeText: planner.setText,
        onSend: () => planner.send(planner.text),
        placeholder: planner.draft ? 'Fix or ask…' : 'Plan your week…',
        chips: planner.draft ? (planner.draft.chips.length ? planner.draft.chips : DEFAULT_TWEAKS) : STARTERS,
        onChip: planner.send,
        busy: planner.busy,
        disabled: planner.saving,
        error: planner.draft ? null : planner.error, // the plan card shows its own errors
      }}
      follow={planning}
      overlay={<UndoToast />}
    >
      <LargeTitle
        title="History"
        subtitle={daysThisMonth ? `${daysThisMonth} training day${daysThisMonth === 1 ? '' : 's'} in ${format(now, 'MMMM')}` : undefined}
      />

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
            <Calendar workouts={workouts} schedule={schedule} />
          </SkyCard>

          {workouts.length > 0 ? (
            <>
              <SelectableWorkoutList label="Workouts" workouts={shown} byMonth />
              {shown.length < workouts.length && (
                <Pill variant="glass" label="Show earlier" onPress={() => setPages(pages + 1)} style={styles.earlier} />
              )}
            </>
          ) : (
            <SkyCard style={styles.empty}>
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
