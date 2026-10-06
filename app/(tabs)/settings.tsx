import { StyleSheet, Alert, ScrollView, ActionSheetIOS, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill, Segmented } from '../../components/Glass';
import Row from '../../components/Row';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';
import { DAYS_OPTIONS, GOALS } from '../../services/onboarding';
import { BACKUP_FOLDER, lastWeeklyBackupDate, pickBackup, restoreBackup, shareBackup } from '../../services/backup';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings, templates } = useWorkoutStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastWeekly] = useState(lastWeeklyBackupDate);

  const handleExport = () => {
    shareBackup().catch((error) => Alert.alert("Couldn't export", error.message));
  };

  const handleRestore = async () => {
    let picked;
    try {
      picked = await pickBackup();
    } catch (error: any) {
      Alert.alert("Couldn't restore", error.message);
      return;
    }
    if (!picked) return;
    const { backup, summary } = picked;
    Alert.alert(
      `Restore ${summary.workouts} workouts from ${format(parseISO(summary.createdAt), 'MMM d, yyyy')}?`,
      `This replaces all workouts, plans, templates and your schedule on this phone. Your current data is saved first in ${BACKUP_FOLDER}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const safety = await restoreBackup(backup);
              Alert.alert('Restored', `Your previous data was saved as ${safety.name} in ${BACKUP_FOLDER}.`);
            } catch (error: any) {
              Alert.alert("Couldn't restore", error.message);
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

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

  const pickGoal = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Training for', options: [...GOALS.map(g => g.label), 'Cancel'], cancelButtonIndex: GOALS.length },
      i => i < GOALS.length && updateSettings({ goal: GOALS[i].value })
    );

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
            icon="calendar"
            title="Days a week"
            subtitle={settings.weeklyTarget ? 'Full daylight at this many' : 'From your usual week'}
          />
          {/* Full width under its row: beside the title it ran off a 375pt screen */}
          <View style={styles.below}>
            <Segmented
              value={String(settings.weeklyTarget ?? '')}
              options={[...DAYS_OPTIONS]}
              onChange={value => updateSettings({ weeklyTarget: Number(value) })}
            />
          </View>
          <Row
            icon="target"
            title="Training for"
            subtitle={GOALS.find(g => g.value === settings.goal)?.label ?? 'Not set'}
            onPress={pickGoal}
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

        <SectionLabel style={styles.label}>Backup</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
            icon="square.and.arrow.up"
            title="Export backup"
            subtitle="Save workouts, plans, templates and schedule to a file"
            onPress={handleExport}
          />
          <Row
            icon="arrow.counterclockwise"
            title="Restore from backup"
            subtitle="Replace this phone's data with a backup file"
            onPress={handleRestore}
            disabled={isRestoring}
          />
          <Row
            icon="clock.arrow.circlepath"
            title="Weekly backup"
            subtitle={`${lastWeekly ? `Last saved ${format(parseISO(lastWeekly), 'MMM d')}` : 'Saves once a week'} to ${BACKUP_FOLDER}`}
          />
        </SkyCard>

        <SectionLabel style={styles.label}>Data</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
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
  below: {
    paddingBottom: spacing.sm,
  },
});
