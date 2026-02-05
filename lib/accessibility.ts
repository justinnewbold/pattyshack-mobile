import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ACCESSIBILITY_STORAGE_KEY = '@pattyshack_accessibility';

export interface AccessibilitySettings {
  // Visual
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  boldText: boolean;

  // Interaction
  hapticFeedback: boolean;
  soundFeedback: boolean;
  extendedTouchTargets: boolean;

  // Screen reader
  screenReaderEnabled: boolean;
  announceAlerts: boolean;
}

const defaultSettings: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  boldText: false,
  hapticFeedback: true,
  soundFeedback: true,
  extendedTouchTargets: false,
  screenReaderEnabled: false,
  announceAlerts: true,
};

interface AccessibilityState extends AccessibilitySettings {
  isLoading: boolean;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useAccessibility = create<AccessibilityState>((set, get) => ({
  ...defaultSettings,
  isLoading: true,

  updateSetting: async (key, value) => {
    set({ [key]: value });

    const currentSettings = get();
    const settings: AccessibilitySettings = {
      largeText: currentSettings.largeText,
      highContrast: currentSettings.highContrast,
      reduceMotion: currentSettings.reduceMotion,
      boldText: currentSettings.boldText,
      hapticFeedback: currentSettings.hapticFeedback,
      soundFeedback: currentSettings.soundFeedback,
      extendedTouchTargets: currentSettings.extendedTouchTargets,
      screenReaderEnabled: currentSettings.screenReaderEnabled,
      announceAlerts: currentSettings.announceAlerts,
    };

    await AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  },

  loadSettings: async () => {
    try {
      // Load saved settings
      const saved = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      const settings = saved ? JSON.parse(saved) : defaultSettings;

      // Check system settings
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

      set({
        ...settings,
        screenReaderEnabled,
        reduceMotion: settings.reduceMotion || reduceMotionEnabled,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
      set({ isLoading: false });
    }
  },

  resetSettings: async () => {
    set(defaultSettings);
    await AsyncStorage.removeItem(ACCESSIBILITY_STORAGE_KEY);
  },
}));

// Subscribe to system accessibility changes
AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
  useAccessibility.setState({ screenReaderEnabled: enabled });
});

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  const current = useAccessibility.getState();
  if (!current.reduceMotion) {
    useAccessibility.setState({ reduceMotion: enabled });
  }
});

// Helper functions for accessibility
export function getAccessibleFontSize(baseSize: number): number {
  const { largeText } = useAccessibility.getState();
  return largeText ? baseSize * 1.3 : baseSize;
}

export function getAccessibleSpacing(baseSpacing: number): number {
  const { extendedTouchTargets } = useAccessibility.getState();
  return extendedTouchTargets ? baseSpacing * 1.5 : baseSpacing;
}

export function getMinTouchTargetSize(): number {
  const { extendedTouchTargets } = useAccessibility.getState();
  return extendedTouchTargets ? 56 : 44;
}

// Accessibility labels helper
export function createAccessibilityLabel(
  label: string,
  hint?: string,
  state?: { selected?: boolean; disabled?: boolean; expanded?: boolean }
): {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: object;
  accessible: boolean;
} {
  return {
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: state,
    accessible: true,
  };
}

// Announce to screen reader
export function announceForAccessibility(message: string): void {
  const { announceAlerts, screenReaderEnabled } = useAccessibility.getState();

  if (screenReaderEnabled && announceAlerts) {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

// Check if animations should be reduced
export function shouldReduceMotion(): boolean {
  return useAccessibility.getState().reduceMotion;
}

// Get animation duration based on settings
export function getAnimationDuration(baseDuration: number): number {
  return shouldReduceMotion() ? 0 : baseDuration;
}

// Accessible color adjustments for high contrast
export function getAccessibleColor(color: string, isText: boolean = false): string {
  const { highContrast } = useAccessibility.getState();

  if (!highContrast) return color;

  // In high contrast mode, use pure black/white for better visibility
  if (isText) {
    return '#000000';
  }

  // Increase color saturation for non-text elements
  return color;
}

// Font weight based on accessibility settings
export function getAccessibleFontWeight(baseWeight: string): string {
  const { boldText } = useAccessibility.getState();

  if (!boldText) return baseWeight;

  // Increase font weight
  const weightMap: Record<string, string> = {
    'normal': '500',
    '400': '600',
    '500': '700',
    '600': '800',
    '700': '900',
    'bold': '900',
  };

  return weightMap[baseWeight] || baseWeight;
}

// Create accessible styles
export function createAccessibleStyles(baseStyles: any): any {
  const { largeText, boldText, extendedTouchTargets } = useAccessibility.getState();

  const accessibleStyles = { ...baseStyles };

  if (largeText && accessibleStyles.fontSize) {
    accessibleStyles.fontSize = accessibleStyles.fontSize * 1.3;
  }

  if (boldText && accessibleStyles.fontWeight) {
    accessibleStyles.fontWeight = getAccessibleFontWeight(accessibleStyles.fontWeight);
  }

  if (extendedTouchTargets) {
    if (accessibleStyles.padding) {
      accessibleStyles.padding = accessibleStyles.padding * 1.25;
    }
    if (accessibleStyles.minHeight) {
      accessibleStyles.minHeight = Math.max(accessibleStyles.minHeight, 56);
    }
  }

  return accessibleStyles;
}
