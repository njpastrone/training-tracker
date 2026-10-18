import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, AppState, Image, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { Stack, useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../components/Sky';
import { Pill, Segmented } from '../components/Glass';
import Row from '../components/Row';
import { LIST_AT_FONT_SCALE } from '../components/GoalsCard';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { photoSpan } from '../services/progress';
import { addPhoto, byMonth, choosePhoto, deleteAllPhotos, deletePhoto, listPhotos, poseLabel, POSES, takePhoto, unlockPhotos, type Photo, type Pose } from '../services/photos';
import { spacing } from '../constants/theme';

const dateLabel = (date: string) => format(parseISO(date), 'EEE, MMM d');

// Progress photos, pushed from Progress. Face ID (or the passcode) opens it, and it locks again whenever you
// leave the screen or the app; while the app is in the background or the app switcher, a cover hides the
// photos. A timeline by month, add from the camera or the photo picker, and two photos side by side with
// what your log says happened in between. No chat bar, share or export: photos never leave the phone.
export default function PhotosScreen() {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const list = fontScale > LIST_AT_FONT_SCALE; // large text: one photo a row
  const { workouts, exerciseLibrary, settings } = useWorkoutStore();
  const [lock, setLock] = useState<'locked' | 'unlocked' | 'no-passcode'>('locked');
  const [covered, setCovered] = useState(AppState.currentState !== 'active');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pose, setPose] = useState<Pose>('front');
  const [open, setOpen] = useState<Photo[] | null>(null); // one photo, or two side by side (older first)
  const [picking, setPicking] = useState<Photo | null>(null); // comparing: the first photo, waiting for a second
  const [busy, setBusy] = useState(false);
  const asking = useRef(false);
  const away = useRef(false);

  const relock = useCallback(() => {
    setLock(l => (l === 'unlocked' ? 'locked' : l));
    setPhotos([]);
    setOpen(null);
    setPicking(null);
  }, []);

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const result = await unlockPhotos();
      if (result === 'unlocked') setPhotos(listPhotos());
      setLock(result === 'failed' ? 'locked' : result);
    } finally {
      asking.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      unlock();
      return relock;
    }, [unlock, relock])
  );

  // The Face ID sheet and permission alerts make the app inactive, so only the background locks it
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setCovered(state !== 'active');
      if (state === 'background') {
        away.current = true;
        relock();
      } else if (state === 'active' && away.current) {
        away.current = false;
        unlock();
      }
    });
    return () => sub.remove();
  }, [unlock, relock]);

  const add = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const picked = source === 'camera' ? await takePhoto() : await choosePhoto();
      if (picked === 'denied') {
        Alert.alert('Camera access is off', 'Allow LiftText to use the camera in Settings to take progress photos.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      if (!picked) return;
      await addPhoto(picked.uri, picked.date ?? format(new Date(), 'yyyy-MM-dd'), pose);
      setPhotos(listPhotos());
    } catch (error: any) {
      Alert.alert("Couldn't add the photo", error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (photo: Photo) =>
    Alert.alert('Delete this photo?', "It's deleted from this iPhone and isn't in any backup, so it can't be brought back.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePhoto(photo);
          setOpen(null);
          setPhotos(listPhotos());
        },
      },
    ]);

  const removeAll = () =>
    Alert.alert('Delete all progress photos?', "They're deleted from this iPhone and aren't in any backup, so they can't be brought back.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: () => {
          deleteAllPhotos();
          setPhotos([]);
        },
      },
    ]);

  const tap = (photo: Photo) => {
    if (picking && picking.name !== photo.name) setOpen([picking, photo].sort((a, b) => a.date.localeCompare(b.date)));
    else setOpen([photo]);
    setPicking(null);
  };

  const hold = (photo: Photo) =>
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Compare with…', 'Delete photo', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      i => {
        if (i === 0) setPicking(photo);
        if (i === 1) remove(photo);
      }
    );

  const span = useMemo(
    () => (open?.length === 2 ? photoSpan(workouts, open[0].date, open[1].date, exerciseLibrary, settings.weightUnit) : null),
    [open, workouts, exerciseLibrary, settings.weightUnit]
  );
  const months = useMemo(() => byMonth(photos), [photos]);
  const unit = settings.weightUnit;

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle
          title="Progress photos"
          subtitle={lock === 'unlocked' ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} · only on this iPhone` : 'Only on this iPhone'}
        />

        {lock !== 'unlocked' ? (
          <SkyCard style={styles.center}>
            <SymbolView name="lock.fill" size={30} tintColor={colors.sunrise} />
            <Text variant="titleMedium" style={[styles.centerText, { color: colors.text }]}>
              {lock === 'no-passcode' ? 'Set a passcode to use photos' : 'Your photos are locked'}
            </Text>
            <Text variant="bodyMedium" style={[styles.centerText, { color: colors.textSecondary }]}>
              {lock === 'no-passcode'
                ? 'Progress photos stay locked until this iPhone has a passcode. Set one in Settings › Face ID & Passcode.'
                : 'Unlock with Face ID or your passcode. They lock again when you leave.'}
            </Text>
            {lock === 'locked' && (
              <View style={styles.actions}>
                <Pill icon="faceid" label="Unlock" onPress={unlock} />
              </View>
            )}
          </SkyCard>
        ) : open ? (
          <>
            <View style={[styles.pair, (open.length === 1 || list) && styles.stack]}>
              {open.map(p => (
                <View key={p.name} style={open.length === 2 && !list ? styles.fill : undefined}>
                  <Image source={{ uri: p.uri }} style={[styles.image, { backgroundColor: colors.dim }]} accessibilityLabel={`${poseLabel(p.pose)} photo, ${dateLabel(p.date)}`} />
                  <Text variant="titleMedium" style={[styles.caption, { color: colors.text }]}>{format(parseISO(p.date), 'MMM d, yyyy')}</Text>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{poseLabel(p.pose)}</Text>
                </View>
              ))}
            </View>
            {span && (
              <SkyCard>
                <SectionLabel>In between, from your log</SectionLabel>
                <Text variant="bodyLarge" style={[styles.line, { color: colors.text }]}>
                  {span.days ? `${span.days} training ${span.days === 1 ? 'day' : 'days'}, about ${span.perWeek} a week` : 'No workouts logged in between'}
                </Text>
                {span.lifts.map(l => (
                  <Text key={l.name} variant="bodyLarge" style={[styles.line, { color: colors.text }]}>
                    {`${l.name}: ${l.from} → ${l.to} ${unit}`}
                  </Text>
                ))}
              </SkyCard>
            )}
            <View style={styles.actions}>
              {open.length === 1 && (
                <>
                  <Pill
                    variant="glass"
                    icon="square.split.2x1"
                    label="Compare with…"
                    onPress={() => {
                      setPicking(open[0]);
                      setOpen(null);
                    }}
                  />
                  <Pill variant="glass" icon="trash" label="Delete photo" onPress={() => remove(open[0])} />
                </>
              )}
              <Pill variant="glass" label="All photos" onPress={() => setOpen(null)} />
            </View>
          </>
        ) : (
          <>
            <SkyCard>
              <SectionLabel>Add a photo</SectionLabel>
              <View style={styles.pose}>
                <Segmented value={pose} options={POSES} onChange={setPose} />
              </View>
              <View style={styles.actions}>
                <Pill icon="camera" label="Take photo" onPress={() => add('camera')} loading={busy} />
                <Pill variant="glass" icon="photo.on.rectangle" label="Choose from Photos" onPress={() => add('library')} disabled={busy} />
              </View>
              <Text variant="bodySmall" style={[styles.line, { color: colors.textTertiary }]}>
                Photos you take never go to your camera roll. A photo you choose is copied in, and the original stays in Photos.
              </Text>
            </SkyCard>

            {picking && (
              <SkyCard>
                <Text variant="bodyLarge" style={{ color: colors.text }}>
                  Pick a photo to compare with {dateLabel(picking.date)} · {poseLabel(picking.pose)}
                </Text>
                <View style={styles.actions}>
                  <Pill variant="glass" size="small" label="Cancel" onPress={() => setPicking(null)} />
                </View>
              </SkyCard>
            )}

            {photos.length === 0 && (
              <SkyCard style={styles.center}>
                <SymbolView name="camera" size={30} tintColor={colors.sunrise} />
                <Text variant="titleMedium" style={[styles.centerText, { color: colors.text }]}>Your progress photos show up here</Text>
                <Text variant="bodyMedium" style={[styles.centerText, { color: colors.textSecondary }]}>
                  Take one from the front, side and back, then compare them over the months.
                </Text>
              </SkyCard>
            )}

            {months.map(m => (
              <View key={m.month}>
                <SectionLabel style={styles.label}>{m.month}</SectionLabel>
                <SkyCard>
                  <View style={styles.grid}>
                    {m.photos.map(p => (
                      <Pressable
                        key={p.name}
                        onPress={() => tap(p)}
                        onLongPress={() => hold(p)}
                        accessibilityRole="button"
                        accessibilityLabel={`${poseLabel(p.pose)}, ${dateLabel(p.date)}`}
                        accessibilityHint={picking ? 'Compares it side by side' : 'Opens the photo'}
                        style={({ pressed }) => [{ width: list ? '100%' : '48%' }, pressed && styles.pressed]} // two a row so labels fit; one at large text
                      >
                        <Image source={{ uri: p.uri }} style={[styles.image, { backgroundColor: colors.dim }]} />
                        <Text variant="labelLarge" style={[styles.caption, { color: colors.text }]}>{dateLabel(p.date)}</Text>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{poseLabel(p.pose)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </SkyCard>
              </View>
            ))}

            <SkyCard style={styles.footer}>
              {photos.length > 0 && <Row first icon="trash" title="Delete all progress photos" destructive onPress={removeAll} />}
              <Text variant="bodySmall" style={[styles.note, { color: colors.textTertiary }]}>
                Only on this iPhone. They aren't in iCloud or LiftText backups, so they're gone if this iPhone is lost, replaced or erased. Deleting LiftText deletes them.
              </Text>
            </SkyCard>
          </>
        )}
      </ScrollView>
      {covered && (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: colors.background }]}>
          <SymbolView name="lock.fill" size={34} tintColor={colors.textTertiary} />
        </View>
      )}
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.gap,
  },
  pose: {
    marginTop: spacing.sm,
  },
  line: {
    marginTop: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
  },
  caption: {
    marginTop: spacing.sm,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.gap,
  },
  stack: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  footer: {
    paddingVertical: spacing.xs,
  },
  note: {
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
