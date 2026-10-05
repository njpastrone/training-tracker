import { StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill } from '../../components/Glass';
import Row from '../../components/Row';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LargeTitle title="Settings" />

        <SectionLabel style={styles.label}>Preferences</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
            icon="scalemass"
            title="Weight unit"
            subtitle={settings.weightUnit === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
            right={<Pill variant="glass" size="small" label={settings.weightUnit} onPress={toggleUnit} />}
          />
          <Row
            icon="bell"
            title="Streak notifications"
            subtitle="Get reminders to maintain your streak"
            right={
              <Switch
                value={settings.showStreakNotifications}
                onValueChange={(value) => updateSettings({ showStreakNotifications: value })}
                trackColor={{ true: colors.sunrise }}
              />
            }
          />
        </SkyCard>

        <SectionLabel style={styles.label}>Training</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
            icon="list.bullet.rectangle"
            title="Workout templates"
            subtitle={`${templates.length} templates saved`}
            onPress={() => router.push('/templates')}
          />
        </SkyCard>

        <SectionLabel style={styles.label}>Data</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
            icon="square.and.arrow.up"
            title="Export data"
            subtitle="Download your workout history as JSON"
            onPress={() => Alert.alert('Coming Soon', 'Export functionality will be available in a future update.')}
          />
          <Row
            icon="trash"
            title="Clear all data"
            subtitle="Delete all workouts and settings"
            destructive
            onPress={handleClearData}
            disabled={isClearing}
          />
        </SkyCard>

        <SectionLabel style={styles.label}>About</SectionLabel>
        <SkyCard style={styles.card}>
          <Row first icon="info.circle" title="LiftText" subtitle="Version 1.0.0" />
          <Row icon="lock.shield" title="Privacy" subtitle="Your data stays on your device" />
        </SkyCard>
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
  },
  label: {
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
});
