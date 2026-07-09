import { NativeModules } from 'react-native';
import type { Schedule } from '../types/schedule';
import { buildWidgetSchedulePayload } from './widgetSyncPayload';

type WidgetSyncModuleType = {
  syncSchedules: (json: string) => Promise<boolean>;
};

const WidgetSyncModule = NativeModules.WidgetSyncModule as WidgetSyncModuleType | undefined;

export async function syncSchedulesToWidget(schedules: Schedule[]): Promise<void> {
  if (!WidgetSyncModule?.syncSchedules) return;

  const payload = buildWidgetSchedulePayload(schedules);
  try {
    await WidgetSyncModule.syncSchedules(JSON.stringify(payload));
  } catch {
    // 위젯 동기화 실패는 앱 사용에 영향 없음
  }
}
