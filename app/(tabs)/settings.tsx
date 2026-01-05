import { View, StyleSheet, Alert } from 'react-native';
import { Text, Surface, List, Switch, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { colors, spacing } from '../../constants/theme';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings } = useWorkoutStore();
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Preferences
          </Text>
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

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
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
            titleStyle={styles.dangerText}
            left={(props) => <List.Icon {...props} icon="delete-outline" color={colors.error} />}
            onPress={handleClearData}
            disabled={isClearing}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '600',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  dangerText: {
    color: colors.error,
  },
});
