import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SkyCard, SectionLabel } from './Sky';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { activityName, healthAvailable, readHealthWeek, type HealthWeek } from '../services/health';
import { formatDuration } from '../services/format';
import { spacing } from '../constants/theme';

// Apple Health, behind the Health and Body weight doors, once it's on in Settings: workouts other apps and devices saved in the last 7 days
// and your body weight. Read fresh on each visit and held only here: never stored, backed up or sent anywhere.
export default function HealthCard() {
  const { colors } = useTheme();
  const unit = useWorkoutStore(s => s.settings.weightUnit);
  const on = useWorkoutStore(s => !!s.settings.appleHealth?.connected) && healthAvailable();
  const [week, setWeek] = useState<HealthWeek | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!on) {
        setWeek(null);
        return;
      }
      let live = true;
      readHealthWeek(unit)
        .then(w => live && setWeek(w))
        .catch(error => console.error('Apple Health read failed:', error));
      return () => {
        live = false;
      };
    }, [on, unit])
  );

  if (!on || !week) return null;
  const { weight, workouts } = week;
  const change = weight?.change !== undefined && weight.since
    ? `${weight.change === 0 ? 'no change' : `${weight.change > 0 ? 'up' : 'down'} ${Math.abs(weight.change)} ${unit}`} since ${format(parseISO(weight.since), 'MMM d')}`
    : undefined;

  return (
    <>
      <SectionLabel style={styles.label}>Apple Health · last 7 days</SectionLabel>
      <SkyCard>
        {weight && (
          <View style={styles.row}>
            <Text variant="bodyLarge" style={{ color: colors.text }}>Body weight {weight.now} {unit}</Text>
            {change && <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{change}</Text>}
          </View>
        )}
        {workouts.map((w, i) => (
          <View key={`${w.start}-${i}`} style={[styles.row, (i > 0 || weight) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text variant="bodyLarge" style={{ color: colors.text }}>{`${activityName(w.activity)} · ${formatDuration(Math.round((w.end - w.start) / 60000))}`}</Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{`${format(w.start, 'EEE, MMM d')} · ${w.source}`}</Text>
          </View>
        ))}
        {!weight && !workouts.length && (
          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
            Nothing from Apple Health in the last 7 days. To check what LiftText can read, open the Health app, tap your profile, then Apps › LiftText.
          </Text>
        )}
      </SkyCard>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    marginHorizontal: spacing.xs,
    marginTop: spacing.gap,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
  },
});
