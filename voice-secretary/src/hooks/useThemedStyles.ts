import { useMemo } from 'react';
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import type { ThemeColors, ThemeMode } from '../constants/themes';
import { useThemeStore } from '../store/themeStore';

type AppStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function useThemeColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}

export function useThemeMode(): ThemeMode {
  return useThemeStore((s) => s.mode);
}

export function useThemedStyles(factory: (colors: ThemeColors) => object): AppStyles {
  const colors = useThemeColors();
  return useMemo(
    () => StyleSheet.create(factory(colors) as StyleSheet.NamedStyles<AppStyles>),
    [colors, factory],
  );
}
