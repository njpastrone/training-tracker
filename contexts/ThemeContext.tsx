import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, useColorScheme } from 'react-native';
import { format } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { colorsOf, paperThemeOf, Palette, PaperTheme } from '../constants/theme';
import { paletteOf, type Palette as ColourPalette } from '../constants/palettes';
import { weekSky, WeekSky } from '../services/sky';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: Palette;
  theme: PaperTheme;
  sky: WeekSky;
  palette: ColourPalette; // the colour scheme from Settings › App colours
  reduceTransparency: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const today = () => format(new Date(), 'yyyy-MM-dd');

// Appearance follows the iPhone (HIG: no app-specific appearance setting); the colour scheme is the user's pick
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useColorScheme() === 'dark';
  const workouts = useWorkoutStore(s => s.workouts);
  const schedule = useWorkoutStore(s => s.schedule);
  const weeklyTarget = useWorkoutStore(s => s.settings.weeklyTarget);
  const startedAt = useWorkoutStore(s => s.settings.onboardedAt);
  const palette = paletteOf(useWorkoutStore(s => s.settings.palette));
  const [day, setDay] = useState(today);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  // The sky is static per visit: recomputed on data changes and when the app returns on a new day
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => state === 'active' && setDay(today()));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => sub.remove();
  }, []);

  const sky = useMemo(
    () => weekSky(workouts, schedule, new Date(), { weeklyTarget, startedAt }, palette.sky),
    [workouts, schedule, weeklyTarget, startedAt, day, palette]
  );
  const colors = useMemo(() => colorsOf(palette, isDarkMode), [palette, isDarkMode]);
  const theme = useMemo(() => paperThemeOf(palette, isDarkMode), [palette, isDarkMode]);

  const value: ThemeContextType = {
    isDarkMode,
    colors,
    theme,
    sky,
    palette,
    reduceTransparency,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for getting theme-aware colors
export function useColors() {
  const { colors } = useTheme();
  return colors;
}
