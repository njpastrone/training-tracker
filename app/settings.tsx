import { StyleSheet, Alert, ScrollView, ActionSheetIOS, Linking, Pressable, Switch, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Text } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, SkySheet, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import { PALETTES, PALETTE_IDS, paletteOf } from '../constants/palettes';
import Row from '../components/Row';
import { useWorkoutStore } from '../stores/workoutStore';
import { useChatStore } from '../stores/chatStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { DAYS_OPTIONS, GOALS } from '../services/onboarding';
import { askAiConsent, currentAiConsent, legalUrl } from '../services/aiConsent';
import { BACKUP_FOLDER, lastWeeklyBackupDate, pickBackup, restoreBackup, shareBackup } from '../services/backup';
import { forgetFact } from '../services/coachCards';
import { importSummary, pickExport, plural, readExport } from '../services/importHistory';
import { healthAvailable, requestHealthAccess } from '../services/health';
import { prefsSummary } from '../services/foodPrefs';
import { usePlacesStore, whereChoices } from '../stores/placesStore';
import type { WeightUnit } from '../types/workout';

export default function SettingsScreen() {
  const { clearAllData, settings, updateSettings, templates, importWorkouts } = useWorkoutStore();
  const aiConsent = currentAiConsent(settings);
  const { colors } = useTheme();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastWeekly] = useState(lastWeeklyBackupDate);
  const where = usePlacesStore();
  const whereLabels = whereChoices(where).map(c => (c.key === 'live' ? 'live location while you look' : c.label));

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
      Alert.alert('Imported', `${plural(r.preview.workouts, 'workout')} added to the calendar.`);
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
      "This deletes your workouts and settings on this phone. It can't be undone. Progress photos stay; delete them on the Photos screen.",
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

  const handleClearChat = () =>
    Alert.alert('Clear chat?', "This empties the Chat thread on this phone. Your workouts and food stay. It can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => useChatStore.getState().clear() },
    ]);

  const toggleUnit = () => {
    updateSettings({
      weightUnit: settings.weightUnit === 'lbs' ? 'kg' : 'lbs',
    });
  };

  // Apple Health: reading shows on the Health screen only; saving copies each workout you log from now on
  const health = settings.appleHealth ?? {};
  const toggleHealthRead = async (on: boolean) => {
    if (on) await requestHealthAccess(false).catch(error => console.error('Apple Health access failed:', error));
    updateSettings({ appleHealth: { ...health, connected: on } });
  };
  const toggleHealthSave = (on: boolean) => {
    if (!on) return updateSettings({ appleHealth: { ...health, saveSince: undefined } });
    Alert.alert(
      'Save workouts to Apple Health?',
      "Each workout you log from now on is saved as Traditional Strength Training (Mixed Cardio when it's all cardio), and changed or deleted there when you change or delete it here. A workout without logged minutes is saved with no length, at the time you logged it. Past workouts aren't copied.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn on',
          onPress: async () => {
            const allowed = await requestHealthAccess(true).catch(() => false);
            if (allowed) updateSettings({ appleHealth: { ...useWorkoutStore.getState().settings.appleHealth, saveSince: new Date().toISOString() } });
            else Alert.alert('Saving is off in Apple Health', 'To turn it on, open the Health app, tap your profile, then Apps › LiftText, and allow Workouts.');
          },
        },
      ]
    );
  };

  const pickGoal = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Training for', options: [...GOALS.map(g => g.label), 'Cancel'], cancelButtonIndex: GOALS.length },
      i => i < GOALS.length && updateSettings({ goal: GOALS[i].value })
    );

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Row icon="paintpalette" title="App colours" subtitle={paletteOf(settings.palette).name} />
          <View style={styles.below}>
            <Segmented
              value={paletteOf(settings.palette).id}
              options={PALETTE_IDS.map(id => ({ value: id, label: PALETTES[id].name }))}
              onChange={palette => updateSettings({ palette })}
            />
          </View>
          <Row
            icon="target"
            title="Training for"
            subtitle={GOALS.find(g => g.value === settings.goal)?.label ?? 'Not set'}
            onPress={pickGoal}
          />
          <Row
            icon="fork.knife"
            title="Food preferences"
            subtitle={settings.foodPrefs ? prefsSummary(settings.foodPrefs) : 'High protein, low spike, no seed oils, a budget'}
            onPress={() => router.push('/food-prefs')}
          />
          <Row
            icon="mappin.and.ellipse"
            title="Where to look"
            subtitle={whereLabels.length ? `${whereLabels.join(' · ')}. All kept on this iPhone.` : 'For food nearby: live location, Home, Work or an area. All kept on this iPhone.'}
            onPress={() => router.push('/location')}
          />
          <Row
            icon="logo"
            title="AI reading"
            subtitle={
              aiConsent === 'granted'
                ? 'On: what you type goes to Anthropic to be read'
                : aiConsent === 'declined'
                  ? 'Off: each line you type becomes an exercise'
                  : aiConsent === 'under18'
                    ? 'Off: AI is for 18 and older'
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
          <Row
            icon="dumbbell"
            title="Exercises"
            subtitle="Rename, merge or split what you've logged"
            onPress={() => router.push('/exercises')}
          />
        </SkyCard>

        {healthAvailable() && (
          <>
            <SectionLabel style={styles.label}>Apple Health</SectionLabel>
            <SkyCard style={styles.card}>
              <Row
                first
                icon="heart.text.square"
                title="Show in LiftText"
                subtitle="Workouts from other apps and your body weight. They stay on this iPhone and are never sent to our server or the AI."
                right={<Switch value={!!health.connected} onValueChange={toggleHealthRead} trackColor={{ true: colors.sunrise }} accessibilityLabel="Show Apple Health in LiftText" />}
              />
              <Row
                icon="square.and.arrow.down.on.square"
                title="Save workouts to Apple Health"
                subtitle={health.saveSince ? `Each workout logged since ${format(parseISO(health.saveSince), 'MMM d')}` : 'Off'}
                right={<Switch value={!!health.saveSince} onValueChange={toggleHealthSave} trackColor={{ true: colors.sunrise }} accessibilityLabel="Save workouts to Apple Health" />}
              />
            </SkyCard>
          </>
        )}

        <SectionLabel style={styles.label}>Backup</SectionLabel>
        <SkyCard style={styles.card}>
          <Row
            first
            icon="square.and.arrow.up"
            title="Export backup"
            subtitle="Save workouts, food, plans, templates, schedule and chat to a file"
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
            icon="photo.on.rectangle"
            title="Progress photos"
            subtitle="Only on this iPhone and in no backup. Delete one or all on the Photos screen, behind Face ID."
            onPress={() => router.push('/photos')}
          />
          <Row
            icon="bubble.left.and.bubble.right"
            title="Clear chat"
            subtitle="Empty the Chat thread; workouts and food stay"
            destructive
            onPress={handleClearChat}
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
          <Row first icon="info.circle" title="LiftText" subtitle={`Version ${Constants.expoConfig?.version}`} />
          <Row icon="lock.shield" title="Privacy policy" subtitle="Workouts, chat history and progress photos are saved only on this phone, and nothing from Apple Health is ever sent. With AI reading on, what you type goes to Anthropic through our server; a question to the coach also sends a summary of your last 4 weeks, the things you told it to remember, your food preferences and what the question needs, never the whole log. Finding food nearby uses Apple Maps on this iPhone; your location never leaves it, only the names of nearby places, your food preferences, what you logged eating today and, when no places were found, the area words you typed are sent. Our server never stores what you type." onPress={() => Linking.openURL(legalUrl('privacy'))} />
          <Row icon="doc.text" title="Terms of use" subtitle="Not medical advice; AI can be wrong, so review before saving. Protein, prices, spike and seed oils are estimates." onPress={() => Linking.openURL(legalUrl('terms'))} />
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
