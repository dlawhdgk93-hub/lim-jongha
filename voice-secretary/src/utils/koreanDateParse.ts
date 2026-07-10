import { formatKstDate, pad2 } from './timeAdjust';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function isValidDateKey(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(`${year}-${pad2(month)}-${pad2(day)}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  if (kst.getUTCMonth() + 1 !== month || kst.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function inferYearForMonthDay(
  month: number,
  day: number,
  now: Date,
): number {
  const todayKey = formatKstDate(now);
  const [year, todayMonth, todayDay] = todayKey.split('-').map(Number);
  if (month < todayMonth || (month === todayMonth && day < todayDay)) {
    return year + 1;
  }
  return year;
}

/** M월 D일, YYYY-MM-DD, M/D 등 명시적 달력 날짜 → YYYY-MM-DD (KST) */
export function parseKoreanCalendarDate(text: string, now = new Date()): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();

  const fullDate = normalized.match(
    /(\d{4})\s*(?:년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
  );
  if (fullDate) {
    return isValidDateKey(
      parseInt(fullDate[1], 10),
      parseInt(fullDate[2], 10),
      parseInt(fullDate[3], 10),
    );
  }

  const isoLike = normalized.match(
    /(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})/,
  );
  if (isoLike) {
    return isValidDateKey(
      parseInt(isoLike[1], 10),
      parseInt(isoLike[2], 10),
      parseInt(isoLike[3], 10),
    );
  }

  const monthDay = normalized.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (monthDay) {
    const month = parseInt(monthDay[1], 10);
    const day = parseInt(monthDay[2], 10);
    const year = inferYearForMonthDay(month, day, now);
    return isValidDateKey(year, month, day);
  }

  const slashDate = normalized.match(/(?:^|[^\d])(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*일)?(?=\s|[^0-9]|$)/);
  if (slashDate) {
    const month = parseInt(slashDate[1], 10);
    const day = parseInt(slashDate[2], 10);
    if (month >= 1 && month <= 12) {
      const year = inferYearForMonthDay(month, day, now);
      return isValidDateKey(year, month, day);
    }
  }

  return null;
}

export function hasExplicitCalendarDate(text: string, now = new Date()): boolean {
  return parseKoreanCalendarDate(text, now) !== null;
}

/** 제목 추출 시 달력 날짜 토큰 제거 */
export function stripCalendarDateTokens(text: string): string {
  return text
    .replace(/\d{4}\s*(?:년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일/g, ' ')
    .replace(/\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}/g, ' ')
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일/g, ' ')
    .replace(/(?:^|\s)\d{1,2}\s*[/\-.]\s*\d{1,2}(?:\s*일)?(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
