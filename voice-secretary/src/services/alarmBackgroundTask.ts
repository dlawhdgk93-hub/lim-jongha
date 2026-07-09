import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { triggerAlarmFromPayload } from './alarmTrigger';

export const BACKGROUND_ALARM_TASK = 'TEAMDAY_BACKGROUND_ALARM';

TaskManager.defineTask(BACKGROUND_ALARM_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('background alarm task error:', error.message);
    return;
  }

  const notification = data as Notifications.Notification | undefined;
  const payload = notification?.request?.content?.data as Record<string, unknown> | undefined;
  await triggerAlarmFromPayload(payload);
});

export async function registerBackgroundAlarmTask() {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ALARM_TASK);
    if (!registered) {
      await Notifications.registerTaskAsync(BACKGROUND_ALARM_TASK);
    }
  } catch (err) {
    console.warn('registerBackgroundAlarmTask:', err);
  }
}
