import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { Schedule } from '../types/schedule';
import { checkDueNativeAlarms } from '../services/nativeAlarms';
import {
  checkDueWebAlarms,
  rescheduleAllWebNotifications,
  setWebAlarmHandler,
} from '../services/webNotifications';
import { isWeb } from '../utils/platform';

export function useScheduleAlarms(
  schedules: Schedule[],
  onAlarm?: (schedule: Schedule) => void,
) {
  useEffect(() => {
    if (isWeb) {
      setWebAlarmHandler(onAlarm ?? null);

      const timer = setTimeout(() => {
        rescheduleAllWebNotifications(schedules);
        checkDueWebAlarms(schedules);
      }, 0);

      const interval = setInterval(() => {
        checkDueWebAlarms(schedules);
      }, 15000);

      const onFocus = () => checkDueWebAlarms(schedules);
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', onFocus);
      }

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        setWebAlarmHandler(null);
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', onFocus);
        }
      };
    }

    const runCheck = () => {
      if (onAlarm) {
        void checkDueNativeAlarms(schedules, onAlarm);
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 15000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [schedules, onAlarm]);
}
