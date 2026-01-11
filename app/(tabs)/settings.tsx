import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Surface, List, Switch, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, darkColors } from '../../constants/theme';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings } = useWorkoutStore();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all your workout data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await clearAllData();
            setIsClearing(false);
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const toggleUnit = () => {
    updateSettings({
      weightUnit: settings.weightUnit === 'lbs' ? 'kg' : 'lbs',
    });
  };

  const toggleTheme = () => {
    // Smart toggle: if in system mode, switch to opposite of current appearance
    // Otherwise toggle between light and dark
    let newMode: 'light' | 'dark';
    
    if (themeMode === 'system') {
      // If system mode, toggle to opposite of current dark mode state
      newMode = colors === darkColors ? 'light' : 'dark';
    } else {
      // Direct toggle between light and dark
      newMode = themeMode === 'dark' ? 'light' : 'dark';
    }
    
    setThemeMode(newMode);
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Preferences
          </Text>
          <List.Item
            title="Theme"
            description="Switch between Light and Dark modes"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => {
              // Show what the button will switch TO
              let buttonText;
              if (themeMode === 'system') {
                buttonText = colors === darkColors ? 'LIGHT' : 'DARK';
              } else {
                buttonText = themeMode === 'dark' ? 'LIGHT' : 'DARK';
              }
              
              return (
                <Button mode="outlined" onPress={toggleTheme} compact>
                  {buttonText}
                </Button>
              );
            }}
          />
          <Divider />
          <List.Item
            title="Weight Unit"
            description={settings.weightUnit === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
            left={(props) => <List.Icon {...props} icon="weight" />}
            right={() => (
              <Button mode="outlined" onPress={toggleUnit} compact>
                {settings.weightUnit.toUpperCase()}
              </Button>
            )}
          />
          <Divider />
          <List.Item
            title="Streak Notifications"
            description="Get reminders to maintain your streak"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={() => (
              <Switch
                value={settings.showStreakNotifications}
                onValueChange={(value) =>
                  updateSettings({ showStreakNotifications: value })
                }
                color={colors.primary}
              />
            )}
          />
        </Surface>

        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Data
          </Text>
          <List.Item
            title="Export Data"
            description="Download your workout history as JSON"
            left={(props) => <List.Icon {...props} icon="download" />}
            onPress={() => Alert.alert('Coming Soon', 'Export functionality will be available in a future update.')}
          />
          <Divider />
          <List.Item
            title="Clear All Data"
            description="Delete all workouts and settings"
            titleStyle={{ color: colors.error }}
            left={(props) => <List.Icon {...props} icon="delete-outline" color={colors.error} />}
            onPress={handleClearData}
            disabled={isClearing}
          />
        </Surface>

        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            About
          </Text>
          <List.Item
            title="Training Tracker"
            description="Version 1.0.0"
            left={(props) => <List.Icon {...props} icon="information-outline" />}
          />
          <Divider />
          <List.Item
            title="Privacy Policy"
            description="Your data stays on your device"
            left={(props) => <List.Icon {...props} icon="shield-check-outline" />}
          />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  dangerText: {
    // Will be applied via theme colors
  },
});
