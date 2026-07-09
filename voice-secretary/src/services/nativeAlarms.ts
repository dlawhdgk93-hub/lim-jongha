import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Schedule } from '../types/schedule';
import { isWeb } from '../utils/platform';

const FIRED_STORAGE_KEY = 'teamday_fired_alarms';

function alarmKey(scheduleId: string, targetTimestamp: string) {
  return `${scheduleId}:${targetTimestamp}`;
}

function canUseNativeAlarmStorage(): boolean {
  return !isWeb && Platform.OS !== 'web';
}

async function readFiredMap(): Promise<Record<string, string>> {
  if (!canUseNativeAlarmStorage()) return {};
  try {
    const raw = await AsyncStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeFiredMap(map: Record<string, string>) {
  if (!canUseNativeAlarmStorage()) return;
  try {
    await AsyncStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable — skip silently
  }
}

export async function wasNativeAlarmFired(
  scheduleId: string,
  targetTimestamp: string,
): Promise<boolean> {
  const map = await readFiredMap();
  return map[alarmKey(scheduleId, targetTimestamp)] === '1';
}

export async function markNativeAlarmFired(scheduleId: string, targetTimestamp: string) {
  const map = await readFiredMap();
  map[alarmKey(scheduleId, targetTimestamp)] = '1';
  await writeFiredMap(map);
}

export async function clearNativeAlarmFired(scheduleId: string) {
  if (!canUseNativeAlarmStorage()) return;
  const map = await readFiredMap();
  for (const key of Object.keys(map)) {
    if (key.startsWith(`${scheduleId}:`)) delete map[key];
  }
  await writeFiredMap(map);
}

export async function checkDueNativeAlarms(
  schedules: Schedule[],
  onAlarm: (schedule: Schedule) => void,
) {
  const now = Date.now();
  for (const schedule of schedules) {
    if (!schedule.target_timestamp) continue;
    if (schedule.parsed_content.is_all_day) continue;
    if (schedule.status !== 'pending' && schedule.status !== 'snoozed') continue;
    if (await wasNativeAlarmFired(schedule.id, schedule.target_timestamp)) continue;

    const dueMs = new Date(schedule.target_timestamp).getTime();
    if (dueMs <= now) {
      await markNativeAlarmFired(schedule.id, schedule.target_timestamp);
      onAlarm(schedule);
    }
  }
}

export function findScheduleByNotificationData(
  schedules: Schedule[],
  data: Record<string, unknown> | undefined,
): Schedule | null {
  if (!data?.scheduleId || typeof data.scheduleId !== 'string') return null;
  return schedules.find((s) => s.id === data.scheduleId) ?? null;
}
