import { Platform } from 'react-native';
import type { Schedule } from '../types/schedule';
import { shouldScheduleAlarm } from '../utils/scheduleHelpers';
import { getAlarmModeFromSchedule } from '../constants/alarmModes';
import { getAlarmSoundId } from '../store/alarmSoundStore';
import { startAlarmSound } from './alarmSound';
import { isWeb } from '../utils/platform';

const FIRED_STORAGE_KEY = 'voice_secretary_fired_alarms';
const timers = new Map<string, ReturnType<typeof setTimeout>>();

type AlarmPayload = {
  scheduleId: string;
  targetTimestamp: string;
  title: string;
};

let onAlarmCallback: ((schedule: Schedule) => void) | null = null;

export function setWebAlarmHandler(handler: ((schedule: Schedule) => void) | null) {
  onAlarmCallback = handler;
}

function readFiredMap(): Record<string, string> {
  if (!isWeb || typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(window.localStorage.getItem(FIRED_STORAGE_KEY) ?? '{}') as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function writeFiredMap(map: Record<string, string>) {
  if (!isWeb || typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
    return;
  }
  window.localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(map));
}

function alarmKey(scheduleId: string, targetTimestamp: string) {
  return `${scheduleId}:${targetTimestamp}`;
}

export function wasAlarmFired(scheduleId: string, targetTimestamp: string): boolean {
  const map = readFiredMap();
  return map[alarmKey(scheduleId, targetTimestamp)] === '1';
}

export function markAlarmFired(scheduleId: string, targetTimestamp: string) {
  const map = readFiredMap();
  map[alarmKey(scheduleId, targetTimestamp)] = '1';
  writeFiredMap(map);
}

export function clearAlarmFired(scheduleId: string) {
  const map = readFiredMap();
  for (const key of Object.keys(map)) {
    if (key.startsWith(`${scheduleId}:`)) delete map[key];
  }
  writeFiredMap(map);
}

export function isSecureNotificationContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
}

export function canUseWebNotifications(): boolean {
  return isWeb && typeof window !== 'undefined' && 'Notification' in window && isSecureNotificationContext();
}

export type WebNotificationPermissionResult =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported'
  | 'insecure';

export async function requestWebNotificationPermission(): Promise<WebNotificationPermissionResult> {
  if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (!isSecureNotificationContext()) return 'insecure';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export function showWebNotificationTest(): boolean {
  if (!canUseWebNotifications() || Notification.permission !== 'granted') return false;

  try {
    new Notification('팀데이', {
      body: '알림이 켜졌습니다. 일정 시간에 알려드릴게요.',
      tag: 'voice-secretary-test',
    });
    return true;
  } catch {
    return false;
  }
}

function showBrowserNotification(payload: AlarmPayload) {
  if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification('팀데이 알림', {
      body: payload.title,
      tag: payload.scheduleId,
      requireInteraction: true,
    });
  } catch {
    // ignore
  }
}

function triggerAlarm(schedule: Schedule) {
  if (!shouldScheduleAlarm(schedule) || !schedule.target_timestamp) return;
  if (wasAlarmFired(schedule.id, schedule.target_timestamp)) return;

  markAlarmFired(schedule.id, schedule.target_timestamp);
  void startAlarmSound(getAlarmSoundId(), getAlarmModeFromSchedule(schedule.parsed_content));
  showBrowserNotification({
    scheduleId: schedule.id,
    targetTimestamp: schedule.target_timestamp,
    title: schedule.parsed_content.title,
  });
  onAlarmCallback?.(schedule);
}

function clearTimer(scheduleId: string) {
  const existing = timers.get(scheduleId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(scheduleId);
  }
}

export function scheduleWebNotification(schedule: Schedule) {
  if (!isWeb || !shouldScheduleAlarm(schedule) || !schedule.target_timestamp) return;

  clearTimer(schedule.id);

  const triggerMs = new Date(schedule.target_timestamp).getTime();
  const delay = triggerMs - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    triggerAlarm(schedule);
    timers.delete(schedule.id);
  }, Math.min(delay, 2147483647));

  timers.set(schedule.id, timer);
}

export function cancelAllWebNotifications() {
  for (const scheduleId of timers.keys()) {
    clearTimer(scheduleId);
  }
}

export function rescheduleAllWebNotifications(schedules: Schedule[]) {
  cancelAllWebNotifications();
  for (const schedule of schedules) {
    if (schedule.status !== 'pending' && schedule.status !== 'snoozed') continue;
    scheduleWebNotification(schedule);
  }
}

export function checkDueWebAlarms(schedules: Schedule[]) {
  if (!isWeb) return;

  const now = Date.now();
  for (const schedule of schedules) {
    if (!schedule.target_timestamp) continue;
    if (schedule.status !== 'pending' && schedule.status !== 'snoozed') continue;
    if (wasAlarmFired(schedule.id, schedule.target_timestamp)) continue;

    const dueMs = new Date(schedule.target_timestamp).getTime();
    if (dueMs <= now) {
      triggerAlarm(schedule);
    }
  }
}

export function getWebNotificationStatus(): 'unsupported' | 'granted' | 'denied' | 'default' | 'insecure' {
  if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (!isSecureNotificationContext()) return 'insecure';
  return Notification.permission;
}

export function getWebNotificationHint(): string {
  const status = getWebNotificationStatus();
  if (status === 'unsupported') {
    return Platform.OS === 'web'
      ? '이 브라우저는 알림을 지원하지 않습니다.'
      : '앱에서 알림을 사용할 수 있습니다.';
  }
  if (status === 'insecure') {
    return '알림은 https 또는 localhost에서만 가능합니다. http://localhost:8081 로 접속해 주세요.';
  }
  if (status === 'denied') {
    return '알림이 차단되어 있습니다. 주소창 왼쪽 자물쇠(🔒) → 사이트 설정 → 알림 허용';
  }
  if (status === 'default') {
    return '일정 시간에 알림을 받으려면 아래 [알림 허용]을 눌러 주세요.';
  }
  return '일정 시간에 브라우저 알림과 소리로 알려드립니다. (탭이 열려 있어야 합니다)';
}
