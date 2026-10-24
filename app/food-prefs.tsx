import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import Field from '../components/Field';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { BUDGETS, COOKING, NEVER_CHIPS, PREFERENCES } from '../services/foodPrefs';
import { spacing } from '../constants/theme';
import type { FoodPreference, FoodPrefs } from '../types/workout';

const NONE: FoodPrefs = { matters: [], never: [] };
const BUDGET_OPTIONS = [...BUDGETS.map(b => ({ value: String(b), label: `$${b}` })), { value: 'any', label: 'Any' }];
const COOKING_OPTIONS = COOKING.map(m => ({ value: String(m), label: m === 0 ? "Don't cook" : `${m} min` }));
const NEVER_WORDS = Object.keys(NEVER_CHIPS);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const splitWords = (text: string) => text.split(',').map(w => w.trim()).filter(Boolean);

// How you like to eat (data/lt-ui-g/report.md §3.2), the same sheet for setup and later edits: what
// matters, a budget, foods never to suggest, how long you cook. Changes save as you make them, on this
// phone; they go to the AI only inside a meal question, and the Worker never stores them.
export default function FoodPrefsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings } = useWorkoutStore();
  const prefs = settings.foodPrefs ?? NONE;
  const set = (patch: Partial<FoodPrefs>) => updateSettings({ foodPrefs: { ...prefs, ...patch } });
  const chipWords = prefs.never.filter(w => NEVER_WORDS.includes(w));
  // Your own words stay in the field as typed; they're saved split on commas
  const [other, setOther] = useState(prefs.never.filter(w => !NEVER_WORDS.includes(w)).join(', '));

  const toggleMatter = (p: FoodPreference) => set({ matters: PREFERENCES.map(x => x.value).filter(v => (v === p ? !prefs.matters.includes(v) : prefs.matters.includes(v))) });
  const toggleNever = (w: string) => set({ never: [...(chipWords.includes(w) ? chipWords.filter(x => x !== w) : [...chipWords, w]), ...splitWords(other)] });
  const changeOther = (text: string) => {
    setOther(text);
    set({ never: [...chipWords, ...splitWords(text)] });
  };

  const chips = (words: { value: string; label: string }[], on: (v: string) => boolean, toggle: (v: string) => void) => (
    <View style={styles.chips}>
      {words.map(w => (
        <Pill key={w.value} size="small" variant={on(w.value) ? 'filled' : 'glass'} label={w.label} onPress={() => toggle(w.value)} />
      ))}
    </View>
  );

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Food preferences" subtitle="Used for every meal idea" />

        <SectionLabel style={[styles.label, styles.firstLabel]}>What matters to you</SectionLabel>
        <SkyCard>
          {chips(PREFERENCES, v => prefs.matters.includes(v as FoodPreference), v => toggleMatter(v as FoodPreference))}
          <Text variant="bodySmall" style={[styles.help, { color: colors.textTertiary }]}>
            Every suggestion is checked against these one by one, and tells you which it hits and which it misses.
          </Text>
        </SkyCard>

        <SectionLabel style={styles.label}>A meal should cost about</SectionLabel>
        <SkyCard>
          <Segmented value={prefs.budget ? String(prefs.budget) : 'any'} options={BUDGET_OPTIONS} onChange={v => set({ budget: v === 'any' ? undefined : (Number(v) as FoodPrefs['budget']) })} />
        </SkyCard>

        <SectionLabel style={styles.label}>Never suggest</SectionLabel>
        <SkyCard>
          {chips(NEVER_WORDS.map(w => ({ value: w, label: cap(w) })), v => chipWords.includes(v), toggleNever)}
          <Field
            value={other}
            onChangeText={changeOther}
            placeholder="Anything else you avoid, in your words"
            accessibilityLabel="Other foods never to suggest"
            autoCapitalize="none"
            containerStyle={styles.field}
          />
          <Text variant="bodySmall" style={[styles.help, { color: colors.textTertiary }]}>These are never shown, not scored. Allergies go here. Separate with commas.</Text>
        </SkyCard>

        <SectionLabel style={styles.label}>Cooking</SectionLabel>
        <SkyCard>
          <Segmented value={prefs.cooking === undefined ? '' : String(prefs.cooking)} options={COOKING_OPTIONS} onChange={v => set({ cooking: Number(v) as FoodPrefs['cooking'] })} />
          <Text variant="bodySmall" style={[styles.help, { color: colors.textTertiary }]}>The most time a meal idea may take.</Text>
        </SkyCard>

        <Text variant="bodySmall" style={[styles.footer, { color: colors.textTertiary }]}>
          Saved on this iPhone. Sent to the AI only with a meal idea, never stored by our server.
        </Text>
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  label: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  firstLabel: {
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  help: {
    marginTop: spacing.gap,
  },
  field: {
    marginTop: spacing.gap,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
