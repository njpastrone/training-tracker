import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// App color palette
export const colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#10B981', // Emerald (for success/streaks)
  secondaryLight: '#34D399',
  accent: '#F59E0B', // Amber (for highlights)
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  disabled: '#9CA3AF',
};

// Muscle group colors for visual distinction
export const muscleGroupColors: Record<string, string> = {
  chest: '#EF4444',      // Red
  back: '#3B82F6',       // Blue
  shoulders: '#8B5CF6',  // Purple
  biceps: '#EC4899',     // Pink
  triceps: '#F97316',    // Orange
  forearms: '#84CC16',   // Lime
  core: '#FBBF24',       // Yellow
  quads: '#06B6D4',      // Cyan
  hamstrings: '#14B8A6', // Teal
  glutes: '#F472B6',     // Pink
  calves: '#A855F7',     // Violet
  cardio: '#22C55E',     // Green
  full_body: '#6366F1',  // Indigo
};

// Light theme configuration
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

// Dark theme configuration
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
  },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
