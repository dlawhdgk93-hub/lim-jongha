import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web'
    ? require('./useAudioRecorder.web')
    : require('./useAudioRecorder.native');

export const useAudioRecorder: typeof import('./useAudioRecorder.native').useAudioRecorder =
  impl.useAudioRecorder;
