import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
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
      <Pressable
        onPress={handlePrevious}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        style={[styles.navButton, { backgroundColor: colors.glass, borderColor: colors.glassLine }]}
      >
        <SymbolView name="chevron.left" size={14} weight="semibold" tintColor={colors.textSecondary} />
      </Pressable>
      
      <View style={styles.weekInfo}>
        <Text variant="titleMedium" style={{ color: colors.text }}>
          {getWeekLabel()}
        </Text>
        <Text variant="labelMedium" style={[styles.weekSubtitle, { color: colors.textTertiary }]}>
          {format(weekStart, 'yyyy')}
        </Text>
      </View>
      
      <Pressable
        onPress={handleNext}
        disabled={isNextDisabled}
        accessibilityRole="button"
        accessibilityLabel="Next week"
        accessibilityState={{ disabled: isNextDisabled }}
        style={[styles.navButton, { backgroundColor: colors.glass, borderColor: colors.glassLine }, isNextDisabled && styles.disabledButton]}
      >
        <SymbolView name="chevron.right" size={14} weight="semibold" tintColor={colors.textSecondary} />
      </Pressable>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  weekSubtitle: {
    marginTop: 2,
  },
});