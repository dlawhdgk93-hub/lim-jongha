import { Pressable, Text, View } from 'react-native';
import { useRef } from 'react';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Schedule } from '../types/schedule';
import { formatScheduleDate, formatScheduleTime } from '../utils/dateFormatter';
import { isAllDaySchedule } from '../utils/scheduleHelpers';

const STATUS_LABEL: Record<string, string> = {
  pending: '예정',
  completed: '완료',
  snoozed: '미룸',
};

type Props = {
  schedule: Schedule;
  variant?: 'list' | 'grid';
  selected?: boolean;
  selectionMode?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onCall?: () => void;
  onMap?: () => void;
};

const createStyles = (c: ThemeColors) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardGrid: {
    flex: 1,
    marginHorizontal: 3,
    marginBottom: 6,
    minHeight: 118,
  },
  cardList: {
    marginBottom: 2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listTime: {
    color: c.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 40,
    lineHeight: 14,
  },
  listBody: { flex: 1, gap: 0 },
  listTitle: { color: c.text, fontSize: 12, fontWeight: '600', lineHeight: 15 },
  listMeta: { color: c.textMuted, fontSize: 9, marginTop: 1, lineHeight: 12 },
  listStatusBadge: {
    fontSize: 8,
    color: c.primaryLight,
    backgroundColor: c.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  listShareBadge: { fontSize: 8, marginBottom: 2 },
  cardSharedIncoming: {
    borderColor: c.sharedIncoming,
    backgroundColor: c.sharedIncomingBg,
  },
  cardSharedOutgoing: {
    borderColor: c.sharedOutgoing,
    backgroundColor: c.sharedOutgoingBg,
  },
  cardCompleted: { opacity: 0.65 },
  cardSelected: {
    borderColor: c.primary,
    borderWidth: 2,
  },
  cardSelectionMode: { opacity: 0.92 },
  selectMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.primaryLight,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectMarkActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  selectMarkText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  shareBadgeIncoming: {
    color: c.sharedIncoming,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  shareBadgeOutgoing: {
    color: c.sharedOutgoing,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  time: { color: c.primaryLight, fontSize: 15, fontWeight: '800' },
  timeGrid: { fontSize: 13 },
  date: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  dateGrid: { fontSize: 9 },
  title: { color: c.text, fontSize: 14, fontWeight: '600', marginTop: 6 },
  titleGrid: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  titleCompleted: { textDecorationLine: 'line-through', color: c.textMuted },
  subtitle: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  notes: { color: c.textMuted, fontSize: 10, marginTop: 4, lineHeight: 14 },
  notesGrid: { fontSize: 9, lineHeight: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statusBadge: {
    fontSize: 9,
    color: c.primaryLight,
    backgroundColor: c.border,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 12 },
});

export function ScheduleCard({
  schedule,
  variant = 'grid',
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  onCall,
  onMap,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const suppressPressRef = useRef(false);
  const isGrid = variant === 'grid';
  const isAllDay = isAllDaySchedule(schedule);
  const hasPhone = !!schedule.contact_info?.phone;
  const hasLocation = !!schedule.location_info?.address || !!schedule.location_info?.place_name;
  const isCompleted = schedule.status === 'completed';
  const share = schedule.shareInfo;

  const getCardStyle = () => {
    if (share?.isSharedWithMe) {
      return [styles.card, styles.cardSharedIncoming, isCompleted && styles.cardCompleted];
    }
    if (share?.isSharedByMe) {
      return [styles.card, styles.cardSharedOutgoing, isCompleted && styles.cardCompleted];
    }
    return [styles.card, isCompleted && styles.cardCompleted];
  };

  return (
    <Pressable
      style={[
        ...getCardStyle(),
        isGrid && styles.cardGrid,
        !isGrid && styles.cardList,
        selectionMode && styles.cardSelectionMode,
        selected && styles.cardSelected,
      ]}
      onPress={() => {
        if (suppressPressRef.current) {
          suppressPressRef.current = false;
          return;
        }
        onPress();
      }}
      onLongPress={() => {
        suppressPressRef.current = true;
        onLongPress?.();
      }}
      delayLongPress={400}
    >
      {selectionMode ? (
        <View style={[styles.selectMark, selected && styles.selectMarkActive]}>
          {selected ? <Text style={styles.selectMarkText}>✓</Text> : null}
        </View>
      ) : null}
      {share?.isSharedWithMe ? (
        <Text style={[styles.shareBadgeIncoming, !isGrid && styles.listShareBadge]} numberOfLines={1}>
          👥 {share.ownerEmail ?? '공유'}
        </Text>
      ) : null}
      {share?.isSharedByMe ? (
        <Text style={[styles.shareBadgeOutgoing, !isGrid && styles.listShareBadge]} numberOfLines={1}>
          📤 공유중
        </Text>
      ) : null}

      {!isGrid ? (
        <View style={styles.listRow}>
          <Text style={styles.listTime}>
            {formatScheduleTime(schedule.target_timestamp, { isAllDay })}
          </Text>
          <View style={styles.listBody}>
            <Text
              style={[styles.listTitle, isCompleted && styles.titleCompleted]}
              numberOfLines={1}
            >
              {schedule.parsed_content.title}
            </Text>
            <Text style={styles.listMeta} numberOfLines={1}>
              {formatScheduleDate(schedule.target_timestamp)}
              {schedule.parsed_content.notes ? ` · ${schedule.parsed_content.notes}` : ''}
            </Text>
          </View>
          <Text style={styles.listStatusBadge}>
            {STATUS_LABEL[schedule.status] ?? schedule.status}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.time, styles.timeGrid]}>
            {formatScheduleTime(schedule.target_timestamp, { isAllDay })}
          </Text>
          <Text style={[styles.date, styles.dateGrid]} numberOfLines={1}>
            {formatScheduleDate(schedule.target_timestamp)}
          </Text>
          <Text
            style={[styles.title, styles.titleGrid, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {schedule.parsed_content.title}
          </Text>
          {schedule.parsed_content.notes ? (
            <Text style={[styles.notes, styles.notesGrid]} numberOfLines={2}>
              📝 {schedule.parsed_content.notes}
            </Text>
          ) : null}
          <View style={styles.footer}>
            <Text style={styles.statusBadge}>
              {STATUS_LABEL[schedule.status] ?? schedule.status}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
