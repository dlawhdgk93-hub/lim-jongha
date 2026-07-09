import { Platform } from 'react-native';

export function getNativeAudioUploadMeta(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.3gp')) {
    return { name: 'recording.3gp', type: 'audio/3gpp' };
  }
  if (lower.endsWith('.caf')) {
    return { name: 'recording.caf', type: 'audio/x-caf' };
  }
  if (lower.endsWith('.webm')) {
    return { name: 'recording.webm', type: 'audio/webm' };
  }
  if (Platform.OS === 'android') {
    return { name: 'recording.m4a', type: 'audio/mp4' };
  }
  return { name: 'recording.m4a', type: 'audio/mp4' };
}
