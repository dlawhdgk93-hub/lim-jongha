import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  DARK_THEME,
  getThemeColors,
  type ThemeColors,
  type ThemeMode,
} from '../constants/themes';
import { applyWebThemeStyles } from '../utils/applyWebThemeStyles';

const THEME_STORAGE_KEY = 'voice_secretary_theme_mode';

type ThemeState = {
  mode: ThemeMode;
  colors: ThemeColors;
  ready: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colors: DARK_THEME,
  ready: false,

  setMode: async (mode) => {
    const colors = getThemeColors(mode);
    set({ mode, colors });
    applyWebThemeStyles(colors, mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  },

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode: ThemeMode = stored === 'light' ? 'light' : 'dark';
      const colors = getThemeColors(mode);
      set({ mode, colors, ready: true });
      applyWebThemeStyles(colors, mode);
    } catch {
      set({ ready: true });
      applyWebThemeStyles(get().colors, get().mode);
    }
  },
}));
