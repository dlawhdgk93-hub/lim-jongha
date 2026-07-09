import { createContext, useContext, type ReactNode } from 'react';
import type { DeviceSpeechApi } from '../hooks/useDeviceSpeechRecognition';
import { useUnavailableDeviceSpeech } from '../hooks/useDeviceSpeechRecognition';
import { useDeviceSpeechRecognitionImpl } from '../hooks/useDeviceSpeechRecognition.native';

const fallbackApi = useUnavailableDeviceSpeech();

export const DeviceSpeechContext = createContext<DeviceSpeechApi>(fallbackApi);

export function useDeviceSpeech(): DeviceSpeechApi {
  return useContext(DeviceSpeechContext);
}

export function DeviceSpeechHost({ children }: { children: ReactNode }) {
  const api = useDeviceSpeechRecognitionImpl();
  return <DeviceSpeechContext.Provider value={api}>{children}</DeviceSpeechContext.Provider>;
}
