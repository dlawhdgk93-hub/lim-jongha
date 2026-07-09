import {
  formatKstDate,
  kstInstantMs,
  shiftKstDateKey,
} from './timeAdjust';

const SINO: Record<string, number> = {
  영: 0,
  공: 0,
  일: 1,
  이: 2,
  삼: 3,
  세: 3,
  사: 4,
  오: 5,
  육: 6,
  여: 6,
  칠: 7,
  팔: 8,
  구: 9,
  십: 10,
};

const NATIVE: Record<string, number> = {
  하나: 1,
  한: 1,
  둘: 2,
  두: 2,
  셋: 3,
  넷: 4,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
};

const HOUR_WORDS: Record<string, number> = {
  열: 10,
  열한: 11,
  열두: 12,
  '열 한': 11,
  '열 두': 12,
};

const HOUR_PATTERN =
  '(?:열한|열두|다섯|여섯|일곱|여덟|아홉|열|두|세|네|한|일|이|삼|사|오|육|여|칠|팔|구|십|\\d{1,2})';

const MINUTE_PATTERN =
  '(?:오\\s*십|사\\s*십|삼\\s*십|이\\s*십|오십|사십|삼십|이십|십[오구]?|[1-5]\\s*십|50|40|30|20|[0-9일이삼세사오육칠팔구십]{1,4}|\\d{1,2})';
const KOREAN_TIME_REGEX = new RegExp(
  `(오전|오후)?\\s*(${HOUR_PATTERN})\\s*시(?:\\s*(${MINUTE_PATTERN})\\s*분)?`,
);

export type AlarmMode = 'sound' | 'vibrate' | 'both';

export type TimeParseContext = {
  now?: Date;
  baseDate?: Date;
  /** KST calendar date (YYYY-MM-DD) for wall-clock parsing */
  baseDateKey?: string;
};

function applyMeridiem(hour: number, meridiem?: '오전' | '오후'): number {
  if (meridiem === '오후' && hour < 12) return hour + 12;
  if (meridiem === '오전' && hour === 12) return 0;
  if (meridiem === '오후' && hour === 12) return 12;
  return hour;
}

/** 오전/오후 없을 때 문맥·한국어 관용으로 추정 */
function inferMeridiemFromText(
  text: string,
  _hour12: number,
): '오전' | '오후' | undefined {
  if (/아침|오전|새벽|조회|기상|아침식사|출근|도착/.test(text)) return '오전';
  if (/저녁|오후|밤|야간|점심|회식|저녁식사|퇴근/.test(text)) return '오후';
  return undefined;
}

/** 오전/오후 없을 때 현재 시각 기준 가장 가까운 미래 KST 시각 선택 */
export function resolveAmbiguousHour(
  hour12: number,
  minute: number,
  dateKey: string,
  now: Date = new Date(),
  text = '',
): { dateKey: string; hour: number; minute: number } {
  const inferred = inferMeridiemFromText(text, hour12);
  const h = hour12 > 12 ? hour12 % 12 || 12 : Math.max(1, Math.min(12, hour12));

  if (inferred) {
    const hour24 = applyMeridiem(h, inferred);
    let dk = dateKey;
    if (kstInstantMs(dk, hour24, minute) < now.getTime() - 60_000) {
      dk = shiftKstDateKey(dk, 1);
    }
    return { dateKey: dk, hour: hour24, minute };
  }

  const amHour = h === 12 ? 0 : h;
  const pmHour = h === 12 ? 12 : h + 12;
  const nowMs = now.getTime();
  const candidates = [
    { dateKey, hour: amHour, minute, ms: kstInstantMs(dateKey, amHour, minute) },
    { dateKey, hour: pmHour, minute, ms: kstInstantMs(dateKey, pmHour, minute) },
    {
      dateKey: shiftKstDateKey(dateKey, 1),
      hour: amHour,
      minute,
      ms: kstInstantMs(shiftKstDateKey(dateKey, 1), amHour, minute),
    },
    {
      dateKey: shiftKstDateKey(dateKey, 1),
      hour: pmHour,
      minute,
      ms: kstInstantMs(shiftKstDateKey(dateKey, 1), pmHour, minute),
    },
  ];
  const upcoming = candidates.filter((c) => c.ms >= nowMs - 60_000);
  upcoming.sort((a, b) => {
    const diff = a.ms - b.ms;
    if (diff === 0) return 0;
    if (a.dateKey === b.dateKey && Math.abs(diff) >= 11 * 3600_000) {
      if (h >= 1 && h <= 6) return b.ms - a.ms;
      if (h >= 7 && h <= 11) return a.ms - b.ms;
    }
    return diff;
  });
  const picked = upcoming[0] ?? candidates.sort((a, b) => a.ms - b.ms)[0];
  return { dateKey: picked.dateKey, hour: picked.hour, minute: picked.minute };
}

function resolveHour(
  hour12: number,
  minute: number,
  meridiem: '오전' | '오후' | undefined,
  context: TimeParseContext,
  sourceText = '',
): { dateKey: string; hour: number; minute: number } {
  const now = context.now ?? new Date();
  const dateKey =
    context.baseDateKey ??
    (context.baseDate ? formatKstDate(context.baseDate) : formatKstDate(now));
  const effectiveMeridiem =
    meridiem ??
    inferMeridiemFromText(
      sourceText,
      hour12 > 12 ? hour12 % 12 || 12 : Math.max(1, Math.min(12, hour12)),
    );
  if (effectiveMeridiem) {
    const h = hour12 > 12 ? hour12 % 12 || 12 : Math.max(1, Math.min(12, hour12));
    const hour24 = applyMeridiem(h, effectiveMeridiem);
    let dk = dateKey;
    if (kstInstantMs(dk, hour24, minute) < now.getTime() - 60_000) {
      dk = shiftKstDateKey(dk, 1);
    }
    return { dateKey: dk, hour: hour24, minute };
  }
  return resolveAmbiguousHour(hour12, minute, dateKey, now, sourceText);
}

/** STT가 "50분"을 "5 10분", "5 0분", "오 십분" 등으로 쪼개는 경우 보정 */
function normalizeMinuteTens(text: string): string {
  let next = text;

  // "2시 5 10분" (오십을 5+10으로 인식) → 50분
  next = next.replace(
    /(\d{1,2}\s*시)\s*([1-5])\s+10\s*분/g,
    (_, head, tens) => `${head} ${parseInt(tens, 10) * 10}분`,
  );

  // "2시 5 0분" / "2시 50 분" → 50분
  next = next.replace(/(\d{1,2}\s*시)\s*([1-5])\s+0\s*분/g, (_, head, tens) => {
    return `${head} ${parseInt(tens, 10) * 10}분`;
  });

  // "2시 5십분" / "2시 5 십분" → 50분
  next = next.replace(/(\d{1,2}\s*시)\s*([1-5])\s*십\s*분/g, (_, head, tens) => {
    return `${head} ${parseInt(tens, 10) * 10}분`;
  });

  const koreanTens: [RegExp, number][] = [
    [/(\d{1,2}\s*시)\s*오\s*십\s*분/g, 50],
    [/(\d{1,2}\s*시)\s*사\s*십\s*분/g, 40],
    [/(\d{1,2}\s*시)\s*삼\s*십\s*분/g, 30],
    [/(\d{1,2}\s*시)\s*이\s*십\s*분/g, 20],
    [/(\d{1,2}\s*시)\s*오\s*십분/g, 50],
    [/(\d{1,2}\s*시)\s*오십\s*분/g, 50],
    [/(\d{1,2}\s*시)\s*오십분/g, 50],
  ];
  for (const [pattern, minute] of koreanTens) {
    next = next.replace(pattern, `$1 ${minute}분`);
  }

  return next;
}

/** 음성 인식(STT) 오인식 보정 + 한글 숫자 정규화 */
export function normalizeKoreanSpeechText(input: string): string {
  let text = input.trim().replace(/\s+/g, ' ');

  text = text.replace(/([0-9이삼사세오육칠팔구열])\s*co\b/gi, '$1시');
  text = text.replace(/([0-9이삼사세오육칠팔구])seo\b/gi, '$1시');
  text = text.replace(/\bco\b/gi, '시');
  text = text.replace(/([0-9가-힣])\s+시\b/g, '$1시');
  text = text.replace(/(\d{1,2})시(\d{1,2})분/g, '$1시 $2분');
  text = text.replace(/(\d{1,2})\s*시\s*에\b/g, '$1시에');
  text = text.replace(/\b일\s*시\b/g, '1시');
  // "두시" → "2시" (STT가 한글 숫자로 줄 때)
  text = text.replace(/\b두\s*시\b/g, '2시');
  text = text.replace(/\b세\s*시\b/g, '3시');
  text = text.replace(/\b네\s*시\b/g, '4시');
  text = text.replace(/\b다섯\s*시\b/g, '5시');
  text = text.replace(/\b여섯\s*시\b/g, '6시');
  text = text.replace(/\b일곱\s*시\b/g, '7시');
  text = text.replace(/\b여덟\s*시\b/g, '8시');
  text = text.replace(/\b아홉\s*시\b/g, '9시');

  text = normalizeMinuteTens(text);

  // "2시 분" (분 앞 숫자 없음) → "2시 0분"
  text = text.replace(/(\S+시)\s+분(\s|$)/g, '$1 0분$2');
  text = text.replace(/(\S+시)\s*반/g, '$1 30분');

  text = text.replace(
    /시\s+(일|이|삼|사|오|육|여|칠|팔|구|십|[0-9]{1,2})\s*분/g,
    (match, minuteToken) => {
      const minute = parseKoreanNumberToken(String(minuteToken));
      if (minute == null) return match;
      return `시 ${minute}분`;
    },
  );

  return text;
}

export function parseKoreanNumberToken(token: string): number | null {
  const word = token.replace(/[^0-9가-힣]/g, '').trim();
  if (!word) return null;
  if (/^\d+$/.test(word)) return parseInt(word, 10);

  if (HOUR_WORDS[word] != null) return HOUR_WORDS[word];
  if (NATIVE[word] != null) return NATIVE[word];

  if (word.includes('십')) {
    const [tenPart, onePart = ''] = word.split('십');
    const tens =
      tenPart === ''
        ? 1
        : (/^\d+$/.test(tenPart) ? parseInt(tenPart, 10) : (SINO[tenPart] ?? NATIVE[tenPart])) ??
          null;
    const ones =
      onePart === ''
        ? 0
        : (/^\d+$/.test(onePart) ? parseInt(onePart, 10) : (SINO[onePart] ?? NATIVE[onePart])) ??
          null;
    if (tens == null || ones == null) return null;
    return tens * 10 + ones;
  }

  if (word.length === 2 && SINO[word[0]] != null && SINO[word[1]] != null) {
    return SINO[word[0]] * 10 + SINO[word[1]];
  }

  return SINO[word] ?? NATIVE[word] ?? null;
}

export function parseKoreanTimeExpression(
  text: string,
  context: TimeParseContext = {},
): {
  hour: number;
  minute: number;
  dateKey?: string;
  meridiem?: '오전' | '오후';
  matched: string;
} | null {
  const normalized = normalizeKoreanSpeechText(text);

  const colonMatch = normalized.match(/(오전|오후)?\s*(\d{1,2})\s*:\s*(\d{1,2})/);
  if (colonMatch) {
    const meridiem = colonMatch[1] as '오전' | '오후' | undefined;
    const minute = parseInt(colonMatch[3], 10);
    const resolved = resolveHour(parseInt(colonMatch[2], 10), minute, meridiem, context, normalized);
    if (minute >= 0 && minute <= 59) {
      return { ...resolved, meridiem, matched: colonMatch[0] };
    }
  }

  const splitTensMatch = normalized.match(
    /(오전|오후)?\s*(\d{1,2})\s*시\s*([1-5])\s+(?:0|10)\s*분/,
  );
  if (splitTensMatch) {
    const meridiem = splitTensMatch[1] as '오전' | '오후' | undefined;
    const minute = parseInt(splitTensMatch[3], 10) * 10;
    const resolved = resolveHour(parseInt(splitTensMatch[2], 10), minute, meridiem, context, normalized);
    return { ...resolved, meridiem, matched: splitTensMatch[0] };
  }

  const digitMatch = normalized.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*에)?(?:\s*(\d{1,2})\s*분)?/);
  if (digitMatch) {
    const meridiem = digitMatch[1] as '오전' | '오후' | undefined;
    const minute = digitMatch[3] ? parseInt(digitMatch[3], 10) : 0;
    const resolved = resolveHour(parseInt(digitMatch[2], 10), minute, meridiem, context, normalized);
    if (minute >= 0 && minute <= 59) {
      return { ...resolved, meridiem, matched: digitMatch[0] };
    }
  }
  const koreanMatch = normalized.match(KOREAN_TIME_REGEX);
  if (koreanMatch) {
    const meridiem = koreanMatch[1] as '오전' | '오후' | undefined;
    const hourVal = parseKoreanNumberToken(koreanMatch[2]);
    if (hourVal == null || hourVal < 0 || hourVal > 23) return null;
    const minute = koreanMatch[3] ? (parseKoreanNumberToken(koreanMatch[3]) ?? 0) : 0;
    const resolved = resolveHour(hourVal, minute, meridiem, context, normalized);
    return { ...resolved, meridiem, matched: koreanMatch[0] };
  }

  return null;
}

const RELATIVE_NUMBER = '(?:\\d+|[한두세네다섯여섯일곱여덟아홉십]+)';

/** "30분 뒤", "1시간 후", "반시간 뒤" 등 상대 시각 */
export function parseRelativeTimeOffset(
  text: string,
): { offsetMs: number; matched: string } | null {
  const normalized = normalizeKoreanSpeechText(text);

  const halfHour = normalized.match(/반\s*시간\s*(?:뒤|후|뒤에)/);
  if (halfHour) {
    return { offsetMs: 30 * 60_000, matched: halfHour[0] };
  }

  const minLater = normalized.match(
    new RegExp(`(${RELATIVE_NUMBER})\\s*분\\s*(?:뒤|후|뒤에|이후)`),
  );
  if (minLater) {
    const minutes = parseKoreanNumberToken(minLater[1]);
    if (minutes != null && minutes > 0 && minutes <= 24 * 60) {
      return { offsetMs: minutes * 60_000, matched: minLater[0] };
    }
  }

  const hourLater = normalized.match(
    new RegExp(`(${RELATIVE_NUMBER})\\s*시간\\s*(?:반)?\\s*(?:뒤|후|뒤에|이후)?`),
  );
  if (hourLater) {
    const hours = parseKoreanNumberToken(hourLater[1]);
    if (hours != null && hours > 0 && hours <= 48) {
      const hasHalf = /반/.test(hourLater[0]);
      return { offsetMs: (hours * 60 + (hasHalf ? 30 : 0)) * 60_000, matched: hourLater[0] };
    }
  }

  const soon = normalized.match(/(?:곧|잠시\s*후|조금\s*뒤|이따)/);
  if (soon) {
    return { offsetMs: 5 * 60_000, matched: soon[0] };
  }

  return null;
}

export { KOREAN_TIME_REGEX };
