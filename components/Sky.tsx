import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { SKY } from '../services/sky';
import { spacing } from '../constants/theme';

// A screen on the sky. Light mode tracks the training week (services/sky.ts); Dark Mode is night.
// Native tabs inset the scroll view for the tab bar, so only the top edge is padded by default.
export function SkyScreen({ children, edges = ['top'] }: { children: React.ReactNode; edges?: Edge[] }) {
  const { isDarkMode, sky } = useTheme();
  const stops = isDarkMode ? SKY.night : sky.stops;
  return (
    <View style={[styles.fill, { backgroundColor: stops[2] }]}>
      <LinearGradient colors={stops} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {isDarkMode && (
        <LinearGradient
          colors={['rgba(42,39,102,0.9)', 'rgba(42,39,102,0)']}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.35, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <SafeAreaView edges={edges} style={styles.fill}>
        {children}
      </SafeAreaView>
    </View>
  );
}

// The large rounded title at the top of a screen, with an optional subtitle
export function LargeTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.titleBlock} accessibilityRole="header">
      <Text variant="headlineLarge" style={{ color: colors.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '500' }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  titleBlock: {
    marginTop: spacing.gap,
    marginBottom: spacing.md,
  },
});
