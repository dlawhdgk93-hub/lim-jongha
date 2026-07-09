import type { Schedule } from '../types/schedule';
import { getScheduleDateKey } from '../utils/scheduleDates';

export type WidgetSchedulePayload = {
  schedules: Array<{
    dateKey: string;
    time: string;
    title: string;
    status: string;
  }>;
};

export function buildWidgetSchedulePayload(schedules: Schedule[]): WidgetSchedulePayload {
  return {
    schedules: schedules
      .filter((schedule) => schedule.status !== 'cancelled')
      .map((schedule) => ({
        dateKey: getScheduleDateKey(schedule.target_timestamp),
        time: schedule.parsed_content.is_all_day
          ? '종일'
          : schedule.parsed_content.time?.trim() || '--:--',
        title: schedule.parsed_content.title?.trim() || '일정',
        status: schedule.status,
      }))
      .filter((item) => item.dateKey !== 'unknown'),
  };
}
