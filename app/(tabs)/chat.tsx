import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ChatScreen, logBar, type ChatBarProps } from '../../components/ChatBar';
import { UserBubble } from '../../components/Chat';
import CoachCard, { ThinkingCard } from '../../components/CoachCard';
import ParsedCard from '../../components/ParsedCard';
import FoodCard from '../../components/FoodCard';
import FinderCard from '../../components/FinderCard';
import PlanCard from '../../components/PlanCard';
import { LiftChart, LoggedCard, MovedCard, MovePickCard, OpenerCard, PlannedCard } from '../../components/ThreadCards';
import { dayLabel } from '../../components/WorkoutCard';
import { LargeTitle, SkySheet } from '../../components/Sky';
import { HeaderButton, Pill } from '../../components/Glass';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useChatStore } from '../../stores/chatStore';
import { useCoach } from '../../hooks/useCoach';
import { FIND_CHIP, useFinder } from '../../hooks/useFinder';
import { asksNearby } from '../../services/finder';
import { useLogDraft } from '../../hooks/useLogDraft';
import { usePlanner } from '../../hooks/usePlanner';
import { getPlans } from '../../services/planner';
import { templateService } from '../../services/templates';
import { digest } from '../../services/insights';
import { needsStamp } from '../../services/thread';
import { openerChips, pickOpener } from '../../services/opener';
import { askChips, toChips } from '../../services/suggestions';
import { spacing } from '../../constants/theme';
import type { TrainingPlan } from '../../types/plan';

const PAGE = 100; // items shown before "Show earlier"
const PLAN = /^plan\b/i; // "plan my week" plans here; anything else logs or asks
const DEFAULT_TWEAKS = ['Easier', 'Harder', '45 min max', 'Different days', 'Add cardio'];

// Your log as one thread (stores/chatStore.ts): everything typed into any bar, with what came of it.
// Questions are answered here from your own log; the opener at the bottom means it's never a blank
// chat. Logs and plans typed here are reviewed in the thread; Settings is behind the gear.
export default function ChatScreenTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const { question, find } = useLocalSearchParams<{ question?: string; find?: string }>();
  const { workouts, foodEntries, schedule, templates, exerciseLibrary, settings, markWorkoutCompleted, loadSchedule, loadTemplates } = useWorkoutStore();
  const { items, skippedOpener, skipOpener } = useChatStore();
  const [pages, setPages] = useState(1);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const coach = useCoach();
  const finder = useFinder();
  const todaysSchedule = schedule.find(s => s.date === today && !s.completed && !s.skipped);
  // A question the coach couldn't answer goes back in the bar to try again, unless the bar is fixing
  // a card by then (sending it would apply the question as a fix)
  const reviewingRef = useRef(false);
  const ask = async (q: string) => {
    // "Find healthy food near me" is the one-button finder, not a coach question
    if (asksNearby(q)) return finder.run();
    if (!(await coach.ask(q)) && !reviewingRef.current) log.setText(q);
  };
  const log = useLogDraft({
    date: today,
    withFood: true,
    moves: true,
    onQuestion: ask,
    onLogged: async (workoutId, templateId) => {
      // Started from today's plan: mark the day done, as Log does
      if (templateId && todaysSchedule?.templateId === templateId) await markWorkoutCompleted(todaysSchedule.date, workoutId).catch(() => {});
    },
  });
  const planner = usePlanner({ plans, onPlanned: () => {} });

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, []);
  useEffect(() => {
    getPlans().then(setPlans);
  }, [schedule]);

  // A question typed into another tab's bar arrives here already asked
  useEffect(() => {
    if (!question) return;
    ask(question);
    router.setParams({ question: '' });
  }, [question]);
  // Done on Where to look leads straight to the finder
  useEffect(() => {
    if (!find) return;
    finder.run();
    router.setParams({ find: '' });
  }, [find]);

  const trends = useMemo(() => new Map(digest(workouts, exerciseLibrary, settings.weightUnit).liftTrends.map(t => [t.id, t])), [workouts, exerciseLibrary, settings.weightUnit]);
  const opener = pickOpener({ workouts, schedule, templates, library: exerciseLibrary, unit: settings.weightUnit, threadEmpty: items.length === 0, skippedOpener }, now);
  const comebackChips = openerChips(opener);
  const askStarters = useMemo(() => askChips(workouts, exerciseLibrary, settings.weightUnit, settings.goals?.food?.kind === 'protein'), [workouts, exerciseLibrary, settings.weightUnit, settings.goals?.food?.kind]);
  const starters = comebackChips.length ? toChips(comebackChips) : [...toChips([FIND_CHIP]), ...askStarters];

  const shown = items.slice(-PAGE * pages);
  const reviewing = !!log.sent || !!log.draft || !!log.food;
  reviewingRef.current = !!log.draft || !!log.food;
  const planning = !!planner.sent || !!planner.draft;
  const working = reviewing || planning || coach.busy || finder.busy;

  const startPlanned = () => {
    const template = opener?.kind === 'planned' && templates.find(t => t.id === opener.templateId);
    if (template) log.startFromTemplate(templateService.templateToWorkout(template), template.id);
  };

  const bar: ChatBarProps = reviewing
    ? logBar(log, '', [])
    : planning
      ? {
          value: planner.text,
          onChangeText: planner.setText,
          onSend: () => planner.send(planner.text),
          placeholder: 'Fix or ask…',
          chips: planner.draft ? toChips(planner.draft.chips.length ? planner.draft.chips : DEFAULT_TWEAKS) : [],
          onChip: planner.send,
          busy: planner.busy,
          disabled: planner.saving,
          error: planner.draft ? null : planner.error,
        }
      : {
          value: log.text,
          onChangeText: log.setText,
          onSend: () => {
            coach.clearError();
            finder.clearError();
            const text = log.text.trim();
            if (asksNearby(text)) {
              log.setText('');
              return finder.run();
            }
            if (!PLAN.test(text)) return log.parse(); // a question goes to the coach (routeComposer)
            log.setText('');
            planner.send(text);
          },
          placeholder: 'Log something or ask',
          chips: log.text.trim() ? [] : finder.chips.length ? toChips(finder.chips) : coach.chips.length ? toChips(coach.chips) : starters,
          onChip: text => (finder.chips.includes(text) ? finder.refine(text) : ask(text)),
          busy: log.busy === 'parse' || coach.busy || planner.busy || finder.busy,
          error: log.error ?? planner.error ?? coach.error ?? finder.error,
        };

  return (
    <ChatScreen bar={bar} follow>
      <LargeTitle
        title="Chat"
        subtitle="Everything you've told LiftText"
        right={<HeaderButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} />}
      />
      <SkySheet>
        {items.length > shown.length && <Pill variant="glass" size="small" label="Show earlier" onPress={() => setPages(pages + 1)} style={styles.earlier} />}

        {shown.map((item, i) => (
          <Fragment key={item.id}>
            {needsStamp(shown[i - 1], item) && (
              <Text variant="labelMedium" style={[styles.stamp, { color: colors.textTertiary }]}>
                {dayLabel(format(parseISO(item.at), 'yyyy-MM-dd'))} · {format(parseISO(item.at), 'h:mm a')}
              </Text>
            )}
            {item.kind === 'you' && <UserBubble text={item.text} />}
            {item.kind === 'logged' && <LoggedCard item={item} />}
            {item.kind === 'planned' && <PlannedCard item={item} />}
            {item.kind === 'moved' && <MovedCard item={item} />}
            {item.kind === 'nearby' && (
              <View style={styles.answer}>
                <FinderCard
                  result={item.result}
                  logged={!!item.logged}
                  busy={finder.busy}
                  onWhere={where => finder.run(item.result.ask, where, item.id)}
                  onDirections={finder.directions}
                  onLog={() => finder.log(item.id)}
                />
              </View>
            )}
            {item.kind === 'answer' && (
              <View style={styles.answer}>
                <CoachCard
                  reply={item.turn.reply}
                  cards={item.turn.cards}
                  turn={item.turn}
                  chart={item.turn.chartExerciseId && trends.get(item.turn.chartExerciseId) ? <LiftChart trend={trends.get(item.turn.chartExerciseId)!} /> : undefined}
                  onPlan={workout => coach.plan(item.id, workout)}
                  onLogMeal={(meal, k) => coach.logMeal(item.id, meal, k)}
                  onRemember={yes => coach.remember(item.id, yes)}
                />
              </View>
            )}
          </Fragment>
        ))}

        {!working && opener && <OpenerCard opener={opener} onStart={startPlanned} onNotToday={() => skipOpener(today)} />}

        {/* What's being worked on now: reviewed here, added to the thread once saved */}
        {coach.pending && (
          <>
            <UserBubble text={coach.pending} />
            <ThinkingCard title="Thinking about your log…" />
          </>
        )}

        {finder.pending && (
          <>
            <UserBubble text={finder.pending} />
            <ThinkingCard title="Looking nearby…" />
          </>
        )}

        {log.sent && <UserBubble text={log.sent} />}
        {log.busy === 'parse' && <ThinkingCard title="Reading it…" />}
        {log.picking && <MovePickCard entries={log.picking.entries} to={log.picking.to} onPick={entry => log.pickMove(entry, log.picking!.to)} onCancel={log.discard} />}
        {log.draft && (
          <ParsedCard
            key={log.templateId ?? 'parsed'}
            draft={log.draft}
            date={today}
            title={log.templateId ? templates.find(t => t.id === log.templateId)?.name : undefined}
            onChange={log.setDraft}
            onSave={log.save}
            onDiscard={log.discard}
            busy={log.busy}
            error={log.error}
            reply={log.reply}
            food={log.food}
            onFoodChange={log.setFood}
          />
        )}
        {log.food && !log.draft && (
          <FoodCard food={log.food} date={today} onChange={log.setFood} onSave={log.save} onDiscard={log.discard} busy={log.busy} error={log.error} reply={log.reply} />
        )}

        {planner.sent && <UserBubble text={planner.sent} />}
        {planner.busy && !planner.draft && <ThinkingCard title="Planning…" />}
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
      </SkySheet>
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  earlier: {
    alignSelf: 'center',
    marginBottom: spacing.gap,
  },
  stamp: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  answer: {
    marginBottom: 12,
  },
});
