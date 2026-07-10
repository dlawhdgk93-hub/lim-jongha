import type { Schedule } from '../types/schedule';
import { formatScheduleDate, formatScheduleTime } from './dateFormatter';
import { isAllDaySchedule } from './scheduleHelpers';

export type ScheduleSearchResult = {
  schedule: Schedule;
  dateLabel: string;
  fullName: string;
  matchedIn: string;
};

function scheduleSearchText(schedule: Schedule): string {
  const parts = [
    schedule.parsed_content.title,
    schedule.raw_text,
    schedule.parsed_content.notes,
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function formatScheduleFullName(schedule: Schedule): string {
  const title = schedule.parsed_content.title?.trim() || '일정';
  if (isAllDaySchedule(schedule)) {
    return `${title} (종일)`;
  }
  const time = schedule.parsed_content.time?.trim() || formatScheduleTime(schedule.target_timestamp);
  return `${title} · ${time}`;
}

export function searchSchedules(schedules: Schedule[], query: string): ScheduleSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return schedules
    .filter((schedule) => schedule.status !== 'cancelled')
    .map((schedule) => {
      const haystack = scheduleSearchText(schedule);
      if (!haystack.includes(normalized)) return null;

      const matchedIn =
        schedule.parsed_content.title?.toLowerCase().includes(normalized)
          ? '제목'
          : schedule.raw_text?.toLowerCase().includes(normalized)
            ? '원문'
            : '메모';

      return {
        schedule,
        dateLabel: formatScheduleDate(schedule.target_timestamp),
        fullName: formatScheduleFullName(schedule),
        matchedIn,
      };
    })
    .filter((item): item is ScheduleSearchResult => item !== null)
    .sort((a, b) => {
      const aTime = a.schedule.target_timestamp ?? '';
      const bTime = b.schedule.target_timestamp ?? '';
      return bTime.localeCompare(aTime);
    });
}
