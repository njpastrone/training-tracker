import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { Stack, useRouter } from 'expo-router';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { exerciseOverview } from '../services/progress';
import { daysAgo } from '../services/format';
import { plural } from '../services/importHistory';
import { spacing } from '../constants/theme';

// Every exercise you have, A to Z: how often, when last and your best. Each opens its screen,
// where it can be renamed, merged or split.
export default function ExercisesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { workouts, exerciseLibrary, settings } = useWorkoutStore();
  const list = useMemo(() => exerciseOverview(workouts, exerciseLibrary, settings.weightUnit), [workouts, exerciseLibrary, settings.weightUnit]);

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Exercises" subtitle={list.length ? plural(list.length, 'exercise') : 'Nothing logged yet'} />
        {list.length === 0 ? (
          <SkyCard style={styles.empty}>
            <SymbolView name="dumbbell" size={30} tintColor={colors.sunrise} />
            <Text variant="titleMedium" style={[styles.center, { color: colors.text }]}>Your exercises show up here</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.textSecondary }]}>Log a workout and each exercise gets a line.</Text>
          </SkyCard>
        ) : (
          <SkyCard>
            {/* ponytail: renders every row; a FlatList when someone has hundreds of exercises */}
            {list.map((e, i) => {
              const last = e.lastDate && `last ${daysAgo(differenceInCalendarDays(new Date(), parseISO(e.lastDate)))}`;
              const line = [e.count ? `Logged ${e.count}×` : 'Not logged yet', last, e.best && `best ${e.best}`].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={e.id}
                  onPress={() => router.push({ pathname: '/exercise', params: { id: e.id } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && styles.pressed]}
                >
                  <View style={styles.fill}>
                    <Text variant="bodyLarge" style={{ color: colors.text }}>{e.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{line}</Text>
                  </View>
                  <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
                </Pressable>
              );
            })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
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
