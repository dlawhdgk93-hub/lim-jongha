import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web'
    ? require('./useDeviceSpeechRecognition.web')
    : require('./useDeviceSpeechRecognition.native');

export type DeviceSpeechApi = import('./useDeviceSpeechRecognition.native').DeviceSpeechApi;

export const useUnavailableDeviceSpeech: typeof import('./useDeviceSpeechRecognition.native').useUnavailableDeviceSpeech =
  impl.useUnavailableDeviceSpeech;
