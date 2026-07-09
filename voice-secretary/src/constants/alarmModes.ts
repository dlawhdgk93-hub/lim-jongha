export type AlarmMode = 'sound' | 'vibrate' | 'both';

export type AlarmModeOption = {
  id: AlarmMode;
  label: string;
  emoji: string;
};

export const ALARM_MODE_OPTIONS: AlarmModeOption[] = [
  { id: 'sound', label: '소리', emoji: '🔔' },
  { id: 'vibrate', label: '진동', emoji: '📳' },
  { id: 'both', label: '소리+진동', emoji: '🔔📳' },
];

export const DEFAULT_ALARM_MODE: AlarmMode = 'both';

export function isAlarmMode(value: unknown): value is AlarmMode {
  return value === 'sound' || value === 'vibrate' || value === 'both';
}

export function getAlarmModeFromSchedule(
  parsed: { alarm_mode?: unknown } | undefined,
): AlarmMode {
  return isAlarmMode(parsed?.alarm_mode) ? parsed.alarm_mode : DEFAULT_ALARM_MODE;
}
