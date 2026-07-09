import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { VoiceParseResult } from '../types/schedule';
import { formatDateTime } from '../utils/dateFormatter';

type Props = {
  preview: VoiceParseResult;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  autoSaveSeconds?: number;
};

const createStyles = (c: ThemeColors) => ({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 10,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  heading: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  raw: { color: c.textMuted, fontSize: 13, marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: 48, color: c.textMuted, fontSize: 14 },
  value: { flex: 1, color: c.text, fontSize: 14, fontWeight: '600' },
  countdown: { color: c.primaryLight, marginTop: 12, marginBottom: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  secondaryText: { color: c.textMuted },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});

export function ParsingPreview({
  preview,
  onConfirm,
  onEdit,
  onCancel,
  autoSaveSeconds = 3,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const [countdown, setCountdown] = useState(autoSaveSeconds);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    setCountdown(autoSaveSeconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirmRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [preview, autoSaveSeconds]);

  const { schedule } = preview;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.heading}>AI 분석 결과</Text>
        <Text style={styles.raw}>{schedule.raw_text}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>제목</Text>
          <Text style={styles.value}>{schedule.parsed_content.title}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>시간</Text>
          <Text style={styles.value}>{formatDateTime(schedule.target_timestamp)}</Text>
        </View>
        <Text style={styles.countdown}>{countdown}초 후 자동 저장</Text>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={onCancel}>
            <Text style={styles.secondaryText}>취소</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onEdit}>
            <Text style={styles.secondaryText}>수정</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={onConfirm}>
            <Text style={styles.primaryText}>저장</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
