import { normalizeKoreanSpeechText } from './koreanSpeechNormalize';

export function formatTranscriptLines(raw: string): { raw: string; normalized: string; display: string } {
  const trimmedRaw = raw.trim().replace(/\s+/g, ' ');
  const normalized = normalizeKoreanSpeechText(trimmedRaw);

  if (!trimmedRaw) {
    return { raw: '', normalized: '', display: '' };
  }

  if (trimmedRaw === normalized) {
    return {
      raw: trimmedRaw,
      normalized,
      display: `🎙 ${trimmedRaw}`,
    };
  }

  return {
    raw: trimmedRaw,
    normalized,
    display: `🎙 인식: ${trimmedRaw}\n✏️ 정리: ${normalized}`,
  };
}
