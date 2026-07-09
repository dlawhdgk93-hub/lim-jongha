import type { ParsedContent, Schedule } from '../types/schedule';
import { getScheduleDateKey, getTodayKey } from './scheduleDates';

export function isAllDayContent(content: ParsedContent): boolean {
  return content.is_all_day === true;
}

export function isAllDaySchedule(schedule: Schedule): boolean {
  return isAllDayContent(schedule.parsed_content);
}

export function shouldScheduleAlarm(schedule: Schedule): boolean {
  if (isAllDaySchedule(schedule)) return false;
  if (!schedule.target_timestamp) return false;
  if (schedule.status !== 'pending' && schedule.status !== 'snoozed') return false;
  return true;
}

export function isIncompleteSchedule(schedule: Schedule, now = new Date()): boolean {
  if (schedule.status !== 'pending' && schedule.status !== 'snoozed') return false;
  if (!schedule.target_timestamp) return false;
  return getScheduleDateKey(schedule.target_timestamp) < getTodayKey(now);
}

export function filterIncompleteSchedules(schedules: Schedule[], now = new Date()): Schedule[] {
  return schedules
    .filter((s) => isIncompleteSchedule(s, now))
    .sort((a, b) => {
      const ta = a.target_timestamp ? new Date(a.target_timestamp).getTime() : 0;
      const tb = b.target_timestamp ? new Date(b.target_timestamp).getTime() : 0;
      return ta - tb;
    });
}
