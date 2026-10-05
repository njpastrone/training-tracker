import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { format } from 'date-fns';
import { useWorkoutStore } from '../stores/workoutStore';
import { darkTheme, lightTheme, darkPalette, lightPalette, Palette } from '../constants/theme';
import { weekSky, WeekSky } from '../services/sky';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: Palette;
  theme: typeof lightTheme;
  sky: WeekSky;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const today = () => format(new Date(), 'yyyy-MM-dd');

// Appearance follows the iPhone (HIG: no app-specific appearance setting)
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useColorScheme() === 'dark';
  const workouts = useWorkoutStore(s => s.workouts);
  const schedule = useWorkoutStore(s => s.schedule);
  const [day, setDay] = useState(today);

  // The sky is static per visit: recomputed on data changes and when the app returns on a new day
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => state === 'active' && setDay(today()));
    return () => sub.remove();
  }, []);

  const sky = useMemo(() => weekSky(workouts, schedule), [workouts, schedule, day]);

  const value: ThemeContextType = {
    isDarkMode,
    colors: isDarkMode ? darkPalette : lightPalette,
    theme: isDarkMode ? darkTheme : lightTheme,
    sky,
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
