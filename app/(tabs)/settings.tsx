import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Surface, List, Switch, Divider, Button } from 'react-native-paper';
import { SkyScreen, LargeTitle } from '../../components/Sky';
import { useState } from 'react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings, templates } = useWorkoutStore();
  const { colors } = useTheme();
  const router = useRouter();
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
    <SkyScreen>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle title="Settings" />
        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
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

        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Training
          </Text>
          <List.Item
            title="Workout Templates"
            description={`${templates.length} templates saved`}
            left={(props) => <List.Icon {...props} icon="clipboard-text-outline" />}
            onPress={() => router.push('/templates')}
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
            title="LiftText"
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
    </SkyScreen>
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
