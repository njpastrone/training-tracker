import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useWorkoutStore } from '../stores/workoutStore';
import { darkTheme, lightTheme, darkColors, lightColors } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  colors: typeof darkColors;
  theme: typeof darkTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings, updateSettings } = useWorkoutStore();
  
  // Use local state for immediate theme updates, sync with store for persistence
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode>(settings.theme);

  // Sync local state with store on mount and when store changes
  useEffect(() => {
    setLocalThemeMode(settings.theme);
  }, [settings.theme]);

  // Use local theme mode for immediate updates
  const themeMode = localThemeMode;

  // Determine if we should use dark mode
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  // Get appropriate colors and theme
  const colors = isDarkMode ? darkColors : lightColors;
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleSetThemeMode = (mode: ThemeMode) => {
    // Update local state immediately for instant UI response
    setLocalThemeMode(mode);
    
    // Update store for persistence (async)
    updateSettings({ theme: mode });
  };

  const value: ThemeContextType = {
    isDarkMode,
    themeMode,
    colors,
    theme,
    setThemeMode: handleSetThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
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