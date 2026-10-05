import 'react-native-get-random-values';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { runWeeklyBackup } from '../services/backup';

function AppContent() {
  const { theme, colors } = useTheme();

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plan" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    runWeeklyBackup().catch((error) => console.error('Weekly backup failed:', error));
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
