import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAlarmModeFromSchedule } from '../constants/alarmModes';
import type { AlarmSoundId } from '../constants/alarmSounds';
import { registerBackgroundAlarmTask } from './alarmBackgroundTask';
import { markNativeAlarmFired } from './nativeAlarms';
import { supabase } from './supabase';
import { getAlarmSoundId } from '../store/alarmSoundStore';
import type { Schedule } from '../types/schedule';
import { shouldScheduleAlarm } from '../utils/scheduleHelpers';

const PUSH_TOKEN_TIMEOUT_MS = 8000;
export const ALARM_CHANNEL_ID = 'teamday-alarms';
const SHARE_CHANNEL_ID = 'schedule-shares';
const EXACT_ALARM_PROMPTED_KEY = 'voice_secretary_exact_alarm_prompted';
/** Android res/raw — must match app.json expo-notifications sounds */
const ANDROID_ALARM_SOUND = 'teamday_alarm';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

function getAndroidPackage(): string {
  return Constants.expoConfig?.android?.package ?? 'com.voicesecretary.app';
}

export async function ensureExactAlarmPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;

  const alreadyPrompted = await AsyncStorage.getItem(EXACT_ALARM_PROMPTED_KEY);
  if (alreadyPrompted === 'true') return;

  try {
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', {
      data: `package:${getAndroidPackage()}`,
    });
  } catch {
    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
        data: `package:${getAndroidPackage()}`,
      });
    } catch {
      // ignore
    }
  } finally {
    await AsyncStorage.setItem(EXACT_ALARM_PROMPTED_KEY, 'true');
  }
}

async function ensureAlarmChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: '일정 알람',
    description: '일정 시간에 울리는 알람',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500, 800],
    sound: ANDROID_ALARM_SOUND,
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

async function setupNotificationInfrastructure() {
  await ensureAlarmChannel();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SHARE_CHANNEL_ID, {
      name: '일정 공유',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await registerBackgroundAlarmTask();
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus === 'granted') {
    await setupNotificationInfrastructure();
    await ensureExactAlarmPermission();
  }

  return finalStatus === 'granted';
}

async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('push token: missing EAS projectId');
    return null;
  }

  try {
    const tokenPromise = Notifications.getExpoPushTokenAsync({ projectId });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('push token timeout')), PUSH_TOKEN_TIMEOUT_MS),
    );
    const tokenData = await Promise.race([tokenPromise, timeoutPromise]);
    return tokenData.data;
  } catch (error) {
    console.warn('push token fetch failed (local notifications still work):', error);
    return null;
  }
}

export async function registerForPushNotifications(userId: string) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  await setupNotificationInfrastructure();
  if (!Device.isDevice) return null;

  const token = await fetchExpoPushToken();
  if (!token) return null;

  await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);

  const { error } = await supabase.from('push_tokens').insert({
    user_id: userId,
    expo_push_token: token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    updated_at: new Date().toISOString(),
  });

  if (error && !error.message.includes('duplicate')) {
    console.warn('push token insert:', error.message);
  }

  return token;
}

function notificationIdentifier(scheduleId: string) {
  return `schedule-${scheduleId}`;
}

export async function scheduleLocalNotification(schedule: Schedule) {
  if (!shouldScheduleAlarm(schedule) || !schedule.target_timestamp) return;

  const triggerDate = new Date(schedule.target_timestamp);
  if (triggerDate.getTime() <= Date.now()) return;

  await ensureAlarmChannel();

  const alarmMode = getAlarmModeFromSchedule(schedule.parsed_content);
  const useVibrate = alarmMode === 'vibrate' || alarmMode === 'both';
  const alarmSoundId: AlarmSoundId = getAlarmSoundId();

  await Notifications.scheduleNotificationAsync({
    identifier: notificationIdentifier(schedule.id),
    content: {
      title: '⏰ 팀데이 일정',
      body: schedule.parsed_content.title,
      subtitle: schedule.parsed_content.notes,
      data: {
        scheduleId: schedule.id,
        targetTimestamp: schedule.target_timestamp,
        alarmMode,
        alarmSoundId,
      },
      sound: undefined,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: useVibrate ? [0, 500, 200, 500, 200, 500, 800] : undefined,
      sticky: Platform.OS === 'android',
      autoDismiss: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: ALARM_CHANNEL_ID,
    },
  });
}

export async function cancelLocalNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function rescheduleAllNotifications(schedules: Schedule[]) {
  await ensureAlarmChannel();
  await registerBackgroundAlarmTask();

  const pending = schedules.filter(shouldScheduleAlarm);
  const neededIds = new Set(pending.map((s) => notificationIdentifier(s.id)));

  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of existing) {
      if (notification.identifier.startsWith('schedule-') && !neededIds.has(notification.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  for (const schedule of pending) {
    try {
      await scheduleLocalNotification(schedule);
    } catch (err) {
      console.warn('schedule notification failed:', schedule.id, err);
    }
  }
}

export function setupNotificationAlarmListeners(
  getSchedules: () => Schedule[],
  onAlarm: (schedule: Schedule) => void,
) {
  const handleNotification = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const scheduleId = typeof data?.scheduleId === 'string' ? data.scheduleId : null;
    if (!scheduleId) return;

    const schedule = getSchedules().find((s) => s.id === scheduleId);
    if (!schedule?.target_timestamp) return;

    void markNativeAlarmFired(schedule.id, schedule.target_timestamp);
    onAlarm(schedule);
  };

  const received = Notifications.addNotificationReceivedListener(handleNotification);
  const response = Notifications.addNotificationResponseReceivedListener((event) => {
    handleNotification(event.notification);
  });

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotification(response.notification);
  });

  return () => {
    received.remove();
    response.remove();
  };
}

export async function notifyScheduleShareReceived(params: {
  title: string;
  fromEmail: string;
  scheduleId: string;
}) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SHARE_CHANNEL_ID, {
      name: '일정 공유',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📅 일정 공유',
      body: `${params.fromEmail}님이 "${params.title}" 일정을 공유했습니다.`,
      data: {
        type: 'schedule_share',
        scheduleId: params.scheduleId,
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: Platform.OS === 'android' ? { channelId: SHARE_CHANNEL_ID } : null,
  });
}
