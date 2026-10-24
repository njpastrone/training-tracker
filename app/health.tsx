import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { Stack, useRouter } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { Pill } from '../components/Glass';
import HealthCard from '../components/HealthCard';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { healthAvailable } from '../services/health';
import { spacing } from '../constants/theme';

// Apple Health, from the Health door on Training and the Body weight door on Food: body weight and
// workouts other apps saved, read fresh each visit (components/HealthCard.tsx); a way to turn it on when it's off
export default function HealthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const on = useWorkoutStore(s => !!s.settings.appleHealth?.connected) && healthAvailable();
  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Apple Health" subtitle={on ? 'Read each visit, never stored' : 'Off'} />
        {on ? (
          <HealthCard />
        ) : (
          <SkyCard style={styles.empty}>
            <SymbolView name="heart.text.square" size={30} tintColor={colors.sunrise} />
            <Text variant="titleMedium" style={[styles.center, { color: colors.text }]}>Body weight and other apps' workouts</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>
              Turn on Apple Health in Settings to see your body weight and workouts other apps saved in the last 7 days. Nothing read is stored or sent anywhere.
            </Text>
            <Pill size="small" label="Open Settings" onPress={() => router.push('/settings')} />
          </SkyCard>
        )}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
