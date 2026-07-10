import { NativeModules } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants/config';
import type { Schedule } from '../types/schedule';
import { supabase } from './supabase';
import { buildWidgetSchedulePayload } from './widgetSyncPayload';

type WidgetSyncModuleType = {
  syncSchedules: (json: string) => Promise<boolean>;
  syncAuth?: (accessToken: string, supabaseUrl: string, anonKey: string) => Promise<boolean>;
};

const WidgetSyncModule = NativeModules.WidgetSyncModule as WidgetSyncModuleType | undefined;

async function syncWidgetAuth(): Promise<void> {
  if (!WidgetSyncModule?.syncAuth) return;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? '';
  if (!accessToken) return;

  try {
    await WidgetSyncModule.syncAuth(accessToken, SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    // 위젯 인증 동기화 실패는 앱 사용에 영향 없음
  }
}

export async function syncSchedulesToWidget(schedules: Schedule[]): Promise<void> {
  if (!WidgetSyncModule?.syncSchedules) return;

  const payload = buildWidgetSchedulePayload(schedules);
  try {
    await syncWidgetAuth();
    await WidgetSyncModule.syncSchedules(JSON.stringify(payload));
  } catch {
    // 위젯 동기화 실패는 앱 사용에 영향 없음
  }
}
