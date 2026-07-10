import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import type { Schedule } from '../types/schedule';
import { searchSchedules } from '../utils/scheduleSearch';

type Props = {
  visible: boolean;
  schedules: Schedule[];
  onClose: () => void;
  onSelectSchedule: (scheduleId: string) => void;
};

const createStyles = (c: ThemeColors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  title: { color: c.text, fontSize: 16, fontWeight: '800', flex: 1 },
  closeBtn: { padding: 6 },
  closeText: { color: c.textMuted, fontSize: 18 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  searchIcon: { fontSize: 16 },
  input: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    paddingVertical: 4,
  },
  hint: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 16,
    textAlign: 'center',
  },
  list: { paddingHorizontal: 10, paddingBottom: 12 },
  resultRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  resultDate: { color: c.primaryLight, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  resultTitle: { color: c.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  resultMeta: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  resultCompleted: { textDecorationLine: 'line-through', color: c.textMuted },
});

export function ScheduleSearchModal({ visible, schedules, onClose, onSelectSchedule }: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchSchedules(schedules, query), [schedules, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.panel} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>일정 검색</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="찾을 단어를 입력하세요"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="search"
            />
          </View>

          {!query.trim() ? (
            <Text style={styles.hint}>제목, 원문, 메모에서 일정을 검색합니다.</Text>
          ) : results.length === 0 ? (
            <Text style={styles.hint}>“{query.trim()}”에 맞는 일정이 없습니다.</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.schedule.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const completed = item.schedule.status === 'completed';
                return (
                  <Pressable
                    style={styles.resultRow}
                    onPress={() => {
                      onSelectSchedule(item.schedule.id);
                      handleClose();
                    }}
                  >
                    <Text style={styles.resultDate}>{item.dateLabel}</Text>
                    <Text style={[styles.resultTitle, completed && styles.resultCompleted]}>
                      {item.fullName}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {completed ? '완료 · ' : ''}
                      {item.matchedIn} 일치
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
