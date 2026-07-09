export type DeviceSpeechApi = {
  isReady: boolean;
  isAvailable: boolean;
  isListening: boolean;
  interimText: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  requestPermission: () => Promise<boolean>;
  abortListening: () => void;
};

const unavailableApi: DeviceSpeechApi = {
  isReady: true,
  isAvailable: false,
  isListening: false,
  interimText: '',
  startListening: async () => {
    throw new Error('지원되지 않는 환경입니다.');
  },
  stopListening: async () => '',
  requestPermission: async () => false,
  abortListening: () => undefined,
};

export function useUnavailableDeviceSpeech(): DeviceSpeechApi {
  return unavailableApi;
}
