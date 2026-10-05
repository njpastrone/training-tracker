import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Exercise } from '../types/workout';
import { useColors } from '../contexts/ThemeContext';
import { muscleGroupColors, spacing } from '../constants/theme';
import { exerciseNumbers } from '../services/format';
import { shownName } from '../services/exerciseIdentity';
import { useWorkoutStore } from '../stores/workoutStore';

// Read-only exercise rows: muscle dot, name (the user's own, catalog name quiet beside it), numbers;
// notes (superset, RPE, tempo...) quiet underneath
export default function ExerciseRows({ exercises, limit }: { exercises: Exercise[]; limit?: number }) {
  const colors = useColors();
  const library = useWorkoutStore(s => s.exerciseLibrary);
  const shown = limit ? exercises.slice(0, limit) : exercises;
  return (
    <View>
      {shown.map((e, i) => {
        const { name, catalog } = shownName(e, library);
        return (
        <View key={e.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.dim }]}>
          <View style={[styles.dot, { backgroundColor: muscleGroupColors[e.muscleGroup] }]} />
          <View style={styles.text}>
            <View style={styles.line}>
              <Text variant="bodyLarge" style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {name}
                {catalog ? <Text variant="bodySmall" style={{ color: colors.textTertiary }}> · {catalog}</Text> : null}
              </Text>
              <Text variant="labelLarge" style={[styles.numbers, { color: colors.textSecondary }]}>
                {exerciseNumbers(e)}
              </Text>
            </View>
            {e.notes ? (
              <Text variant="bodySmall" style={{ color: colors.textTertiary }} numberOfLines={2}>
                {e.notes}
              </Text>
            ) : null}
          </View>
        </View>
        );
      })}
      {limit && exercises.length > limit ? (
        <Text variant="bodySmall" style={[styles.more, { color: colors.textTertiary }]}>
          and {exercises.length - limit} more
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginTop: 7,
  },
  text: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  numbers: {
    fontVariant: ['tabular-nums'],
  },
  more: {
    marginTop: 4,
    marginLeft: 17,
  },
});
