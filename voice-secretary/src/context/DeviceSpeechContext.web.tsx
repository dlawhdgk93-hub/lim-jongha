import { createContext, useContext, type ReactNode } from 'react';
import type { DeviceSpeechApi } from '../hooks/useDeviceSpeechRecognition';
import { useUnavailableDeviceSpeech } from '../hooks/useDeviceSpeechRecognition';

const fallbackApi = useUnavailableDeviceSpeech();

export const DeviceSpeechContext = createContext<DeviceSpeechApi>(fallbackApi);

export function useDeviceSpeech(): DeviceSpeechApi {
  return useContext(DeviceSpeechContext);
}

export function DeviceSpeechHost({ children }: { children: ReactNode }) {
  return <DeviceSpeechContext.Provider value={fallbackApi}>{children}</DeviceSpeechContext.Provider>;
}
