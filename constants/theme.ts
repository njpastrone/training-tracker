import { Platform } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// Daylight design tokens. See DESIGN-SYSTEM.md.
// Content sits on a sky (services/sky.ts) that tracks the training week; cards are a
// translucent material over it; Liquid Glass is for controls only.

// Light: text levels, card material, sunrise accent, cobalt for planned, mint for success
export const lightColors = {
  text: '#0E1430',
  textSecondary: '#4A5374',
  textTertiary: '#6E7798',
  card: 'rgba(255,255,255,0.62)',
  cardLine: 'rgba(255,255,255,0.8)',
  glass: 'rgba(255,255,255,0.5)',
  glassLine: 'rgba(255,255,255,0.85)',
  dim: 'rgba(14,20,48,0.06)',
  sunrise: '#D2441C',
  sunriseSoft: '#FF7A4F',
  onSunrise: '#FFFFFF',
  cobalt: '#3560F0',
  mint: '#13865A',
  error: '#D70015',
  warning: '#B25E00',
  // Solid surfaces: Reduce Transparency, sheets, and screens not yet on the sky
  background: '#E4EEFF',
  surface: '#F7F9FF',
  border: '#D5DCEF',
  disabled: '#A3AAC4',
  overlay: 'rgba(14,20,48,0.4)',
};

// Dark: always night
export const darkColors: typeof lightColors = {
  text: '#F3F5FF',
  textSecondary: '#B0B7D6',
  textTertiary: '#8189AE',
  card: 'rgba(255,255,255,0.075)',
  cardLine: 'rgba(255,255,255,0.13)',
  glass: 'rgba(255,255,255,0.10)',
  glassLine: 'rgba(255,255,255,0.18)',
  dim: 'rgba(255,255,255,0.06)',
  sunrise: '#FF7F57',
  sunriseSoft: '#FF9D7A',
  onSunrise: '#2A1208',
  cobalt: '#8EA6FF',
  mint: '#52D9A0',
  error: '#FF6961',
  warning: '#FFB340',
  background: '#141938',
  surface: '#1C2142',
  border: '#2E3460',
  disabled: '#5A6189',
  overlay: 'rgba(0,0,0,0.6)',
};

// ponytail: old token names for screens not yet restyled; remove once every screen uses the names above
const aliases = (c: typeof lightColors) => ({
  ...c,
  primary: c.sunrise,
  primaryLight: c.sunriseSoft,
  secondary: c.cobalt,
  success: c.mint,
  accent: c.sunriseSoft,
  surfaceVariant: c.surface,
  borderLight: c.border,
});
export const lightPalette = aliases(lightColors);
export const darkPalette = aliases(darkColors);
export type Palette = typeof lightPalette;

// Muscle groups: soft dots, not a rainbow of chips
export const muscleGroupColors: Record<string, string> = {
  chest: '#F0764F',
  back: '#4B8DF8',
  shoulders: '#9B7BF0',
  biceps: '#E8618C',
  triceps: '#F2A93B',
  forearms: '#8DB255',
  core: '#E3B33A',
  quads: '#34B8A8',
  hamstrings: '#2E9E7B',
  glutes: '#EE6F9F',
  calves: '#7A6FE0',
  cardio: '#3FA7D6',
  full_body: '#D2441C',
};

// SF Pro Rounded for titles, numbers and labels; SF Pro (system) for body text
export const fonts = {
  rounded: Platform.select({ ios: 'ui-rounded', default: undefined }),
};

const rounded = (fontSize: number, lineHeight: number, fontWeight: '600' | '700' | '800') => ({
  fontFamily: fonts.rounded ?? MD3LightTheme.fonts.titleLarge.fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing: 0,
});
const system = (fontSize: number, lineHeight: number) => ({
  ...MD3LightTheme.fonts.bodyLarge,
  fontSize,
  lineHeight,
  letterSpacing: 0,
});

// Mapped onto the iOS text styles
const paperFonts = configureFonts({
  config: {
    displayLarge: rounded(40, 46, '800'),
    displayMedium: rounded(36, 42, '800'),
    displaySmall: rounded(34, 41, '800'),
    headlineLarge: rounded(34, 41, '800'), // Large Title
    headlineMedium: rounded(28, 34, '800'), // Title 1
    headlineSmall: rounded(22, 28, '700'), // Title 2
    titleLarge: rounded(20, 25, '700'), // Title 3
    titleMedium: rounded(17, 22, '700'), // Headline
    titleSmall: rounded(15, 20, '700'),
    labelLarge: rounded(17, 22, '700'), // buttons
    labelMedium: rounded(13, 18, '700'),
    labelSmall: rounded(12, 16, '600'),
    bodyLarge: system(17, 22), // Body
    bodyMedium: system(15, 20), // Subheadline
    bodySmall: system(13, 18), // Footnote
  },
});

const paperColors = (c: typeof lightColors) => ({
  primary: c.sunrise,
  onPrimary: c.onSunrise,
  primaryContainer: c.dim,
  onPrimaryContainer: c.text,
  secondary: c.cobalt,
  secondaryContainer: c.dim,
  onSecondaryContainer: c.text,
  background: c.background,
  onBackground: c.text,
  surface: c.surface,
  onSurface: c.text,
  surfaceVariant: c.surface,
  onSurfaceVariant: c.textSecondary,
  outline: c.border,
  outlineVariant: c.border,
  error: c.error,
  surfaceDisabled: c.dim,
  onSurfaceDisabled: c.disabled,
  backdrop: c.overlay,
});

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 6,
  fonts: paperFonts,
  colors: { ...MD3LightTheme.colors, ...paperColors(lightColors) },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 6,
  fonts: paperFonts,
  colors: { ...MD3DarkTheme.colors, ...paperColors(darkColors) },
};

// 8 pt grid; 20 pt screen margins, 12 pt between cards
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screen: 20,
  gap: 12,
};

export const radius = {
  card: 26, // concentric with the screen corners
  tile: 20,
  bubble: 22,
  control: 26, // 50-52 pt pills
  full: 9999,
};

// One soft shadow for floating glass; cards rely on the material, not shadows
export const shadows = {
  float: {
    shadowColor: '#283270',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
};
