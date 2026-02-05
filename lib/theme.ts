import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

const THEME_STORAGE_KEY = '@pattyshack_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textOnPrimary: string;
  border: string;
  divider: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  badgeRed: string;
  badgeGreen: string;
  complete: string;
  pending: string;
  overdue: string;
  tabActive: string;
  tabInactive: string;
}

export const lightTheme: ThemeColors = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  secondary: '#2196F3',
  secondaryDark: '#1976D2',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  textOnPrimary: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  badgeRed: '#F44336',
  badgeGreen: '#4CAF50',
  complete: '#4CAF50',
  pending: '#FF9800',
  overdue: '#F44336',
  tabActive: '#4CAF50',
  tabInactive: '#9E9E9E',
};

export const darkTheme: ThemeColors = {
  primary: '#66BB6A',
  primaryDark: '#43A047',
  secondary: '#42A5F5',
  secondaryDark: '#1E88E5',
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textLight: '#6B6B6B',
  textOnPrimary: '#000000',
  border: '#3D3D3D',
  divider: '#2C2C2C',
  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
  info: '#42A5F5',
  badgeRed: '#EF5350',
  badgeGreen: '#66BB6A',
  complete: '#66BB6A',
  pending: '#FFB74D',
  overdue: '#EF5350',
  tabActive: '#66BB6A',
  tabInactive: '#6B6B6B',
};

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

function getEffectiveTheme(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: false,
  colors: lightTheme,

  setMode: async (mode: ThemeMode) => {
    const isDark = getEffectiveTheme(mode);
    set({
      mode,
      isDark,
      colors: isDark ? darkTheme : lightTheme,
    });

    // Persist theme preference
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  },

  toggleTheme: () => {
    const { mode } = get();
    const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    get().setMode(newMode);
  },

  loadTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode = (savedMode as ThemeMode) || 'system';
      const isDark = getEffectiveTheme(mode);

      set({
        mode,
        isDark,
        colors: isDark ? darkTheme : lightTheme,
      });
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  },
}));

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { mode, setMode } = useTheme.getState();
  if (mode === 'system') {
    // Re-apply system theme
    setMode('system');
  }
});

// Spacing values (shared between themes)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes (shared between themes)
export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  title: 20,
  header: 28,
};

// Border radius (shared between themes)
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Create themed styles helper
export function createThemedStyles<T extends Record<string, any>>(
  styleCreator: (colors: ThemeColors) => T
) {
  return () => {
    const { colors } = useTheme();
    return styleCreator(colors);
  };
}
