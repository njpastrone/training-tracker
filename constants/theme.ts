import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Base brand colors (consistent across themes)
export const brandColors = {
  primary: '#FF6B35', // Energetic Orange
  primaryLight: '#FF8A65',
  primaryDark: '#E55100',
  secondary: '#00E676', // Bright Green
  secondaryLight: '#69F0AE',
  accent: '#FFD600', // Electric Yellow
  error: '#FF1744',
  warning: '#FF9100',
  success: '#00E676',
};

// Dark theme colors
export const darkColors = {
  ...brandColors,
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#999999',
  border: '#333333',
  borderLight: '#444444',
  disabled: '#666666',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  gradients: {
    primary: ['#FF6B35', '#E55100'],
    secondary: ['#00E676', '#00C853'],
    accent: ['#FFD600', '#FF8F00'],
    surface: ['#1E1E1E', '#2A2A2A'],
    card: ['#1E1E1E', '#252525'],
  },
};

// Light theme colors
export const lightColors = {
  ...brandColors,
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  disabled: '#BDBDBD',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  gradients: {
    primary: ['#FF6B35', '#E55100'],
    secondary: ['#00E676', '#00C853'],
    accent: ['#FFD600', '#FF8F00'],
    surface: ['#FFFFFF', '#F8F8F8'],
    card: ['#FFFFFF', '#FDFDFD'],
  },
};

// For backward compatibility (defaults to dark)
export const colors = darkColors;

// Muscle group colors - Work well in both themes
export const muscleGroupColors: Record<string, string> = {
  chest: '#FF5722',      // Deep Orange
  back: '#2196F3',       // Blue
  shoulders: '#9C27B0',  // Purple
  biceps: '#E91E63',     // Pink
  triceps: '#FF9800',    // Orange
  forearms: '#8BC34A',   // Light Green
  core: '#FFC107',       // Amber
  quads: '#00BCD4',      // Cyan
  hamstrings: '#009688', // Teal
  glutes: '#E91E63',     // Pink
  calves: '#673AB7',     // Deep Purple
  cardio: '#4CAF50',     // Green
  full_body: '#FF6B35',  // Primary Orange
};

// Dark theme configuration
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.secondary,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    error: darkColors.error,
    outline: darkColors.border,
    onBackground: darkColors.text,
    onSurface: darkColors.text,
    onSurfaceVariant: darkColors.textSecondary,
  },
};

// Light theme configuration
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.secondary,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceVariant,
    error: lightColors.error,
    outline: lightColors.border,
    onBackground: lightColors.text,
    onSurface: lightColors.text,
    onSurfaceVariant: lightColors.textSecondary,
  },
};

// For backward compatibility
export const athleticTheme = darkTheme;

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
  xxl: 20,
  full: 9999,
};

// Enhanced shadows for dark theme
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
};
