export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  sharedIncoming: string;
  sharedIncomingBg: string;
  sharedOutgoing: string;
  sharedOutgoingBg: string;
  scrollbarThumb: string;
  scrollbarTrack: string;
};

export const DARK_THEME: ThemeColors = {
  background: '#0B1220',
  surface: '#152033',
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#243047',
  sharedIncoming: '#38BDF8',
  sharedIncomingBg: '#0C2340',
  sharedOutgoing: '#F59E0B',
  sharedOutgoingBg: '#2A1F0A',
  scrollbarThumb: '#334155',
  scrollbarTrack: '#0B1220',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F0F4FA',
  surface: '#FFFFFF',
  primary: '#2563EB',
  primaryLight: '#1D4ED8',
  text: '#0F172A',
  textMuted: '#64748B',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  border: '#E2E8F0',
  sharedIncoming: '#0284C7',
  sharedIncomingBg: '#E0F2FE',
  sharedOutgoing: '#D97706',
  sharedOutgoingBg: '#FFF7ED',
  scrollbarThumb: '#CBD5E1',
  scrollbarTrack: '#F0F4FA',
};

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? LIGHT_THEME : DARK_THEME;
}
