import { useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Schedule } from '../types/schedule';
import {
  getCalendarCells,
  getWeekdayLabels,
  groupSchedulesByDateKey,
} from '../utils/scheduleDates';

type Props = {
  monthKey: string;
  schedules: Schedule[];
  onSelectDate: (dateKey: string) => void;
  onSchedulePress: (schedule: Schedule) => void;
  onScheduleLongPress?: (schedule: Schedule) => void;
};

const MAX_TITLES_PER_DAY = 3;

const createStyles = (c: ThemeColors) => ({
  content: { paddingBottom: 12 },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
  weekdaySun: { color: c.danger },
  weekdaySat: { color: c.primaryLight },
  grid: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    minHeight: 72,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
    padding: 3,
    backgroundColor: c.surface,
  },
  cellDim: { backgroundColor: c.background, opacity: 0.45 },
  cellToday: { backgroundColor: `${c.primary}18` },
  dayNum: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'right',
    paddingRight: 2,
  },
  dayNumToday: { color: c.primary },
  dayNumSun: { color: c.danger },
  dayNumSat: { color: c.primaryLight },
  eventItem: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 2,
    backgroundColor: c.background,
    borderLeftWidth: 2,
    borderLeftColor: c.primary,
  },
  eventItemSharedIn: {
    borderLeftColor: c.sharedIncoming,
    backgroundColor: c.sharedIncomingBg,
  },
  eventItemSharedOut: {
    borderLeftColor: c.sharedOutgoing,
    backgroundColor: c.sharedOutgoingBg,
  },
  eventItemCompleted: { opacity: 0.55 },
  eventTitle: {
    color: c.text,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
  },
  eventTitleCompleted: {
    textDecorationLine: 'line-through',
    color: c.textMuted,
  },
  moreText: {
    color: c.textMuted,
    fontSize: 9,
    fontWeight: '700',
    paddingLeft: 2,
  },
  emptyMonth: {
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    fontSize: 13,
  },
});

export function ScheduleCalendar({
  monthKey,
  schedules,
  onSelectDate,
  onSchedulePress,
  onScheduleLongPress,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const suppressPressRef = useRef<string | null>(null);

  const renderEventItem = (schedule: Schedule) => {
    const share = schedule.shareInfo;
    const completed = schedule.status === 'completed';

    return (
      <Pressable
        key={schedule.id}
        style={[
          styles.eventItem,
          completed && styles.eventItemCompleted,
          share?.isSharedWithMe && styles.eventItemSharedIn,
          share?.isSharedByMe && styles.eventItemSharedOut,
        ]}
        onPress={() => {
          if (suppressPressRef.current === schedule.id) {
            suppressPressRef.current = null;
            return;
          }
          onSchedulePress(schedule);
        }}
        onLongPress={() => {
          suppressPressRef.current = schedule.id;
          onScheduleLongPress?.(schedule);
        }}
        delayLongPress={400}
      >
        <Text
          style={[
            styles.eventTitle,
            schedule.status === 'completed' && styles.eventTitleCompleted,
          ]}
          numberOfLines={1}
        >
          {schedule.parsed_content.title}
        </Text>
      </Pressable>
    );
  };

  const cells = useMemo(() => getCalendarCells(monthKey), [monthKey]);
  const weeks = useMemo(() => {
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);
  const byDate = useMemo(() => groupSchedulesByDateKey(schedules), [schedules]);
  const weekdays = getWeekdayLabels();

  if (cells.length === 0) {
    return <Text style={styles.emptyMonth}>달력을 표시할 수 없습니다.</Text>;
  }

  return (
    <View style={styles.content}>
      <View style={styles.weekdayRow}>
        {weekdays.map((label, index) => (
          <View key={label} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                index === 0 && styles.weekdaySun,
                index === 6 && styles.weekdaySat,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((cell, dayIndex) => {
              const cellIndex = weekIndex * 7 + dayIndex;

              if (!cell.inMonth || !cell.dateKey) {
                return <View key={`pad-${cellIndex}`} style={[styles.cell, styles.cellDim]} />;
              }

              const daySchedules = byDate.get(cell.dateKey) ?? [];
              const visible = daySchedules.slice(0, MAX_TITLES_PER_DAY);
              const hiddenCount = daySchedules.length - visible.length;

              return (
                <Pressable
                  key={cell.dateKey}
                  style={[styles.cell, cell.isToday && styles.cellToday]}
                  onPress={() => onSelectDate(cell.dateKey!)}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      cell.isToday && styles.dayNumToday,
                      dayIndex === 0 && styles.dayNumSun,
                      dayIndex === 6 && styles.dayNumSat,
                    ]}
                  >
                    {cell.day}
                  </Text>

                  {visible.map((schedule) => renderEventItem(schedule))}

                  {hiddenCount > 0 ? (
                    <Text style={styles.moreText}>+{hiddenCount}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {schedules.length === 0 ? (
        <Text style={styles.emptyMonth}>이 달에 등록된 일정이 없습니다.</Text>
      ) : null}
    </View>
  );
}
