export function formatScheduleTime(
  isoString: string | null,
  options?: { isAllDay?: boolean },
): string {
  if (options?.isAllDay) return '종일';
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatScheduleDate(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '';
  return `${formatScheduleDate(isoString)} ${formatScheduleTime(isoString)}`;
}

export function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addMinutes(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
