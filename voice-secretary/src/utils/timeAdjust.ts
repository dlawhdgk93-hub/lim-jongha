export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC instant → Asia/Seoul calendar date (YYYY-MM-DD) */
export function formatKstDate(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`;
}

/** UTC instant → Asia/Seoul clock time (HH:mm) */
export function formatKstTime(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;
}

export function shiftDateTimeFields(
  date: string,
  time: string,
  deltaMinutes: number,
): { date: string; time: string } {
  const base = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(base.getTime())) {
    return { date, time };
  }

  base.setMinutes(base.getMinutes() + deltaMinutes);
  return {
    date: `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`,
    time: `${pad2(base.getHours())}:${pad2(base.getMinutes())}`,
  };
}

export function buildIsoFromFields(date: string, time: string): string {
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

export function buildScheduleTimestamp(
  date: string,
  time: string,
  isAllDay = false,
): string {
  if (isAllDay || !time) {
    return new Date(`${date}T00:00:00+09:00`).toISOString();
  }
  return buildIsoFromFields(date, time);
}

export function formatKstWallTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function shiftKstDateKey(dateKey: string, dayDelta: number): string {
  const anchor = new Date(`${dateKey}T12:00:00+09:00`);
  anchor.setUTCDate(anchor.getUTCDate() + dayDelta);
  return formatKstDate(anchor);
}

export function resolveKstDateKey(
  now: Date,
  normalized: string,
  defaultDateKey?: string,
): string {
  const today = formatKstDate(now);
  if (/모레/.test(normalized)) return shiftKstDateKey(today, 2);
  if (/내일/.test(normalized)) return shiftKstDateKey(today, 1);
  if (/오늘/.test(normalized)) return today;
  if (/어제/.test(normalized)) return shiftKstDateKey(today, -1);
  if (defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)) return defaultDateKey;
  return today;
}

export function kstInstantMs(dateKey: string, hour: number, minute: number): number {
  return new Date(`${dateKey}T${pad2(hour)}:${pad2(minute)}:00+09:00`).getTime();
}
