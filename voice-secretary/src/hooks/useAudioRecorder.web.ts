import { useCallback, useRef, useState } from 'react';

function getMediaRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const requestPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionGranted(false);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
      return true;
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopStream();
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStream();
        setIsRecording(false);
        resolve(blob.size > 0 ? URL.createObjectURL(blob) : null);
      };
      recorder.stop();
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저에서는 마이크 녹음을 지원하지 않습니다.');
    }
    const mimeType = getMediaRecorderMimeType();
    if (!mimeType) {
      throw new Error('이 브라우저에서는 마이크 녹음을 지원하지 않습니다.');
    }

    const granted = permissionGranted ?? (await requestPermission());
    if (!granted) {
      throw new Error('마이크 권한이 필요합니다.');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await stopRecording();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [permissionGranted, requestPermission, stopRecording]);

  return {
    isRecording,
    permissionGranted,
    requestPermission,
    startRecording,
    stopRecording,
  };
}
