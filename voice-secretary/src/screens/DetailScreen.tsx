import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import { fetchScheduleById, useSchedules } from '../hooks/useSchedules';
import { saveParsedSchedule } from '../services/openai';
import { useAuthStore } from '../store/scheduleStore';
import type { Schedule, VoiceParseResult } from '../types/schedule';
import { addMinutes, formatScheduleDate, formatScheduleTime } from '../utils/dateFormatter';
import { openMaps, openPhone } from '../utils/deepLinks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

function extractDateTimeFromSchedule(data: Schedule) {
  const fromContent = {
    title: data.parsed_content.title ?? '',
    date: data.parsed_content.date ?? '',
    time: data.parsed_content.time ?? '',
    notes: data.parsed_content.notes ?? '',
  };

  if (fromContent.date && fromContent.time) return fromContent;

  if (data.target_timestamp) {
    const d = new Date(data.target_timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      ...fromContent,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }

  return fromContent;
}

const createStyles = (c: ThemeColors) => ({
  safe: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 20,
    paddingBottom: 40,
    ...(Platform.OS === 'web' ? { minHeight: '100%' as unknown as number } : {}),
  },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loading: { color: c.textMuted, textAlign: 'center' },
  notFoundTitle: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  notFoundHint: { color: c.textMuted, textAlign: 'center', marginBottom: 20 },
  banner: {
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  bannerText: { color: c.text, fontSize: 14 },
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  summaryDate: { color: c.textMuted, fontSize: 13 },
  summaryTime: { color: c.primaryLight, fontSize: 22, fontWeight: '800', marginTop: 4 },
  label: { color: c.textMuted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    color: c.text,
    borderWidth: 1,
    borderColor: c.border,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actionRow: {
    marginTop: 16,
    padding: 14,
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionText: { color: c.text, fontWeight: '600' },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: c.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  snoozeRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  snoozeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  snoozeText: { color: c.primaryLight, fontSize: 12 },
  completeBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: c.success,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '700' },
  undoCompleteBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.warning,
    alignItems: 'center',
  },
  undoCompleteBtnText: { color: c.warning, fontWeight: '700' },
  deleteBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.danger,
    alignItems: 'center',
  },
  deleteBtnText: { color: c.danger, fontWeight: '700' },
});

export function DetailScreen({ route, navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const { scheduleId, draft } = route.params;
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const { updateSchedule, deleteSchedule } = useSchedules(userId, user?.email);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: scheduleId === 'new' ? '새 일정' : '일정 수정' });
  }, [navigation, scheduleId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);

      if (scheduleId === 'new' && draft) {
        applyDraft(draft);
        setLoading(false);
        return;
      }

      const data = await fetchScheduleById(scheduleId);
      if (data) {
        setSchedule(data);
        const fields = extractDateTimeFromSchedule(data);
        setTitle(fields.title);
        setDate(fields.date);
        setTime(fields.time);
        setNotes(fields.notes);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [scheduleId, draft]);

  const applyDraft = (value: VoiceParseResult) => {
    setTitle(value.schedule.parsed_content.title);
    setDate(value.schedule.parsed_content.date);
    setTime(value.schedule.parsed_content.time);
    setNotes(value.schedule.parsed_content.notes ?? '');
  };

  const buildTimestamp = () => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00+09:00`).toISOString();
  };

  const showMessage = (titleText: string, message: string) => {
    if (Platform.OS === 'web') {
      setBanner(`${titleText}: ${message}`);
      return;
    }
    Alert.alert(titleText, message);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!title.trim()) {
      showMessage('입력 필요', '제목을 입력해 주세요.');
      return;
    }

    const parsed_content = { title: title.trim(), date, time, notes: notes || undefined };
    const target_timestamp = buildTimestamp();

    try {
      if (scheduleId === 'new' && draft) {
        await saveParsedSchedule(
          {
            ...draft,
            schedule: {
              ...draft.schedule,
              parsed_content,
              target_timestamp: target_timestamp ?? draft.schedule.target_timestamp,
            },
          },
          userId,
        );
      } else if (schedule) {
        await updateSchedule(schedule.id, {
          parsed_content,
          target_timestamp,
        });
      } else {
        showMessage('오류', '저장할 일정을 찾을 수 없습니다.');
        return;
      }
      showMessage('저장 완료', '일정이 업데이트되었습니다.');
      navigation.goBack();
    } catch (err) {
      showMessage('저장 실패', (err as Error).message);
    }
  };

  const handleComplete = async () => {
    if (!schedule) return;
    await updateSchedule(schedule.id, { status: 'completed' });
    setSchedule({ ...schedule, status: 'completed' });
    navigation.goBack();
  };

  const handleUndoComplete = async () => {
    if (!schedule) return;
    await updateSchedule(schedule.id, { status: 'pending' });
    setSchedule({ ...schedule, status: 'pending' });
    showMessage('완료 취소', '일정이 다시 활성화되었습니다.');
  };

  const handleSnooze = async (minutes: number) => {
    if (!schedule?.target_timestamp) return;
    const newTime = addMinutes(schedule.target_timestamp, minutes);
    await updateSchedule(schedule.id, {
      status: 'snoozed',
      target_timestamp: newTime,
      snooze_count: (schedule.snooze_count ?? 0) + 1,
    });
    showMessage('미루기', `${minutes}분 후 다시 알려드릴게요.`);
    navigation.goBack();
  };

  const runDelete = async () => {
    if (!schedule) return;
    try {
      await deleteSchedule(schedule.id);
      navigation.goBack();
    } catch (err) {
      showMessage('삭제 실패', (err as Error).message);
    }
  };

  const handleDelete = () => {
    if (!schedule) return;

    if (Platform.OS === 'web') {
      const ok = window.confirm('이 일정을 삭제할까요?');
      if (ok) runDelete();
      return;
    }

    Alert.alert('삭제', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: runDelete },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerBox}>
          <Text style={styles.loading}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerBox}>
          <Text style={styles.notFoundTitle}>일정을 찾을 수 없습니다</Text>
          <Text style={styles.notFoundHint}>삭제되었거나 접근 권한이 없을 수 있습니다.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>목록으로 돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {schedule?.target_timestamp ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{formatScheduleDate(schedule.target_timestamp)}</Text>
            <Text style={styles.summaryTime}>{formatScheduleTime(schedule.target_timestamp)}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="일정 제목"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>날짜 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-07-04"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>시간 (HH:mm)</Text>
        <TextInput
          style={styles.input}
          value={time}
          onChangeText={setTime}
          placeholder="14:00"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="메모 (선택)"
          placeholderTextColor={colors.textMuted}
        />

        {schedule?.contact_info?.phone ? (
          <Pressable style={styles.actionRow} onPress={() => openPhone(schedule.contact_info!)}>
            <Text style={styles.actionText}>📞 전화하기</Text>
          </Pressable>
        ) : null}

        {schedule?.location_info ? (
          <Pressable style={styles.actionRow} onPress={() => openMaps(schedule.location_info!)}>
            <Text style={styles.actionText}>🗺️ 지도 보기</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={handleSave}>
          <Text style={styles.primaryBtnText}>저장</Text>
        </Pressable>

        {schedule ? (
          <>
            <View style={styles.snoozeRow}>
              {[5, 10, 30].map((min) => (
                <Pressable key={min} style={styles.snoozeBtn} onPress={() => handleSnooze(min)}>
                  <Text style={styles.snoozeText}>{min}분 미루기</Text>
                </Pressable>
              ))}
            </View>
            {schedule.status === 'completed' ? (
              <Pressable style={styles.undoCompleteBtn} onPress={handleUndoComplete}>
                <Text style={styles.undoCompleteBtnText}>완료 취소 (다시 활성화)</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.completeBtn} onPress={handleComplete}>
                <Text style={styles.completeBtnText}>완료 처리</Text>
              </Pressable>
            )}
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
