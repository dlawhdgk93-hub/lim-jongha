export type AlarmSoundId = 'bell' | 'chime' | 'digital' | 'gentle' | 'urgent';

export type AlarmSoundOption = {
  id: AlarmSoundId;
  label: string;
  emoji: string;
  description: string;
};

export const ALARM_SOUND_OPTIONS: AlarmSoundOption[] = [
  { id: 'bell', label: '클래식 벨', emoji: '🔔', description: '전통적인 알람 벨 소리' },
  { id: 'chime', label: '차임벨', emoji: '🎵', description: '부드러운 3음 차임' },
  { id: 'digital', label: '디지털', emoji: '📟', description: '전자 시계 알람' },
  { id: 'gentle', label: '부드러운', emoji: '🌙', description: '낮은 톤의 잔잔한 알림' },
  { id: 'urgent', label: '긴급', emoji: '🚨', description: '빠르고 강한 알람' },
];

export const DEFAULT_ALARM_SOUND: AlarmSoundId = 'bell';

export function isAlarmSoundId(value: string | null | undefined): value is AlarmSoundId {
  return ALARM_SOUND_OPTIONS.some((opt) => opt.id === value);
}
