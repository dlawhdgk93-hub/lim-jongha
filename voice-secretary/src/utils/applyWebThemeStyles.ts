import { Platform } from 'react-native';
import type { ThemeColors, ThemeMode } from '../constants/themes';

const STYLE_ID = 'voice-secretary-theme-styles';

export function applyWebThemeStyles(colors: ThemeColors, mode: ThemeMode) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  el.textContent = `
    html, body, #root {
      background-color: ${colors.background} !important;
      color-scheme: ${mode};
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: ${colors.scrollbarThumb} ${colors.scrollbarTrack};
    }
    *::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    *::-webkit-scrollbar-track {
      background: ${colors.scrollbarTrack};
    }
    *::-webkit-scrollbar-thumb {
      background: ${colors.scrollbarThumb};
      border-radius: 999px;
      border: 2px solid ${colors.scrollbarTrack};
    }
    *::-webkit-scrollbar-thumb:hover {
      background: ${colors.border};
    }
  `;

  document.documentElement.style.backgroundColor = colors.background;
  document.body.style.backgroundColor = colors.background;
}
