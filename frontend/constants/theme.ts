import { Appearance } from 'react-native';
import { useSyncExternalStore } from 'react';

const lightColors = {
  primary: '#0066FF',
  secondary: '#00B341',
  accent: '#FF6B35',
  success: '#00B341',
  warning: '#FFA500',
  error: '#E63946',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8F9FA',
  gray100: '#F1F3F5',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#868E96',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',
};

const darkColors = {
  primary: '#5B9BFF',
  secondary: '#2DD36F',
  accent: '#FF8A5B',
  success: '#2DD36F',
  warning: '#FFB84D',
  error: '#FF6B7A',
  white: '#0B1220',
  black: '#F8FAFC',
  gray50: '#111827',
  gray100: '#172033',
  gray200: '#1F2937',
  gray300: '#334155',
  gray400: '#475569',
  gray500: '#64748B',
  gray600: '#94A3B8',
  gray700: '#CBD5E1',
  gray800: '#E2E8F0',
  gray900: '#F8FAFC',
};

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'krovaa.settings.theme';

let currentThemeMode: ThemeMode = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
const themeListeners = new Set<() => void>();

function emitThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function subscribeThemeChange(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

export function getThemeMode() {
  return currentThemeMode;
}

export function setThemeMode(mode: ThemeMode) {
  if (currentThemeMode === mode) {
    return;
  }

  currentThemeMode = mode;
  Appearance.setColorScheme(mode);
  emitThemeChange();
}

export function useThemeMode() {
  return useSyncExternalStore(subscribeThemeChange, getThemeMode, getThemeMode);
}

export const Colors = new Proxy(lightColors, {
  get(target, property: keyof typeof lightColors) {
    const palette = currentThemeMode === 'dark' ? darkColors : lightColors;
    return palette[property] ?? target[property];
  },
}) as typeof lightColors;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};
