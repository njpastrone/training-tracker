import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { DEFAULT_MATTERS, MAKE_IT_QUESTION, prefsSummary } from '../services/foodPrefs';
import { foodByDay } from '../services/progress';
import { Pill } from './Glass';

// The food surface's one slot for preferences (data/lt-ui-g/report.md §3.1, §3.3): until preferences
// exist, the one-time set-up prompt (Not now hides it for good); after, one line on what is left today
// and the Make it entry, which asks the coach on Chat. Shown only where food data already exists. Built
// for any food surface to mount; the Food tab can put it in its coach slot.
export default function FoodPrefsEntry({ today = format(new Date(), 'yyyy-MM-dd') }: { today?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings, updateSettings, foodEntries } = useWorkoutStore();
  const prefs = settings.foodPrefs;

  if (!prefs) {
    if (settings.foodPrefsPromptDismissed) return null;
    return (
      <View style={[styles.block, { borderTopColor: colors.dim }]}>
        <Text variant="titleMedium" style={{ color: colors.text }}>How do you like to eat?</Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          Tell LiftText once: high protein, fewer spikes, no seed oils, your budget. Every meal idea is checked against it.
        </Text>
        <View style={styles.actions}>
          <Pill
            size="small"
            label="Set up · 30 seconds"
            onPress={() => {
              updateSettings({ foodPrefs: { matters: DEFAULT_MATTERS, never: [] } });
              router.push('/food-prefs');
            }}
          />
          <Pill size="small" variant="glass" label="Not now" onPress={() => updateSettings({ foodPrefsPromptDismissed: true })} />
        </View>
      </View>
    );
  }

  const goal = settings.goals?.food;
  const day = foodByDay(foodEntries).get(today);
  const left = goal?.kind === 'protein' && day ? Math.max(0, goal.target - day.protein) : undefined;
  const line = left === undefined ? prefsSummary(prefs) : left ? `${left} g protein left today` : 'Protein goal met today';
  return (
    <View style={[styles.block, { borderTopColor: colors.dim }]}>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{line}</Text>
      <View style={styles.actions}>
        <Pill size="small" variant="glass" icon="fork.knife" label="Make it" onPress={() => router.navigate({ pathname: '/(tabs)/chat', params: { question: MAKE_IT_QUESTION } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.sm,
    paddingTop: spacing.gap,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
