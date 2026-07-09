import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ScheduleViewMode = 'grid' | 'list';

const STORAGE_KEY = 'teamday_schedule_view_mode';

type State = {
  viewMode: ScheduleViewMode;
  ready: boolean;
  setViewMode: (mode: ScheduleViewMode) => void;
  loadViewMode: () => Promise<void>;
};

export const useScheduleViewStore = create<State>((set) => ({
  viewMode: 'grid',
  ready: false,
  setViewMode: (mode) => {
    set({ viewMode: mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined);
  },
  loadViewMode: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        set({ viewMode: stored, ready: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ ready: true });
  },
}));
