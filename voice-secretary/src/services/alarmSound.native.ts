import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Vibration } from 'react-native';
import type { AlarmMode } from '../constants/alarmModes';
import type { AlarmSoundId } from '../constants/alarmSounds';
import { endAlarmSession } from './alarmSession';
import { getAlarmSoundId } from '../store/alarmSoundStore';
let sound: Audio.Sound | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let loopActive = false;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

type ToneStep = { freq: number; ms: number; volume?: number; gap?: number };

function writeWavHeader(view: DataView, numSamples: number, sampleRate: number) {
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return globalThis.btoa(binary);
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += alphabet[a >> 2];
    result += alphabet[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
    result += i + 2 < bytes.length ? alphabet[c & 63] : '=';
  }
  return result;
}

function getPatternSteps(soundId: AlarmSoundId): ToneStep[] {
  switch (soundId) {
    case 'chime':
      return [{ freq: 523, ms: 280 }, { freq: 659, ms: 280, gap: 40 }, { freq: 784, ms: 380, gap: 40 }];
    case 'digital':
      return Array.from({ length: 6 }, (_, i) => ({ freq: 1000, ms: 100, volume: 0.7, gap: i ? 40 : 0 }));
    case 'gentle':
      return [{ freq: 440, ms: 550, volume: 0.55 }, { freq: 494, ms: 450, volume: 0.45, gap: 200 }];
    case 'urgent':
      return Array.from({ length: 8 }, (_, i) => ({
        freq: i % 2 === 0 ? 1200 : 800,
        ms: 120,
        volume: 0.75,
        gap: i ? 40 : 0,
      }));
    default:
      return [{ freq: 880, ms: 220 }, { freq: 988, ms: 220, gap: 100 }, { freq: 880, ms: 350, gap: 100 }];
  }
}

function patternDurationMs(soundId: AlarmSoundId): number {
  return getPatternSteps(soundId).reduce((sum, step) => sum + step.ms + (step.gap ?? 0), 0) + 300;
}

function loopIntervalMs(soundId: AlarmSoundId): number {
  switch (soundId) {
    case 'chime':
      return 2200;
    case 'gentle':
      return 2600;
    case 'digital':
      return 1400;
    case 'urgent':
      return 1600;
    default:
      return 1800;
  }
}

function createPatternWavBase64(steps: ToneStep[]): string {
  const sampleRate = 44100;
  const pcm: number[] = [];

  for (const step of steps) {
    if (step.gap) {
      const gapSamples = Math.floor(sampleRate * (step.gap / 1000));
      for (let i = 0; i < gapSamples; i += 1) pcm.push(0);
    }

    const numSamples = Math.max(1, Math.floor(sampleRate * (step.ms / 1000)));
    const volume = step.volume ?? 0.85;
    for (let i = 0; i < numSamples; i += 1) {
      const t = i / sampleRate;
      const fadeIn = Math.min(1, i / 200);
      const fadeOut = Math.min(1, (numSamples - i) / 200);
      const sample = Math.sin(2 * Math.PI * step.freq * t) * volume * fadeIn * fadeOut;
      pcm.push(Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))));
    }
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  writeWavHeader(view, pcm.length, sampleRate);
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(44 + i * 2, pcm[i], true);
  }

  return bytesToBase64(new Uint8Array(buffer));
}

async function ensureAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

async function unloadCurrentSound() {
  if (!sound) return;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    // ignore
  }
  sound = null;
}

async function playPatternOnce(soundId: AlarmSoundId, looping: boolean): Promise<boolean> {
  const base64 = createPatternWavBase64(getPatternSteps(soundId));
  const path = `${FileSystem.cacheDirectory}teamday-alarm-${soundId}.wav`;

  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await unloadCurrentSound();

  const created = await Audio.Sound.createAsync(
    { uri: path },
    { shouldPlay: true, volume: 1, isLooping: looping },
  );
  sound = created.sound;
  await sound.setVolumeAsync(1);

  const status = await sound.getStatusAsync();
  return status.isLoaded && (status.isPlaying || status.isBuffering);
}

function startVibrationLoop() {
  Vibration.vibrate([0, 400, 200, 400, 200, 400, 600], true);
}

function stopVibrationLoop() {
  Vibration.cancel();
}

export async function unlockAlarmAudio(): Promise<boolean> {
  try {
    await ensureAudioMode();
    return true;
  } catch {
    return false;
  }
}

export function isAlarmAudioUnlocked(): boolean {
  return true;
}

export async function startAlarmSound(
  soundId?: AlarmSoundId,
  mode: AlarmMode = 'both',
): Promise<void> {
  await stopAlarmSound(false);
  loopActive = true;
  const id = soundId ?? getAlarmSoundId();
  await ensureAudioMode();

  const play = async () => {
    if (!loopActive) return;
    if (mode === 'sound' || mode === 'both') {
      try {
        await playPatternOnce(id, true);
      } catch {
        // ignore playback errors
      }
    }
    if (mode === 'vibrate' || mode === 'both') {
      startVibrationLoop();
    }
  };

  await play();
  loopTimer = setInterval(() => {
    void play();
  }, loopIntervalMs(id));
}

export async function stopAlarmSound(_clearPreview = true): Promise<void> {
  loopActive = false;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  stopVibrationLoop();
  endAlarmSession();
  await unloadCurrentSound();
}
export async function previewAlarmSound(soundId: AlarmSoundId): Promise<boolean> {
  await stopAlarmSound();
  try {
    await ensureAudioMode();
    const playing = await playPatternOnce(soundId, false);
    if (!playing) return false;

    previewTimer = setTimeout(() => {
      void stopAlarmSound();
    }, patternDurationMs(soundId));
    return true;
  } catch {
    await stopAlarmSound();
    return false;
  }
}

export function setupAlarmAudioUnlockListeners(): () => void {
  unlockAlarmAudio().catch(() => undefined);
  return () => undefined;
}
