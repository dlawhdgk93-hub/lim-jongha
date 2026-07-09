import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web'
    ? require('./alarmSound.web')
    : require('./alarmSound.native');

export const isAlarmAudioUnlocked: typeof import('./alarmSound.web').isAlarmAudioUnlocked =
  impl.isAlarmAudioUnlocked;
export const previewAlarmSound: typeof import('./alarmSound.web').previewAlarmSound =
  impl.previewAlarmSound;
export const setupAlarmAudioUnlockListeners: typeof import('./alarmSound.web').setupAlarmAudioUnlockListeners =
  impl.setupAlarmAudioUnlockListeners;
export const startAlarmSound: typeof import('./alarmSound.web').startAlarmSound =
  impl.startAlarmSound;
export const stopAlarmSound: typeof import('./alarmSound.web').stopAlarmSound =
  impl.stopAlarmSound;
export const unlockAlarmAudio: typeof import('./alarmSound.web').unlockAlarmAudio =
  impl.unlockAlarmAudio;
