import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { format } from 'date-fns';
import { SkyScreen, SkyCard, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import { UserBubble } from '../components/Chat';
import LogoMark from '../components/LogoMark';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, muscleGroupColors, spacing } from '../constants/theme';
import { DAYS_OPTIONS, guessUnit } from '../services/onboarding';
import { WeightUnit } from '../types/workout';

// First-run setup: two skippable screens, then the first log happens on the real Log screen.
// Shown only on a fresh install (app/_layout.tsx); finishing or skipping sets settings.onboardedAt.

const DEMO_TEXT = 'chest and back today: bench, rows, pull-ups';
const DEMO_CARD = [
  { name: 'Bench Press', group: 'chest' },
  { name: 'Barbell Row', group: 'back' },
  { name: 'Pull-ups', group: 'back' },
] as const;

export default function WelcomeScreen() {
  const updateSettings = useWorkoutStore(s => s.updateSettings);
  const { colors } = useTheme();
  const [step, setStep] = useState<'welcome' | 'choices'>('welcome');
  const [unit, setUnit] = useState<WeightUnit>(() => guessUnit(Intl.DateTimeFormat().resolvedOptions().locale));
  const [days, setDays] = useState<(typeof DAYS_OPTIONS)[number]['value']>('3');

  // Skip keeps the defaults: the region's unit and the usual 3 a week
  const finish = (choices?: { weightUnit: WeightUnit; weeklyTarget: number }) =>
    updateSettings({ onboardedAt: format(new Date(), 'yyyy-MM-dd'), weightUnit: unit, ...choices });

  return (
    <SkyScreen edges={['top', 'bottom']}>
      {step === 'welcome' ? (
        <Animated.View key="welcome" entering={FadeIn} exiting={FadeOut} style={styles.page}>
          <View style={styles.top}>
            <LogoMark size={44} color={colors.sunrise} />
            <Demo />
          </View>
          <Copy title="Type it like a text. We'll log it." body="Say what you did, in your own words. Exercise names are enough; add sets and weights if you like." />
          <Actions primary="Get started" onPrimary={() => setStep('choices')} onSkip={() => finish()} />
        </Animated.View>
      ) : (
        <Animated.View key="choices" entering={FadeIn} style={styles.page}>
          <View style={styles.top}>
            <Copy title="Make it yours" body="Two quick picks. You can change them in Settings." />
            <SectionLabel style={styles.label}>Weights in</SectionLabel>
            <Segmented value={unit} options={[{ value: 'lbs', label: 'lb' }, { value: 'kg', label: 'kg' }]} onChange={setUnit} />
            <SectionLabel style={styles.label}>Days a week</SectionLabel>
            <Segmented value={days} options={[...DAYS_OPTIONS]} onChange={setDays} />
            <Text variant="bodySmall" style={[styles.hint, { color: colors.textTertiary }]}>
              The sky brightens with each workout and reaches full daylight at {days}.
            </Text>
          </View>
          <Actions primary="Continue" onPrimary={() => finish({ weightUnit: unit, weeklyTarget: Number(days) })} onSkip={() => finish()} />
        </Animated.View>
      )}
    </SkyScreen>
  );
}

function Copy({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.copy}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>{body}</Text>
    </View>
  );
}

function Actions({ primary, onPrimary, onSkip }: { primary: string; onPrimary: () => void; onSkip: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.actions}>
      <Pill label={primary} onPress={onPrimary} />
      <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={8} style={styles.skip}>
        <Text variant="labelLarge" style={{ color: colors.textSecondary }}>Skip</Text>
      </Pressable>
    </View>
  );
}

// A sentence types itself out and turns into a workout card, on a loop. Still under Reduce Motion.
function Demo() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [typed, setTyped] = useState(reduceMotion ? DEMO_TEXT.length : 0);
  const done = typed >= DEMO_TEXT.length;

  useEffect(() => {
    if (reduceMotion) return;
    // ~45 ms a letter, then hold the card for 3 s and start over
    const timer = setTimeout(() => setTyped(done ? 0 : typed + 1), done ? 3000 : typed === 0 ? 600 : 45);
    return () => clearTimeout(timer);
  }, [typed, done, reduceMotion]);

  return (
    <View style={styles.demo} accessible accessibilityLabel={`Example: "${DEMO_TEXT}" becomes Bench Press, Barbell Row and Pull-ups`}>
      <UserBubble text={typed ? DEMO_TEXT.slice(0, typed) : ' '} />
      {done && (
        <Animated.View entering={FadeInDown.springify().damping(17)} exiting={FadeOut}>
          <SkyCard>
            <View style={styles.cardHeader}>
              <LogoMark size={18} color={colors.sunrise} />
              <Text variant="titleMedium" style={{ color: colors.text }}>Got it</Text>
            </View>
            {DEMO_CARD.map(e => (
              <View key={e.name} style={[styles.row, { borderTopColor: colors.dim }]}>
                <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.group] }]} />
                <Text variant="bodyLarge" style={{ color: colors.text }}>{e.name}</Text>
              </View>
            ))}
          </SkyCard>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  top: {
    gap: spacing.gap,
  },
  demo: {
    minHeight: 250,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.rounded,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  label: {
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  hint: {
    marginLeft: spacing.xs,
  },
  actions: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: spacing.gap,
  },
});
