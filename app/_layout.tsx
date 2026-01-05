import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { lightTheme } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={lightTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
