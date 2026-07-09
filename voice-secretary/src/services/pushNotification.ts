import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web'
    ? require('./pushNotification.web')
    : require('./pushNotification.native');

export const cancelLocalNotifications: typeof import('./pushNotification.native').cancelLocalNotifications =
  impl.cancelLocalNotifications;
export const notifyScheduleShareReceived: typeof import('./pushNotification.native').notifyScheduleShareReceived =
  impl.notifyScheduleShareReceived;
export const registerForPushNotifications: typeof import('./pushNotification.native').registerForPushNotifications =
  impl.registerForPushNotifications;
export const requestNotificationPermission: typeof import('./pushNotification.native').requestNotificationPermission =
  impl.requestNotificationPermission;
export const rescheduleAllNotifications: typeof import('./pushNotification.native').rescheduleAllNotifications =
  impl.rescheduleAllNotifications;
export const scheduleLocalNotification: typeof import('./pushNotification.native').scheduleLocalNotification =
  impl.scheduleLocalNotification;
export const setupNotificationAlarmListeners: typeof import('./pushNotification.native').setupNotificationAlarmListeners =
  impl.setupNotificationAlarmListeners;
export const ensureExactAlarmPermission: typeof import('./pushNotification.native').ensureExactAlarmPermission =
  impl.ensureExactAlarmPermission;
