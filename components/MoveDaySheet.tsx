import { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useColors } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import type { EntryRef } from '../services/moveLog';
import { dayLabel } from './WorkoutCard';
import { Pill } from './Glass';

interface Props {
  entry: (EntryRef & { date: string; label: string }) | null; // open while set
  onClose: () => void;
}

// "Move to another day" for one saved workout or meal: pick a day up to today, and it moves there
// keeping the time it was logged. The screen's UndoToast confirms it with Undo.
export default function MoveDaySheet({ entry, onClose }: Props) {
  const colors = useColors();
  const moveEntry = useWorkoutStore(s => s.moveEntry);
  const [day, setDay] = useState(new Date());
  const picked = format(day, 'yyyy-MM-dd');

  return (
    <Modal visible={!!entry} animationType="slide" presentationStyle="pageSheet" onShow={() => entry && setDay(parseISO(entry.date))} onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: colors.text }}>Move to another day</Text>
          <Button onPress={onClose}>Cancel</Button>
        </View>
        {entry && <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{entry.label}</Text>}
        <DateTimePicker
          value={day}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_, d) => d && setDay(d)}
          accentColor={colors.sunrise}
        />
        <Pill
          icon="calendar"
          label={entry && picked !== entry.date ? `Move to ${dayLabel(picked)}` : 'Pick another day'}
          disabled={!entry || picked === entry.date}
          onPress={() => {
            if (entry) moveEntry(entry, picked);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
