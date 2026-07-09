import { Platform } from 'react-native';

export { buildWidgetSchedulePayload } from './widgetSyncPayload';
export type { WidgetSchedulePayload } from './widgetSyncPayload';

const impl =
  Platform.OS === 'web' ? require('./widgetSync.web') : require('./widgetSync.native');

export const syncSchedulesToWidget: typeof import('./widgetSync.native').syncSchedulesToWidget =
  impl.syncSchedulesToWidget;
