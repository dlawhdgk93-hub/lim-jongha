import type { Schedule } from '../types/schedule';
import { formatKstDate, formatKstTime } from './timeAdjust';

export function extractDateTimeFromSchedule(data: Schedule) {
  const fromContent = {
    title: data.parsed_content.title ?? '',
    date: data.parsed_content.date ?? '',
    time: data.parsed_content.time ?? '',
    notes: data.parsed_content.notes ?? '',
  };

  if (fromContent.date && fromContent.time) return fromContent;

  if (data.target_timestamp) {
    const d = new Date(data.target_timestamp);
    return {
      ...fromContent,
      date: formatKstDate(d),
      time: formatKstTime(d),
    };
  }

  return fromContent;
}

export function buildTimestampFromFields(date: string, time: string): string | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}
