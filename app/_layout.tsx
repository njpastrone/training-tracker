import 'react-native-get-random-values';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { useWorkoutStore } from '../stores/workoutStore';
import { BACKUP_KEYS, runWeeklyBackup } from '../services/backup';
import { isFreshInstall } from '../services/onboarding';

// The store hydrates from AsyncStorage after the first render, so the splash stays up until
// it has, and until we know whether this is a fresh install. Otherwise setup would flash.
SplashScreen.preventAutoHideAsync();

// A failed hydration never finishes, so give up waiting after a few seconds rather than hang on the splash
const hydrated = new Promise<void>(resolve => {
  if (useWorkoutStore.persist.hasHydrated()) resolve();
  else useWorkoutStore.persist.onFinishHydration(() => resolve());
  setTimeout(resolve, 3000);
});

function AppContent({ fresh }: { fresh: boolean }) {
  const { theme, colors } = useTheme();
  const onboarded = useWorkoutStore(s => !!s.settings.onboardedAt);
  // Setup is only for a fresh install, until it's finished or skipped. When the guard flips,
  // Expo Router drops the setup screen from history, so Back can't return to it.
  const needsSetup = fresh && !onboarded;

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      {/* Pushed screens get a transparent native header over the sky; iOS 26 puts its buttons on glass */}
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerTintColor: colors.sunrise,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={!needsSetup}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="plan"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
        </Stack.Protected>
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fresh, setFresh] = useState<boolean | null>(null);

  useEffect(() => {
    // Read before anything writes the store: the first write would make every install look used
    Promise.all([AsyncStorage.multiGet(BACKUP_KEYS), hydrated])
      .then(([stored]) => setFresh(isFreshInstall(stored)))
      .catch(error => {
        console.error('Could not check for a fresh install:', error);
        setFresh(false); // never risk showing setup to someone with data
      });
    runWeeklyBackup().catch((error) => console.error('Weekly backup failed:', error));
  }, []);

  useEffect(() => {
    if (fresh !== null) SplashScreen.hide();
  }, [fresh]);

  if (fresh === null) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent fresh={fresh} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
