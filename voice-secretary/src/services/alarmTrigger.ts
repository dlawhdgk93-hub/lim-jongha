import { Vibration } from 'react-native';
import type { AlarmMode } from '../constants/alarmModes';
import { isAlarmMode } from '../constants/alarmModes';
import { isAlarmSoundId, type AlarmSoundId } from '../constants/alarmSounds';
import { endAlarmSession, beginAlarmSession } from './alarmSession';
import { startAlarmSound } from './alarmSound';
import { getAlarmSoundId } from '../store/alarmSoundStore';

export function parseAlarmPayload(data: Record<string, unknown> | undefined) {
  if (!data || typeof data.scheduleId !== 'string') return null;

  const alarmMode: AlarmMode = isAlarmMode(data.alarmMode) ? data.alarmMode : 'both';
  const alarmSoundId: AlarmSoundId =
    typeof data.alarmSoundId === 'string' && isAlarmSoundId(data.alarmSoundId)
      ? data.alarmSoundId
      : getAlarmSoundId();

  return { scheduleId: data.scheduleId, alarmMode, alarmSoundId };
}

export async function triggerAlarmFromPayload(data: Record<string, unknown> | undefined) {
  const payload = parseAlarmPayload(data);
  if (!payload) return;
  if (!beginAlarmSession(payload.scheduleId)) return;

  if (payload.alarmMode === 'vibrate') {
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 800], true);
    return;
  }

  await startAlarmSound(payload.alarmSoundId, payload.alarmMode);
}

export { endAlarmSession };
