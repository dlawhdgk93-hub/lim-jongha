import { useCallback, useState } from 'react';
import { parseVoiceInput, saveParsedSchedule } from '../services/openai';
import type { ParseScheduleOptions } from '../utils/nlpParser';
import type { VoiceParseResult } from '../types/schedule';

export function useVoiceParser(userId: string | undefined) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<VoiceParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseAudio = useCallback(
    async (audioUri: string, parseOptions?: ParseScheduleOptions) => {
      setParsing(true);
      setError(null);
      try {
        const result = await parseVoiceInput({ audioUri, parseOptions });
        setPreview(result);
        return result;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        throw err;
      } finally {
        setParsing(false);
      }
    },
    [],
  );

  const parseText = useCallback(
    async (text: string, parseOptions?: ParseScheduleOptions, rawText?: string) => {
      setParsing(true);
      setError(null);
      try {
        const result = await parseVoiceInput({ text, parseOptions, rawText });
        setPreview(result);
        return result;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        throw err;
      } finally {
        setParsing(false);
      }
    },
    [],
  );

  const savePreview = useCallback(
    async (previewData: VoiceParseResult) => {
      if (!userId) throw new Error('로그인이 필요합니다.');
      const saved = await saveParsedSchedule(previewData, userId);
      setPreview(null);
      return saved;
    },
    [userId],
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    parsing,
    preview,
    error,
    parseAudio,
    parseText,
    confirmSave: async () => {
      if (!preview) return null;
      return savePreview(preview);
    },
    savePreview,
    clearPreview,
    setPreview,
  };
}
