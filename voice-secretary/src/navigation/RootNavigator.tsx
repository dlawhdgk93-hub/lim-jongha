import type { VoiceParseResult } from '../types/schedule';

export type RootStackParamList = {
  Home: undefined;
  Detail: { scheduleId: string; draft?: VoiceParseResult };
  Settings: undefined;
  Share: undefined;
};
