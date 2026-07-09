import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web'
    ? require('./DeviceSpeechContext.web')
    : require('./DeviceSpeechContext.native');

export const DeviceSpeechContext: typeof import('./DeviceSpeechContext.native').DeviceSpeechContext =
  impl.DeviceSpeechContext;

export const useDeviceSpeech: typeof import('./DeviceSpeechContext.native').useDeviceSpeech =
  impl.useDeviceSpeech;

export const DeviceSpeechHost: typeof import('./DeviceSpeechContext.native').DeviceSpeechHost =
  impl.DeviceSpeechHost;
