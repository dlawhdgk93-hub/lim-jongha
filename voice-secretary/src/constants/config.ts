export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ybrnljmnuahopuuyexog.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlicm5sam1udWFob3B1dXlleG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTgyOTYsImV4cCI6MjA5ODM5NDI5Nn0.9VOJXaqNrZANHeHPp-T-7ktf16ZQzymvl9BHznG56EA';

export const VOICE_PARSE_URL = `${SUPABASE_URL}/functions/v1/voice-parse`;

import { DARK_THEME } from './themes';

/** @deprecated use useThemeColors() — kept for modules that cannot use hooks */
export const COLORS = DARK_THEME;

export const PLANS = {
  starter: { name: 'Starter', dailyVoiceLimit: 20 },
  pro: { name: 'Pro', dailyVoiceLimit: Infinity },
  team: { name: 'Team', dailyVoiceLimit: Infinity },
} as const;
