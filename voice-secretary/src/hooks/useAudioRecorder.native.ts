import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RECORD_MS = 120_000;

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      stopRecording().catch(() => undefined);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const permission = await Audio.requestPermissionsAsync();
    const granted = permission.granted;
    setPermissionGranted(granted);
    return granted;
  }, []);

  const clearTimers = () => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = null;
  };

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimers();
    const recording = recordingRef.current;
    if (!recording) return null;

    try {
      const status = await recording.getStatusAsync();
      if (!status.isRecording && !status.isDoneRecording) {
        recordingRef.current = null;
        setIsRecording(false);
        return null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) return null;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || (info.size ?? 0) < 800) {
        throw new Error('녹음이 너무 짧습니다. 다시 말씀해 주세요.');
      }
      return uri;
    } catch (err) {
      recordingRef.current = null;
      setIsRecording(false);
      if (err instanceof Error) throw err;
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const granted = permissionGranted ?? (await requestPermission());
    if (!granted) {
      throw new Error('마이크 권한이 필요합니다. 설정에서 마이크를 허용해 주세요.');
    }

    if (recordingRef.current) {
      await stopRecording();
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
      },
    });
    await recording.startAsync();

    recordingRef.current = recording;
    setIsRecording(true);

    maxTimerRef.current = setTimeout(() => {
      void stopRecording();
    }, MAX_RECORD_MS);
  }, [permissionGranted, requestPermission, stopRecording]);

  return {
    isRecording,
    permissionGranted,
    requestPermission,
    startRecording,
    stopRecording,
  };
}

export { getNativeAudioUploadMeta } from '../utils/audioUpload';
