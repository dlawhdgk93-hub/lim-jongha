import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { getAlarmModeFromSchedule } from '../constants/alarmModes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { beginAlarmSession } from '../services/alarmSession';
import { startAlarmSound, stopAlarmSound } from '../services/alarmSound';
import { getAlarmSoundId } from '../store/alarmSoundStore';
import type { Schedule } from '../types/schedule';
import { formatScheduleDate, formatScheduleTime } from '../utils/dateFormatter';

type Props = {
  schedule: Schedule | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onComplete: () => void;
};

const createStyles = (c: ThemeColors) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.primary,
  },
  badge: { color: c.primaryLight, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  title: { color: c.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  time: { color: c.textMuted, fontSize: 14, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  snoozeText: { color: c.primaryLight, fontWeight: '600', fontSize: 13 },
  completeBtn: {
    backgroundColor: c.success,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  completeBtnText: { color: '#fff', fontWeight: '700' },
  dismissBtn: { paddingVertical: 10, alignItems: 'center' },
  dismissText: { color: c.textMuted },
});

export function AlarmOverlay({ schedule, onDismiss, onSnooze, onComplete }: Props) {
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (!schedule) return undefined;
    beginAlarmSession(schedule.id);
    void startAlarmSound(
      getAlarmSoundId(),
      getAlarmModeFromSchedule(schedule.parsed_content),
    );
    return () => {
      void stopAlarmSound();
    };
  }, [schedule]);

  const handleDismiss = () => {
    stopAlarmSound();
    onDismiss();
  };

  const handleSnooze = (minutes: number) => {
    stopAlarmSound();
    onSnooze(minutes);
  };

  const handleComplete = () => {
    stopAlarmSound();
    onComplete();
  };

  if (!schedule) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.badge}>⏰ 일정 시간</Text>
          <Text style={styles.title}>{schedule.parsed_content.title}</Text>
          {schedule.target_timestamp ? (
            <Text style={styles.time}>
              {formatScheduleDate(schedule.target_timestamp)}{' '}
              {formatScheduleTime(schedule.target_timestamp)}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {[5, 10].map((min) => (
              <Pressable key={min} style={styles.snoozeBtn} onPress={() => handleSnooze(min)}>
                <Text style={styles.snoozeText}>{min}분 미루기</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.completeBtn} onPress={handleComplete}>
            <Text style={styles.completeBtnText}>완료</Text>
          </Pressable>
          <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
