import { StyleSheet, Alert, ScrollView, ActionSheetIOS, Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, SkySheet, LargeTitle, SectionLabel } from '../../components/Sky';
import { Pill, Segmented } from '../../components/Glass';
import Row from '../../components/Row';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/theme';
import { DAYS_OPTIONS, GOALS } from '../../services/onboarding';
import { askAiConsent } from '../../services/aiConsent';
import { BACKUP_FOLDER, lastWeeklyBackupDate, pickBackup, restoreBackup, shareBackup } from '../../services/backup';
import { forgetFact } from '../../services/coachCards';
import { importSummary, pickExport, plural, readExport } from '../../services/importHistory';
import type { WeightUnit } from '../../types/workout';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings, templates, importWorkouts } = useWorkoutStore();
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

  // Strong or Hevy history: preview first, then add only the workouts LiftText doesn't have yet
  const handleImport = async () => {
    let text: string | null;
    let preview;
    // Read against the log as it is at each step, so a second import finds the first one's workouts
    const read = (unit: WeightUnit) => {
      const { workouts, exerciseLibrary } = useWorkoutStore.getState();
      return readExport(text!, workouts, exerciseLibrary, unit);
    };
    try {
      text = await pickExport();
      if (!text) return;
      preview = read(settings.weightUnit).preview;
    } catch (error: any) {
      Alert.alert("Couldn't import", error.message);
      return;
    }
    if (!preview.workouts) {
      Alert.alert('Nothing new to import', importSummary(preview));
      return;
    }
    const save = (unit: WeightUnit) => {
      const r = read(unit);
      importWorkouts(r.workouts, r.library);
      Alert.alert('Imported', `${plural(r.preview.workouts, 'workout')} added to History.`);
    };
    const label = (u: WeightUnit) => (u === 'kg' ? 'Import in kg' : 'Import in lb');
    const units: WeightUnit[] = settings.weightUnit === 'kg' ? ['kg', 'lbs'] : ['lbs', 'kg'];
    Alert.alert(`Import ${plural(preview.workouts, 'workout')}?`, importSummary(preview), [
      { text: 'Cancel', style: 'cancel' },
      ...(preview.needsUnit
        ? units.map((u) => ({ text: label(u), onPress: () => save(u) }))
        : [{ text: 'Import', onPress: () => save(settings.weightUnit) }]),
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      "This deletes your workouts and settings on this phone. It can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await clearAllData();
            setIsClearing(false);
            Alert.alert('All data cleared');
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
        <LargeTitle title="Settings" subtitle={lastWeekly ? `Backed up ${format(parseISO(lastWeekly), 'MMM d')}` : 'Not backed up yet'} />
        <SkySheet>

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
          <Row
            icon="logo"
            title="AI reading"
            subtitle={
              settings.aiConsent === 'granted'
                ? 'On: what you type goes to Anthropic to be read'
                : settings.aiConsent === 'declined'
                  ? 'Off: each line you type becomes an exercise'
                  : 'Asks before the first time'
            }
            onPress={askAiConsent}
          />
        </SkyCard>

        {/* What you told the coach, in your words; × forgets it. Everything else it knows is recomputed from the log. */}
        {!!settings.profile?.facts.length && (
          <>
            <SectionLabel style={styles.label}>What LiftText knows</SectionLabel>
            <SkyCard style={styles.card}>
              {settings.profile.facts.map((f, i) => (
                <Row
                  key={f.id}
                  first={i === 0}
                  icon="logo"
                  title={f.text}
                  subtitle={`"${f.quote}" · ${format(parseISO(f.saidOn), 'MMM d')}`}
                  right={
                    <Pressable onPress={() => updateSettings(forgetFact(settings, f.id))} accessibilityRole="button" accessibilityLabel={`Forget ${f.text}`} hitSlop={10}>
                      <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.textTertiary} />
                    </Pressable>
                  }
                />
              ))}
              <Text variant="bodySmall" style={[styles.note, { color: colors.textTertiary }]}>
                Only things you told the coach. The rest comes from your log each time you ask.
              </Text>
            </SkyCard>
          </>
        )}

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
            subtitle="Save workouts, food, plans, templates and schedule to a file"
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
            icon="square.and.arrow.down"
            title="Import from Strong or Hevy"
            subtitle="Add past workouts from the app's CSV export"
            onPress={handleImport}
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
          <Row icon="lock.shield" title="Privacy" subtitle="Workouts are saved only on this phone. With AI reading on, what you type goes to Anthropic through our server; a question to the coach also sends a summary of your last 4 weeks, the things you told it to remember and what the question needs, never the whole log. Our server keeps only daily request counts (per phone, using a random ID, deleted after 2 days)." />
        </SkyCard>
        </SkySheet>
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    flexGrow: 1, // so the SkySheet reaches the bottom
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
  note: {
    paddingHorizontal: spacing.gap,
    paddingVertical: spacing.sm,
  },
});
