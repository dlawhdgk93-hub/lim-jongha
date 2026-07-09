import type { AlarmMode } from '../constants/alarmModes';
import type { AlarmSoundId } from '../constants/alarmSounds';
import { getAlarmSoundId } from '../store/alarmSoundStore';

let loopTimer: ReturnType<typeof setInterval> | null = null;
let loopActive = false;
let audioContext: AudioContext | null = null;
let unlocked = false;

type ToneStep = { freq: number; ms: number; type?: OscillatorType; volume?: number; gap?: number };

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

function createToneWavBlob(freq: number, durationMs: number, volume = 0.85): Blob {
  const sampleRate = 44100;
  const numSamples = Math.max(1, Math.floor(sampleRate * (durationMs / 1000)));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  writeWavHeader(view, numSamples, sampleRate);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, i / 200);
    const fadeOut = Math.min(1, (numSamples - i) / 200);
    const sample = Math.sin(2 * Math.PI * freq * t) * volume * fadeIn * fadeOut;
    view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function createHtmlAudioElement(src: string): HTMLAudioElement {
  if (typeof document !== 'undefined') {
    const el = document.createElement('audio');
    el.src = src;
    el.volume = 1;
    el.preload = 'auto';
    return el;
  }

  if (typeof window !== 'undefined' && window.Audio) {
    return new window.Audio(src) as unknown as HTMLAudioElement;
  }

  throw new Error('Audio not supported');
}

function playToneWav(freq: number, durationMs: number, volume = 0.85): Promise<void> {
  const blob = createToneWavBlob(freq, durationMs, volume);
  const url = URL.createObjectURL(blob);
  const audio = createHtmlAudioElement(url);

  return new Promise((resolve, reject) => {
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('audio error'));
    };
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch((err) => {
        cleanup();
        reject(err);
      });
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPatternSteps(soundId: AlarmSoundId): ToneStep[] {
  switch (soundId) {
    case 'chime':
      return [
        { freq: 523, ms: 280 },
        { freq: 659, ms: 280, gap: 40 },
        { freq: 784, ms: 380, gap: 40 },
      ];
    case 'digital':
      return Array.from({ length: 6 }, (_, i) => ({
        freq: 1000,
        ms: 100,
        volume: 0.7,
        gap: i === 0 ? 0 : 40,
      }));
    case 'gentle':
      return [
        { freq: 440, ms: 550, volume: 0.55 },
        { freq: 494, ms: 450, volume: 0.45, gap: 200 },
      ];
    case 'urgent':
      return Array.from({ length: 8 }, (_, i) => ({
        freq: i % 2 === 0 ? 1200 : 800,
        ms: 120,
        volume: 0.75,
        gap: i === 0 ? 0 : 40,
      }));
    case 'bell':
    default:
      return [
        { freq: 880, ms: 220 },
        { freq: 988, ms: 220, gap: 100 },
        { freq: 880, ms: 350, gap: 100 },
      ];
  }
}

async function playPatternSteps(steps: ToneStep[]): Promise<void> {
  for (const step of steps) {
    if (step.gap) await delay(step.gap);
    await playToneWav(step.freq, step.ms, step.volume ?? 0.85);
  }
}

function getWebAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new Ctx();
  }
  return audioContext;
}

function playPatternWebAudio(soundId: AlarmSoundId): boolean {
  const ctx = getWebAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  if (ctx.state !== 'running') return false;

  const t = ctx.currentTime;
  const steps = getPatternSteps(soundId);
  let offset = 0;

  for (const step of steps) {
    offset += (step.gap ?? 0) / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.type ?? 'sine';
    osc.frequency.value = step.freq;
    gain.gain.value = step.volume ?? 0.85;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const dur = step.ms / 1000;
    osc.start(t + offset);
    osc.stop(t + offset + dur);
    offset += dur;
  }

  return true;
}

async function playPatternHtml(soundId: AlarmSoundId): Promise<boolean> {
  try {
    await playPatternSteps(getPatternSteps(soundId));
    return true;
  } catch {
    return false;
  }
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

export async function unlockAlarmAudio(): Promise<boolean> {
  let ok = false;
  const ctx = getWebAudioContext();

  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (ctx.state === 'running') {
        playPatternWebAudio('bell');
        ok = true;
        unlocked = true;
      }
    } catch {
      // try HTML unlock below
    }
  }

  if (!ok) {
    try {
      const blob = createToneWavBlob(660, 120, 0.4);
      const url = URL.createObjectURL(blob);
      const audio = createHtmlAudioElement(url);
      await audio.play();
      URL.revokeObjectURL(url);
      ok = true;
      unlocked = true;
    } catch {
      unlocked = false;
    }
  }

  return ok;
}

export function isAlarmAudioUnlocked(): boolean {
  return unlocked || audioContext?.state === 'running';
}

async function playAlarmOnce(soundId: AlarmSoundId): Promise<void> {
  if (playPatternWebAudio(soundId)) return;
  await playPatternHtml(soundId);
}

export async function startAlarmSound(
  soundId?: AlarmSoundId,
  mode: AlarmMode = 'both',
): Promise<void> {
  stopAlarmSound(false);
  loopActive = true;
  const id = soundId ?? getAlarmSoundId();

  const run = () => {
    if (!loopActive) return;
    if (mode === 'sound' || mode === 'both') {
      void playAlarmOnce(id);
    }
    if (mode === 'vibrate' || mode === 'both') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 300]);
      }
    }
  };

  if (!isAlarmAudioUnlocked()) {
    await unlockAlarmAudio();
  }

  run();
  loopTimer = setInterval(run, loopIntervalMs(id));
}

export function stopAlarmSound(clearPreview = true): void {
  loopActive = false;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (clearPreview && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

export async function previewAlarmSound(soundId: AlarmSoundId): Promise<boolean> {
  stopAlarmSound();

  const htmlOk = await playPatternHtml(soundId);
  if (htmlOk) {
    unlocked = true;
    return true;
  }

  const webOk = playPatternWebAudio(soundId);
  if (webOk) unlocked = true;
  return webOk;
}

export function setupAlarmAudioUnlockListeners(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const unlock = () => {
    void unlockAlarmAudio();
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('click', unlock);
  };
}
