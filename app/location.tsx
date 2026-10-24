import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Places from '../modules/places';
import { LargeTitle, SectionAction, SectionLabel, SkyCard, SkyScreen, SkySheet } from '../components/Sky';
import { Pill } from '../components/Glass';
import FindNearbyButton from '../components/FindNearbyButton';
import LogoMark from '../components/LogoMark';
import Row from '../components/Row';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { usePlacesStore, type SavedPlace } from '../stores/placesStore';

// Where to look (data/lt-ui-g, g-location): the three ways to say where you are, any or all, each with
// its own privacy line. All three stay on this iPhone (stores/placesStore.ts, out of every backup); only
// the names of the places Apple Maps finds go to our server. Reached from Settings and from the first
// Find nearby tap; Done leads straight to the finder.
export default function LocationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { live, saved, area, setLive, savePlace, removePlace, setArea } = usePlacesStore();
  const [areaText, setAreaText] = useState(area?.text ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const native = !!Places;

  const allow = async () => {
    if (!Places) return Alert.alert('Needs the full app', 'Live location works in the TestFlight or App Store build, not in Expo Go.');
    setBusy('live');
    const point = await Places.currentLocation().catch(() => null);
    setBusy(null);
    if (point) return setLive(true);
    setLive(false);
    if (Places.locationPermission() === 'denied') Alert.alert('Location is off for LiftText', 'Turn it on in Settings › Privacy & Security › Location Services › LiftText. Approximate is enough.');
  };

  // The address typed once, turned into a point on this phone; the address never leaves it
  const addPlace = (label: SavedPlace['label']) => {
    if (!Places) return Alert.alert('Needs the full app', 'Saved places work in the TestFlight or App Store build, not in Expo Go.');
    const current = saved.find(p => p.label === label);
    const geocode = Places.geocode;
    Alert.prompt(`${label} address`, 'Kept on this iPhone only. Searches run around it; the address itself never leaves the phone.', async text => {
      const address = text?.trim();
      if (!address) return;
      setBusy(label);
      const point = await geocode(address).catch(() => null);
      setBusy(null);
      if (!point) return Alert.alert("Couldn't place that address", 'Try the street and city, or a cross street.');
      savePlace({ label, address, lat: point.lat, lon: point.lon });
    }, 'plain-text', current?.address);
  };

  // A neighbourhood or town: placed on the phone when the geocoder knows it; the words alone still work
  const saveArea = async () => {
    const text = areaText.trim().slice(0, 80);
    if (!text) return setArea(undefined);
    if (text === area?.text) return;
    setBusy('area');
    const point = Places ? await Places.geocode(text).catch(() => null) : null;
    setBusy(null);
    setArea(point ? { text, lat: point.lat, lon: point.lon } : { text });
  };

  const done = async () => {
    await saveArea();
    router.navigate({ pathname: '/(tabs)/chat', params: { find: '1' } });
  };

  return (
    <SkyScreen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LargeTitle title="Where to look" subtitle="Pick any, or all three" />
        <SkySheet>
          <SkyCard style={styles.card}>
            <Row
              first
              icon="location"
              title="Where I am right now"
              subtitle="Approximate location, only while you look, never in the background. It stays on this iPhone."
              right={live ? <Switch value onValueChange={() => setLive(false)} trackColor={{ true: colors.sunrise }} accessibilityLabel="Where I am right now" /> : <Pill variant="glass" size="small" label="Allow" onPress={allow} loading={busy === 'live'} />}
            />
          </SkyCard>

          <View style={styles.labelRow}>
            <SectionLabel style={styles.label}>Saved places</SectionLabel>
            {saved.length < 2 && <SectionAction label="Add" accessibilityLabel="Add a saved place" onPress={() => addPlace(saved.some(p => p.label === 'Home') ? 'Work' : 'Home')} />}
          </View>
          <SkyCard style={styles.card}>
            {(['Home', 'Work'] as const).map((label, i) => {
              const place = saved.find(p => p.label === label);
              return (
                <Row
                  key={label}
                  first={i === 0}
                  icon={label === 'Home' ? 'house' : 'briefcase'}
                  title={label}
                  subtitle={place?.address ?? 'Add an address'}
                  onPress={() => addPlace(label)}
                  disabled={busy === label}
                  right={
                    place ? (
                      <Pressable onPress={() => removePlace(label)} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={10}>
                        <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.textTertiary} />
                      </Pressable>
                    ) : undefined
                  }
                />
              );
            })}
            <Text variant="bodySmall" style={[styles.note, { color: colors.textSecondary }]}>
              An address you type is kept on this iPhone only. Searches run around it; the address itself never leaves the phone.
            </Text>
          </SkyCard>

          <SectionLabel style={styles.label}>A general area</SectionLabel>
          <SkyCard style={styles.card}>
            <TextInput
              value={areaText}
              onChangeText={setAreaText}
              onBlur={saveArea}
              onSubmitEditing={saveArea}
              placeholder="East Village, NYC"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              autoCapitalize="words"
              style={[styles.input, { backgroundColor: colors.dim, color: colors.text }]}
              accessibilityLabel="A general area"
            />
            <Text variant="bodySmall" style={[styles.note, { color: colors.textSecondary }]}>
              A neighborhood or a town is enough. LiftText never asks for anything more precise than what you type here.
            </Text>
          </SkyCard>

          <View style={styles.coach}>
            <LogoMark size={18} color={colors.sunrise} />
            <Text variant="bodyLarge" style={[styles.fill, { color: colors.text }]}>
              Whichever you pick, Apple Maps on your iPhone finds the places. Only their names go to our server and the AI, so it can say what to order. Nothing here goes into your log, your backups or our server.
            </Text>
          </View>
          {!native && (
            <Text variant="bodySmall" style={[styles.note, { color: colors.textTertiary }]}>
              In Expo Go only the typed area works, with no place list: the AI names places it knows there.
            </Text>
          )}

          <View style={styles.done}>
            <FindNearbyButton label="Done" onPress={done} />
          </View>
          <Text variant="bodySmall" style={[styles.center, { color: colors.textSecondary }]}>
            Change or remove any of these in Settings › Where to look.
          </Text>
        </SkySheet>
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen, flexGrow: 1 },
  fill: { flex: 1 },
  label: { marginLeft: spacing.xs, marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: spacing.xs },
  card: { paddingVertical: spacing.xs, marginBottom: spacing.lg },
  note: { paddingHorizontal: spacing.gap, paddingVertical: spacing.sm },
  input: { borderRadius: 14, paddingHorizontal: 16, minHeight: 50, fontSize: 17, marginHorizontal: spacing.gap, marginTop: spacing.sm },
  coach: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  done: { marginBottom: spacing.sm },
  center: { textAlign: 'center', marginBottom: spacing.lg },
});
