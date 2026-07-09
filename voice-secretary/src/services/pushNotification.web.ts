import type { Schedule } from '../types/schedule';
import {
  cancelAllWebNotifications,
  canUseWebNotifications,
  requestWebNotificationPermission,
  scheduleWebNotification,
} from './webNotifications';

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await requestWebNotificationPermission();
  return result === 'granted';
}

export async function registerForPushNotifications(_userId: string) {
  // 웹 알림 권한은 사용자가 [알림 허용] 버튼을 눌렀을 때만 요청합니다.
  return null;
}

export async function scheduleLocalNotification(schedule: Schedule) {
  scheduleWebNotification(schedule);
}

export async function cancelLocalNotifications() {
  cancelAllWebNotifications();
}

export async function rescheduleAllNotifications(schedules: Schedule[]) {
  cancelAllWebNotifications();
  for (const schedule of schedules) {
    if (schedule.status !== 'pending' && schedule.status !== 'snoozed') continue;
    scheduleWebNotification(schedule);
  }
}

export function setupNotificationAlarmListeners(
  _getSchedules: () => Schedule[],
  _onAlarm: (schedule: Schedule) => void,
) {
  return () => undefined;
}

export async function notifyScheduleShareReceived(params: {
  title: string;
  fromEmail: string;
  scheduleId: string;
}) {
  if (!canUseWebNotifications() || typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification('📅 일정 공유', {
      body: `${params.fromEmail}님이 "${params.title}" 일정을 공유했습니다.`,
      tag: `share-${params.scheduleId}`,
    });
  } catch {
    // ignore
  }
}

export async function ensureExactAlarmPermission(): Promise<void> {
  // no-op on web
}
