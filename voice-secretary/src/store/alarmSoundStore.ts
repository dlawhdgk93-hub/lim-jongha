import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  DEFAULT_ALARM_SOUND,
  isAlarmSoundId,
  type AlarmSoundId,
} from '../constants/alarmSounds';

const STORAGE_KEY = 'voice_secretary_alarm_sound';

type AlarmSoundState = {
  soundId: AlarmSoundId;
  ready: boolean;
  loadSound: () => Promise<void>;
  setSoundId: (soundId: AlarmSoundId) => Promise<void>;
};

export const useAlarmSoundStore = create<AlarmSoundState>((set) => ({
  soundId: DEFAULT_ALARM_SOUND,
  ready: false,

  loadSound: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const soundId = isAlarmSoundId(stored) ? stored : DEFAULT_ALARM_SOUND;
      set({ soundId, ready: true });
    } catch {
      set({ ready: true });
    }
  },

  setSoundId: async (soundId) => {
    set({ soundId });
    await AsyncStorage.setItem(STORAGE_KEY, soundId);
  },
}));

export function getAlarmSoundId(): AlarmSoundId {
  return useAlarmSoundStore.getState().soundId;
}
