import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Workout } from '../types/workout';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { workoutSummary } from '../services/format';
import { SkyCard } from './Sky';
import ExerciseRows from './ExerciseRows';

interface Props {
  workout: Workout;
  onPress?: () => void;
}

export function dayLabel(date: string) {
  const d = parseISO(date);
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMM d');
}

export default function WorkoutCard({ workout, onPress }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/workout/${workout.id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityHint="Opens the workout"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <SkyCard style={styles.card} pointerEvents="box-only">
        <View style={styles.header}>
          <View style={styles.title}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              {dayLabel(workout.date)}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              {workoutSummary(workout.exercises)}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />
        </View>
        <ExerciseRows exercises={workout.exercises} limit={3} />
        {workout.notes ? (
          <Text variant="bodySmall" style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
            {workout.notes}
          </Text>
        ) : null}
      </SkyCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    flex: 1,
  },
  notes: {
    marginTop: 6,
  },
});
