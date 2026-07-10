import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, VOICE_PARSE_URL } from '../constants/config';
import type { ParseScheduleOptions } from '../utils/nlpParser';
import { parseKoreanScheduleText } from '../utils/nlpParser';
import { normalizeKoreanSpeechText, hasExplicitScheduleTime } from '../utils/koreanSpeechNormalize';
import { hasExplicitCalendarDate } from '../utils/koreanDateParse';
import { getNativeAudioUploadMeta } from '../utils/audioUpload';
import { supabase } from './supabase';
import type { VoiceParseResult } from '../types/schedule';
import { debugLog } from '../utils/debugLog';

function formatVoiceApiError(message: string): string {
  if (message.includes('insufficient_quota') || message.includes('exceeded your current quota')) {
    return 'OpenAI 사용 한도가 초과되었습니다. 결제/크레딧을 충전하거나, 갤럭시 기기 음성인식 앱을 업데이트한 뒤 다시 시도해 주세요.';
  }
  if (message.includes('OPENAI_API_KEY')) {
    return '음성 인식 서버 설정이 필요합니다. 아래에 말한 내용을 직접 입력해 주세요.';
  }
  return message;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

export async function parseVoiceInput(options: {
  audioUri?: string | null;
  text?: string;
  rawText?: string;
  parseOptions?: ParseScheduleOptions;
}): Promise<VoiceParseResult> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('로그인이 필요합니다.');
  }

  if (options.text?.trim()) {
    const cleaned = normalizeKoreanSpeechText(options.text.trim());
    const storedRaw = options.rawText?.trim() || options.text.trim();

    if (!hasExplicitScheduleTime(cleaned) || hasExplicitCalendarDate(cleaned)) {
      return parseLocally(cleaned, options.parseOptions, storedRaw);
    }

    const hasExplicitKoreanTime = /(오전|오후)?\s*\d{1,2}\s*시/.test(cleaned);

    if (hasExplicitKoreanTime || hasExplicitCalendarDate(cleaned)) {
      const local = parseLocally(cleaned, options.parseOptions, storedRaw);
      // #region agent log
      debugLog(
        'openai.ts:parseVoiceInput',
        'local KST parse for explicit time',
        {
          text: cleaned.slice(0, 80),
          title: local.schedule.parsed_content.title,
          date: local.schedule.parsed_content.date,
          time: local.schedule.parsed_content.time,
        },
        'H1',
      );
      // #endregion
      return local;
    }

    try {
      const result = await parseViaEdgeFunction(token, {
        text: cleaned,
        defaultDateKey: options.parseOptions?.defaultDateKey,
      });
      result.schedule.raw_text = storedRaw;
      // #region agent log
      debugLog(
        'openai.ts:parseVoiceInput',
        'edge function parse result',
        {
          text: cleaned.slice(0, 80),
          defaultDateKey: options.parseOptions?.defaultDateKey,
          title: result.schedule.parsed_content.title,
          date: result.schedule.parsed_content.date,
          time: result.schedule.parsed_content.time,
          target_timestamp: result.schedule.target_timestamp,
          confidence: result.confidence,
        },
        'H1',
      );
      // #endregion
      return result;
    } catch (err) {
      // #region agent log
      debugLog(
        'openai.ts:parseVoiceInput',
        'edge failed, using local fallback',
        { error: (err as Error).message, text: cleaned.slice(0, 80) },
        'H2',
      );
      // #endregion
      return parseLocally(cleaned, options.parseOptions, storedRaw);
    }
  }

  if (!options.audioUri) {
    throw new Error('녹음 데이터가 없습니다.');
  }

  try {
    return await parseAudioViaEdgeFunction(token, options.audioUri, options.parseOptions);
  } catch (err) {
    const message = formatVoiceApiError((err as Error).message || '');
    if (message.includes('OPENAI_API_KEY')) {
      throw new Error('음성 인식 서버 설정이 필요합니다. 아래에 말한 내용을 직접 입력해 주세요.');
    }
    if (Platform.OS === 'web') throw err;
    throw new Error(
      message.includes('Network request failed') || message.includes('network')
        ? '음성 전송에 실패했습니다. Wi-Fi/데이터 연결을 확인하고 다시 시도해 주세요.'
        : message || '음성 분석에 실패했습니다. 다시 시도해 주세요.',
    );
  }
}

async function parseAudioViaEdgeFunction(
  token: string,
  audioUri: string,
  parseOptions?: ParseScheduleOptions,
): Promise<VoiceParseResult> {
  if (Platform.OS === 'web') {
    const formData = await buildWebAudioFormData(audioUri, parseOptions);
    const response = await fetch(VOICE_PARSE_URL, {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    });
    return handleParseResponse(response);
  }

  const meta = getNativeAudioUploadMeta(audioUri);
  const parameters: Record<string, string> = {};
  if (parseOptions?.defaultDateKey) {
    parameters.defaultDateKey = parseOptions.defaultDateKey;
  }

  try {
    const upload = await FileSystem.uploadAsync(VOICE_PARSE_URL, audioUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: meta.type,
      parameters,
      headers: authHeaders(token),
    });

    if (upload.status >= 200 && upload.status < 300) {
      return parseUploadBody(upload.body);
    }

    throw new Error(parseUploadError(upload.body, upload.status));
  } catch (uploadErr) {
    const uploadMessage = (uploadErr as Error).message || '';
    if (
      uploadMessage.includes('OPENAI_API_KEY') ||
      uploadMessage.includes('Daily voice parse limit')
    ) {
      throw uploadErr;
    }

    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) {
      throw new Error('녹음 파일을 읽을 수 없습니다.');
    }

    return parseViaEdgeFunction(token, {
      audioBase64: base64,
      audioMime: meta.type,
      audioFileName: meta.name,
      defaultDateKey: parseOptions?.defaultDateKey,
    });
  }
}

async function buildWebAudioFormData(
  audioUri: string,
  parseOptions?: ParseScheduleOptions,
): Promise<FormData> {
  const formData = new FormData();

  if (parseOptions?.defaultDateKey) {
    formData.append('defaultDateKey', parseOptions.defaultDateKey);
  }

  const response = await fetch(audioUri);
  const blob = await response.blob();
  const type = blob.type || 'audio/webm';
  const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
  formData.append('audio', blob, `recording.${ext}`);
  return formData;
}

function parseUploadBody(body: string): VoiceParseResult {
  let payload: { error?: string; schedule?: VoiceParseResult['schedule']; confidence?: number };
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error('음성 분석 서버 응답을 읽을 수 없습니다.');
  }

  if (payload.error) {
    throw new Error(formatVoiceApiError(payload.error));
  }
  if (!payload.schedule) {
    throw new Error('음성 분석 결과가 비어 있습니다.');
  }

  return payload as VoiceParseResult;
}

function parseUploadError(body: string, status: number): string {
  try {
    const payload = JSON.parse(body) as { error?: string; message?: string };
    return formatVoiceApiError(payload.error ?? payload.message ?? `음성 분석 실패 (${status})`);
  } catch {
    return `음성 분석 실패 (${status})`;
  }
}

type EdgeTextPayload = {
  text?: string;
  defaultDateKey?: string;
  audioBase64?: string;
  audioMime?: string;
  audioFileName?: string;
};

async function parseViaEdgeFunction(
  token: string,
  payload: EdgeTextPayload,
): Promise<VoiceParseResult> {
  const response = await fetch(VOICE_PARSE_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleParseResponse(response);
}

async function handleParseResponse(response: Response): Promise<VoiceParseResult> {
  let payload: { error?: string; schedule?: VoiceParseResult['schedule']; confidence?: number };
  try {
    payload = await response.json();
  } catch {
    throw new Error('음성 분석 서버 응답을 읽을 수 없습니다.');
  }

  if (!response.ok) {
    if (payload.error?.includes('OPENAI_API_KEY') || payload.error?.includes('text field')) {
      throw new Error('OPENAI_API_KEY 미설정: 텍스트 입력으로 일정을 등록해 주세요.');
    }
    throw new Error(formatVoiceApiError(payload.error ?? '음성 분석에 실패했습니다.'));
  }

  if (!payload.schedule) {
    throw new Error('음성 분석 결과가 비어 있습니다.');
  }

  return payload as VoiceParseResult;
}

function parseLocally(
  text: string,
  parseOptions?: ParseScheduleOptions,
  rawText?: string,
): VoiceParseResult {
  const parsed = parseKoreanScheduleText(text, parseOptions);
  return {
    schedule: {
      raw_text: rawText ?? text,
      parsed_content: parsed.parsed_content,
      target_timestamp: parsed.target_timestamp,
      location_info: parsed.location_info,
      contact_info: parsed.contact_info,
    },
    confidence: parsed.confidence,
  };
}

export async function saveParsedSchedule(
  result: VoiceParseResult,
  userId: string,
) {
  const { schedule, confidence } = result;

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      user_id: userId,
      raw_text: schedule.raw_text,
      parsed_content: schedule.parsed_content,
      target_timestamp: schedule.target_timestamp,
      location_info: schedule.location_info,
      contact_info: schedule.contact_info,
      confidence,
      status: 'pending',
      source: 'voice',
    })
    .select('*')
    .single();

  if (error) throw error;

  return data;
}
