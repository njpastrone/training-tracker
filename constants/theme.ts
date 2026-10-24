import { Platform } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { type Palette as ColourPalette, type Tokens } from './palettes';

// Daylight design tokens. See DESIGN-SYSTEM.md.
// Content sits on a sky (services/sky.ts) that tracks the training week; cards are a
// translucent material over it; Liquid Glass is for controls only. The colours themselves live in
// constants/palettes.ts, one scheme at a time; this file maps a scheme onto Paper and the old names.

// ponytail: old token names for screens not yet restyled; remove once every screen uses the names above
const aliases = (c: Tokens) => ({
  ...c,
  primary: c.sunrise,
  primaryLight: c.sunriseSoft,
  secondary: c.cobalt,
  success: c.mint,
  accent: c.sunriseSoft,
  surfaceVariant: c.surface,
  borderLight: c.border,
});
export type Palette = ReturnType<typeof aliases>;
// The colours of one scheme in light or dark, with the old names
export const colorsOf = (palette: ColourPalette, dark: boolean): Palette => aliases(dark ? palette.dark : palette.light);

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
  full_body: '#7C8DB5', // slate, so done-orange stays unique
};

// Food goals get a dot each too (components/FoodGoalsCard.tsx): protein, calories, low-GI meals, fiber
export const foodGoalColors = { protein: '#F0764F', calories: '#E3B33A', lowgi: '#9B7BF0', fiber: '#2E9E7B' };

// Food categories get the same small dots as muscle groups
export const foodCategoryColors: Record<string, string> = {
  meat_fish: '#F0764F',
  eggs_dairy: '#E3B33A',
  grains: '#C99A5B',
  fruit: '#E8618C',
  vegetables: '#2E9E7B',
  legumes: '#8DB255',
  nuts_seeds: '#A9744F',
  fats_oils: '#F2A93B',
  drinks: '#3FA7D6',
  sweets_snacks: '#9B7BF0',
  other: '#8189AE',
};

// SF Pro Rounded for titles, numbers and labels; SF Pro (system) for body text
export const fonts = {
  rounded: Platform.select({ ios: 'ui-rounded', default: undefined }),
};

const rounded = (fontSize: number, lineHeight: number, fontWeight: '600' | '700' | '800' | '900') => ({
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
    displaySmall: rounded(56, 60, '900'), // the hero number (SunArc, Hero)
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

const paperColors = (c: Tokens) => ({
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

// The Paper theme for one scheme in light or dark
export const paperThemeOf = (palette: ColourPalette, dark: boolean) => ({
  ...(dark ? MD3DarkTheme : MD3LightTheme),
  roundness: 6,
  fonts: paperFonts,
  colors: { ...(dark ? MD3DarkTheme : MD3LightTheme).colors, ...paperColors(dark ? palette.dark : palette.light) },
});
export type PaperTheme = ReturnType<typeof paperThemeOf>;

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
