import type { Schedule } from '../types/schedule';
import { filterIncompleteSchedules } from './scheduleHelpers';
import { formatKstDate } from './timeAdjust';

export type DateTab = {
  key: string;
  label: string;
  count: number;
};

export type CalendarCell = {
  dateKey: string | null;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

export function getCalendarCells(monthKey: string, now = new Date()): CalendarCell[] {
  const [y, m] = monthKey.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return [];

  const todayKey = getTodayKey(now);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push({ dateKey: null, day: 0, inMonth: false, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${y}-${pad(m)}-${pad(day)}`;
    cells.push({
      dateKey,
      day,
      inMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: 0, inMonth: false, isToday: false });
  }

  return cells;
}

export function groupSchedulesByDateKey(schedules: Schedule[]): Map<string, Schedule[]> {
  const map = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    const key = getScheduleDateKey(schedule.target_timestamp);
    if (key === 'unknown') continue;
    const list = map.get(key) ?? [];
    list.push(schedule);
    map.set(key, list);
  }
  for (const [key, list] of map) {
    list.sort((a, b) => {
      const ta = a.target_timestamp ? new Date(a.target_timestamp).getTime() : 0;
      const tb = b.target_timestamp ? new Date(b.target_timestamp).getTime() : 0;
      return ta - tb;
    });
    map.set(key, list);
  }
  return map;
}

export function getTodayKey(now = new Date()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getTomorrowKey(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return getTodayKey(d);
}

export function getYesterdayKey(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return getTodayKey(d);
}

export function getScheduleDateKey(isoString: string | null): string {
  if (!isoString) return 'unknown';
  return formatKstDate(new Date(isoString));
}

export function getMonthKey(isoString: string | null | Date): string {
  const date = isoString instanceof Date ? isoString : isoString ? new Date(isoString) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'all') return '전체 기간';
  const [y, m] = monthKey.split('-').map(Number);
  return `${y}년 ${m}월`;
}

export function dateKeyToDate(dateKey: string): Date | null {
  if (dateKey === 'all' || dateKey === 'unknown') return null;
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatDateTabLabel(dateKey: string): string {
  if (dateKey === 'all') return '전체';
  if (dateKey === 'incomplete') return '미완료';
  if (dateKey === 'calendar') return '달력';
  if (dateKey === 'unknown') return '날짜 미정';

  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;

  const [, m, d] = parts.map(Number);
  if (!Number.isFinite(m) || !Number.isFinite(d)) return dateKey;

  return `${m}/${d}`;
}

export const FIXED_DATE_TAB_KEYS = ['calendar', 'all', 'incomplete'] as const;

export function isFixedDateTabKey(dateKey: string): boolean {
  return (FIXED_DATE_TAB_KEYS as readonly string[]).includes(dateKey);
}

export function isScheduleDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

export function buildDateTabs(
  schedules: Schedule[],
  now = new Date(),
  _viewMonthKey?: string,
  allSchedules?: Schedule[],
): DateTab[] {
  const source = allSchedules ?? schedules;
  const counts = new Map<string, number>();

  for (const schedule of source) {
    const key = getScheduleDateKey(schedule.target_timestamp);
    if (key === 'unknown') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const dayTabs: DateTab[] = [...counts.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      key,
      label: formatDateTabLabel(key),
      count: counts.get(key) ?? 0,
    }));

  const incompleteCount = filterIncompleteSchedules(source, now).length;

  return [
    { key: 'calendar', label: '달력', count: schedules.length },
    { key: 'all', label: '전체', count: source.length },
    ...dayTabs,
    { key: 'incomplete', label: '미완료', count: incompleteCount },
  ];
}

export function buildAvailableMonths(schedules: Schedule[], now = new Date()): string[] {
  const months = new Set<string>([getMonthKey(now)]);
  for (const schedule of schedules) {
    if (schedule.target_timestamp) {
      months.add(getMonthKey(schedule.target_timestamp));
    }
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}

export function filterSchedulesByDate(schedules: Schedule[], dateKey: string, now = new Date()): Schedule[] {
  if (dateKey === 'all' || dateKey === 'calendar') return schedules;
  if (dateKey === 'incomplete') return filterIncompleteSchedules(schedules, now);
  return schedules.filter((s) => getScheduleDateKey(s.target_timestamp) === dateKey);
}

export function filterSchedulesByMonth(schedules: Schedule[], monthKey: string): Schedule[] {
  if (monthKey === 'all') return schedules;
  return schedules.filter((s) => s.target_timestamp && getMonthKey(s.target_timestamp) === monthKey);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getMonthKey(d);
}
