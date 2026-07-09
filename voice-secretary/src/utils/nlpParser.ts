import type { ContactInfo } from '../types/schedule';
import {
  KOREAN_TIME_REGEX,
  normalizeKoreanSpeechText,
  parseKoreanTimeExpression,
  parseRelativeTimeOffset,
} from './koreanSpeechNormalize';
import { dateKeyToDate } from './scheduleDates';
import {
  buildScheduleTimestamp,
  formatKstDate,
  formatKstTime,
  formatKstWallTime,
  resolveKstDateKey,
} from './timeAdjust';
import { debugLog } from './debugLog';

type ParsedSchedule = {
  parsed_content: {
    title: string;
    date: string;
    time: string;
    notes?: string;
    is_all_day?: boolean;
  };
  target_timestamp: string;
  contact_info: ContactInfo | null;
  location_info: null;
  confidence: number;
};

export type ParseScheduleOptions = {
  now?: Date;
  /** 선택된 날짜 탭(YYYY-MM-DD). 말에 날짜가 없으면 이 날짜 사용 */
  defaultDateKey?: string;
};

function detectAllDay(normalized: string, hasExplicitTime: boolean): boolean {
  if (/종일|하루\s*종일|종일로/.test(normalized)) return true;
  if (hasExplicitTime) return false;
  if (/알람\s*없|시간\s*(?:까지\s*)?(?:는\s*)?(?:필요\s*)?(?:없|안)|당일\s*(?:만|로)?/.test(normalized)) {
    return true;
  }
  return false;
}

function stripScheduleTokens(normalized: string): string {
  return normalized
    .replace(/모레|내일|오늘|어제/g, ' ')
    .replace(/(\d+|[한두세네다섯여섯일곱여덟아홉십]+)\s*분\s*(?:뒤|후|뒤에|이후)/g, ' ')
    .replace(/(\d+|[한두세네다섯여섯일곱여덟아홉십]+)\s*시간\s*(?:반)?\s*(?:뒤|후|뒤에|이후)?/g, ' ')
    .replace(/반\s*시간\s*(?:뒤|후|뒤에)/g, ' ')
    .replace(/(?:곧|잠시\s*후|조금\s*뒤|이따)/g, ' ')
    .replace(/종일|하루\s*종일|종일로/g, ' ')
    .replace(/알람\s*없|시간\s*(?:까지\s*)?(?:는\s*)?(?:필요\s*)?(?:없|안)/g, ' ')
    .replace(/(오전|오후)?\s*(\d{1,2})\s*:\s*(\d{1,2})\s*에/g, ' ')
    .replace(/(오전|오후)?\s*(\d{1,2})\s*:\s*(\d{1,2})/g, ' ')
    .replace(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\s*에/g, ' ')
    .replace(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/g, ' ')
    .replace(KOREAN_TIME_REGEX, ' ')
    .replace(/^\s*에\s+/g, '')
    .replace(/\s+에\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseKoreanScheduleText(
  text: string,
  options: ParseScheduleOptions = {},
): ParsedSchedule {
  const now = options.now ?? new Date();
  const normalized = normalizeKoreanSpeechText(text);
  const relativeOffset = parseRelativeTimeOffset(normalized);

  if (relativeOffset) {
    const target = new Date(now.getTime() + relativeOffset.offsetMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    let title = stripScheduleTokens(normalized);
    if (!title) title = '알림';

    const phoneMatch = normalized.match(/(01[0-9]-?\d{3,4}-?\d{4})/);
    const contactNameMatch = title.match(/^([가-힣]{2,4})(?:\s|$)/);
    const date = formatKstDate(target);
    const time = formatKstTime(target);

    return {
      parsed_content: {
        title,
        date,
        time,
      },
      target_timestamp: buildScheduleTimestamp(date, time, false),
      contact_info:
        contactNameMatch || phoneMatch
          ? {
              name: contactNameMatch?.[1] ?? null,
              phone: phoneMatch?.[1] ?? null,
              email: null,
            }
          : null,
      location_info: null,
      confidence: 0.88,
    };
  }

  const dateKey = resolveKstDateKey(now, normalized, options.defaultDateKey);

  const timeResult = parseKoreanTimeExpression(normalized, {
    now,
    baseDateKey: dateKey,
  });
  // #region agent log
  debugLog(
    'nlpParser.ts:timeResult',
    'parsed time expression',
    {
      text: text.slice(0, 80),
      normalized: normalized.slice(0, 80),
      timeResult,
      dateKey,
      nowIso: now.toISOString(),
      tzOffsetMin: now.getTimezoneOffset(),
    },
    'H3',
  );
  // #endregion

  const isAllDay = detectAllDay(normalized, !!timeResult);

  let localDate = dateKey;
  let localTime = '';

  if (timeResult && !isAllDay) {
    localDate = timeResult.dateKey ?? dateKey;
    localTime = formatKstWallTime(timeResult.hour, timeResult.minute);
  } else if (isAllDay) {
    localTime = '';
  } else {
    const fallback = new Date(now.getTime() + 5 * 60_000);
    localDate = formatKstDate(fallback);
    localTime = formatKstTime(fallback);
  }

  let title = stripScheduleTokens(normalized);
  if (!title) title = '새 일정';

  const phoneMatch = normalized.match(/(01[0-9]-?\d{3,4}-?\d{4})/);
  const contactNameMatch = title.match(/^([가-힣]{2,4})(?:\s|$)/);

  const result = {
    parsed_content: {
      title,
      date: localDate,
      time: isAllDay ? '' : localTime,
      is_all_day: isAllDay || undefined,
    },
    target_timestamp: buildScheduleTimestamp(localDate, isAllDay ? '' : localTime, isAllDay),
    contact_info:
      contactNameMatch || phoneMatch
        ? {
            name: contactNameMatch?.[1] ?? null,
            phone: phoneMatch?.[1] ?? null,
            email: null,
          }
        : null,
    location_info: null,
    confidence: timeResult || isAllDay ? 0.85 : 0.7,
  };
  // #region agent log
  debugLog(
    'nlpParser.ts:result',
    'final local parse result',
    {
      title,
      date: localDate,
      time: isAllDay ? '' : localTime,
      target_timestamp: result.target_timestamp,
      kstWallClock: timeResult && !isAllDay ? `${localDate} ${localTime}` : null,
    },
    'H4',
  );
  // #endregion

  return result;
}

export function getRecordingDateHint(dateKey: string): string | null {
  if (dateKey === 'all' || dateKey === 'incomplete') return null;
  const d = dateKeyToDate(dateKey);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '오늘 날짜로 기록됩니다';
  if (diff === 1) return '내일 날짜로 기록됩니다';
  return `${d.getMonth() + 1}월 ${d.getDate()}일로 기록됩니다`;
}
