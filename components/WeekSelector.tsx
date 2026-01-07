import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isThisWeek } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

interface Props {
  selectedWeek: Date;
  onWeekChange: (week: Date) => void;
  canGoNext?: boolean;
}

export default function WeekSelector({ selectedWeek, onWeekChange, canGoNext = true }: Props) {
  const { colors } = useTheme();
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  
  const isCurrentWeek = isThisWeek(selectedWeek);
  const today = new Date();
  
  const handlePrevious = () => {
    onWeekChange(subWeeks(selectedWeek, 1));
  };
  
  const handleNext = () => {
    if (canGoNext) {
      onWeekChange(addWeeks(selectedWeek, 1));
    }
  };
  
  const getWeekLabel = () => {
    if (isCurrentWeek) {
      return 'This Week';
    }
    
    // Check if it's same month
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`;
    } else {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
    }
  };

  // Disable next button if we're at current week or future
  const isNextDisabled = isCurrentWeek || weekStart > today;

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        size={20}
        onPress={handlePrevious}
        style={styles.navButton}
      />
      
      <View style={styles.weekInfo}>
        <Text variant="titleMedium" style={[styles.weekLabel, { color: colors.text }]}>
          {getWeekLabel()}
        </Text>
        <Text variant="bodySmall" style={[styles.weekSubtitle, { color: colors.textSecondary }]}>
          {format(weekStart, 'yyyy')}
        </Text>
      </View>
      
      <IconButton
        icon="chevron-right"
        size={20}
        onPress={handleNext}
        disabled={isNextDisabled}
        style={[styles.navButton, isNextDisabled && styles.disabledButton]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  navButton: {
    margin: 0,
  },
  disabledButton: {
    opacity: 0.3,
  },
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    fontWeight: '600',
  },
  weekSubtitle: {
    marginTop: 2,
  },
});