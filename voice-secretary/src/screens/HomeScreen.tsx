import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { AlarmOverlay } from '../components/AlarmOverlay';
import { MonthSelector } from '../components/MonthSelector';
import { DateTabBar } from '../components/DateTabBar';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { ScheduleCard } from '../components/ScheduleCard';
import { ScheduleDetailModal } from '../components/ScheduleDetailModal';
import { ScheduleSearchModal } from '../components/ScheduleSearchModal';
import { SharePickerModal } from '../components/SharePickerModal';
import { VoiceChatPanel } from '../components/VoiceChatPanel';
import { NativeSpeechBoundary } from '../components/NativeSpeechBoundary';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import { useScheduleAlarms } from '../hooks/useScheduleAlarms';
import { useSchedules, fetchScheduleById } from '../hooks/useSchedules';
import { useVoiceParser } from '../hooks/useVoiceParser';
import {
  registerForPushNotifications,
  rescheduleAllNotifications,
  setupNotificationAlarmListeners,
} from '../services/pushNotification';
import { clearNativeAlarmFired } from '../services/nativeAlarms';
import {
  getWebNotificationHint,
  getWebNotificationStatus,
  requestWebNotificationPermission,
  showWebNotificationTest,
} from '../services/webNotifications';
import { unlockAlarmAudio } from '../services/alarmSound';
import { useAuthStore } from '../store/scheduleStore';
import type { Schedule, VoiceParseResult } from '../types/schedule';
import { addMinutes } from '../utils/dateFormatter';
import { openMaps, openPhone } from '../utils/deepLinks';
import { isWeb } from '../utils/platform';
import {
  buildDateTabs,
  filterSchedulesByDate,
  filterSchedulesByMonth,
  formatDateTabLabel,
  formatMonthLabel,
  getMonthKey,
  getScheduleDateKey,
  getTodayKey,
  isFixedDateTabKey,
  isScheduleDateKey,
  shiftMonthKey,
} from '../utils/scheduleDates';
import { getRecordingDateHint, type ParseScheduleOptions } from '../utils/nlpParser';
import { filterIncompleteSchedules } from '../utils/scheduleHelpers';
import { showAppAlert } from '../utils/showAppAlert';
import { clearAlarmFired } from '../services/webNotifications';
import { useScheduleViewStore } from '../store/scheduleViewStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const createStyles = (c: ThemeColors) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { color: c.text, fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { padding: 6 },
  headerIcon: { fontSize: 22 },
  notifyBanner: {
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.primary,
  },
  notifyBannerText: { color: c.text, fontSize: 13, lineHeight: 20 },
  notifyBannerAction: { color: c.primaryLight, fontWeight: '700', marginTop: 6, fontSize: 13 },
  notifyBannerBusy: { opacity: 0.7 },
  notifyHint: { color: c.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 18 },
  sectionTitle: { color: c.textMuted, fontSize: 14, marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  legendMine: { backgroundColor: c.surface, borderColor: c.border },
  legendOut: { backgroundColor: c.sharedOutgoingBg, borderColor: c.sharedOutgoing },
  legendIn: { backgroundColor: c.sharedIncomingBg, borderColor: c.sharedIncoming },
  legendText: { color: c.textMuted, fontSize: 10, marginRight: 8 },
  listArea: { flex: 1, minHeight: 0 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  list: { paddingBottom: 12, flexGrow: 1 },
  gridRow: { gap: 0, marginBottom: 0 },
  empty: { color: c.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 24, width: '100%' },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.primary,
  },
  selectionCount: { flex: 1, color: c.text, fontWeight: '700', fontSize: 14 },
  selectionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.border,
  },
  selectionBtnText: { color: c.text, fontWeight: '700', fontSize: 13 },
  selectionDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.danger,
  },
  selectionDeleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  selectionShareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.sharedOutgoing,
  },
  selectionShareText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  selectionHint: { color: c.textMuted, fontSize: 11, marginBottom: 6 },
  viewModeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  viewModeBtnActive: { borderColor: c.primary, backgroundColor: c.background },
  viewModeBtnText: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
  viewModeBtnTextActive: { color: c.text, fontWeight: '800' },
});

export function HomeScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const { schedules, loading, refresh, updateSchedule, deleteSchedule, deleteSchedules } = useSchedules(
    userId,
    user?.email,
  );
  const { parsing, parseText, parseAudio, savePreview, clearPreview, error } = useVoiceParser(userId);
  const [selectedDateKey, setSelectedDateKey] = useState('all');
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKey(new Date()));
  const [detailScheduleId, setDetailScheduleId] = useState<string | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<Schedule | null>(null);
  const [notificationHint, setNotificationHint] = useState(getWebNotificationHint());
  const [notificationStatus, setNotificationStatus] = useState(getWebNotificationStatus());
  const [requestingNotification, setRequestingNotification] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listAreaHeight, setListAreaHeight] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sharePickerVisible, setSharePickerVisible] = useState(false);
  const [widgetAutoRecord, setWidgetAutoRecord] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [speechHostFailed, setSpeechHostFailed] = useState(false);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const viewMode = useScheduleViewStore((s) => s.viewMode);
  const setViewMode = useScheduleViewStore((s) => s.setViewMode);
  const loadViewMode = useScheduleViewStore((s) => s.loadViewMode);

  const handleWidgetToggle = useCallback(
    async (scheduleId: string) => {
      let schedule = schedules.find((item) => item.id === scheduleId);
      if (!schedule) {
        schedule = (await fetchScheduleById(scheduleId)) ?? undefined;
      }
      if (!schedule || (schedule.shareInfo?.isSharedWithMe ?? schedule.user_id !== userId)) return;
      const nextStatus = schedule.status === 'completed' ? 'pending' : 'completed';
      try {
        await updateSchedule(scheduleId, { status: nextStatus });
      } catch (err) {
        showAppAlert('위젯 완료 처리 실패', (err as Error).message);
      }
    },
    [schedules, updateSchedule, userId],
  );

  useEffect(() => {
    void loadViewMode();
  }, [loadViewMode]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const handleWidgetUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('record') || url.includes('action=record')) {
        setWidgetAutoRecord(true);
        return;
      }

      const toggleMatch = url.match(/toggle\?id=([^&]+)/) ?? url.match(/toggle\/([^/?]+)/);
      if (toggleMatch?.[1]) {
        void handleWidgetToggle(decodeURIComponent(toggleMatch[1]));
      }
    };

    Linking.getInitialURL()
      .then(handleWidgetUrl)
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', ({ url }) => handleWidgetUrl(url));
    return () => subscription.remove();
  }, [handleWidgetToggle]);

  const canDeleteSchedule = useCallback(
    (schedule: Schedule) => schedule.user_id === userId,
    [userId],
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleScheduleSelection = useCallback((schedule: Schedule) => {
    if (!canDeleteSchedule(schedule)) {
      showAppAlert('삭제 불가', '공유받은 일정은 삭제할 수 없습니다.');
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(schedule.id)) next.delete(schedule.id);
      else next.add(schedule.id);
      return next;
    });
  }, [canDeleteSchedule]);

  const handleScheduleLongPress = useCallback(
    (schedule: Schedule) => {
      if (!canDeleteSchedule(schedule)) {
        showAppAlert('선택 불가', '내가 만든 일정만 길게 눌러 선택할 수 있습니다.');
        return;
      }
      setSelectionMode(true);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(schedule.id);
        return next;
      });
    },
    [canDeleteSchedule],
  );

  const handleSchedulePress = useCallback(
    (schedule: Schedule) => {
      if (selectionMode) {
        toggleScheduleSelection(schedule);
        return;
      }
      setDetailScheduleId(schedule.id);
    },
    [selectionMode, toggleScheduleSelection],
  );

  const runBulkDelete = useCallback(async () => {
    const ids = [...selectedIdsRef.current];
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      await Promise.all(
        ids.map(async (id) => {
          clearAlarmFired(id);
          await clearNativeAlarmFired(id);
        }),
      );
      await deleteSchedules(ids);
      exitSelectionMode();
    } catch (err) {
      showAppAlert('삭제 실패', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }, [deleteSchedules, exitSelectionMode]);

  const handleCalendarSelectDate = useCallback((dateKey: string) => {
    setSelectedMonthKey(dateKey.slice(0, 7));
    setSelectedDateKey(dateKey);
  }, []);

  const confirmBulkDelete = useCallback(() => {
    const count = selectedIdsRef.current.size;
    if (count === 0) return;

    const message = `${count}개 일정을 목록에서 삭제할까요?\n(서버 기록은 보관됩니다)`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void runBulkDelete();
      return;
    }

    Alert.alert('일정 삭제', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void runBulkDelete();
        },
      },
    ]);
  }, [runBulkDelete]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (!isWeb) {
        rescheduleAllNotifications(schedules).catch(() => undefined);
      }
    }, [refresh, schedules]),
  );

  const monthSchedules = useMemo(
    () => filterSchedulesByMonth(schedules, selectedMonthKey),
    [schedules, selectedMonthKey],
  );

  const dateTabs = useMemo(
    () => buildDateTabs(monthSchedules, new Date(), selectedMonthKey, schedules),
    [monthSchedules, selectedMonthKey, schedules],
  );

  const incompleteSchedules = useMemo(
    () => filterIncompleteSchedules(schedules),
    [schedules],
  );

  const filteredSchedules = useMemo(() => {
    if (selectedDateKey === 'incomplete') return incompleteSchedules;
    if (selectedDateKey === 'calendar') return monthSchedules;
    if (selectedDateKey === 'all') return schedules;
    if (isScheduleDateKey(selectedDateKey)) {
      return filterSchedulesByDate(schedules, selectedDateKey);
    }
    return schedules;
  }, [monthSchedules, schedules, selectedDateKey, incompleteSchedules]);

  const tabBarSelectedKey =
    isFixedDateTabKey(selectedDateKey) || isScheduleDateKey(selectedDateKey)
      ? selectedDateKey
      : 'all';

  const tabKeys = useMemo(() => dateTabs.map((tab) => tab.key), [dateTabs]);

  const navigateTab = useCallback(
    (direction: -1 | 1) => {
      const currentKey = tabKeys.includes(selectedDateKey) ? selectedDateKey : tabBarSelectedKey;
      const index = tabKeys.indexOf(currentKey);
      if (index < 0) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= tabKeys.length) return;
      setSelectedDateKey(tabKeys[nextIndex]);
    },
    [selectedDateKey, tabBarSelectedKey, tabKeys],
  );

  const contentSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          !selectionMode &&
          Math.abs(gesture.dx) > 24 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx <= -56) navigateTab(1);
          else if (gesture.dx >= 56) navigateTab(-1);
        },
      }),
    [navigateTab, selectionMode],
  );

  const recordingDateHint = getRecordingDateHint(
    isScheduleDateKey(selectedDateKey)
      ? selectedDateKey
      : selectedDateKey === 'calendar' ||
          selectedDateKey === 'all' ||
          selectedDateKey === 'incomplete'
        ? 'all'
        : selectedDateKey,
  );

  const voiceParseOptions = useMemo((): ParseScheduleOptions | undefined => {
    if (isScheduleDateKey(selectedDateKey)) {
      return { defaultDateKey: selectedDateKey };
    }
    return undefined;
  }, [selectedDateKey]);

  const handleParseAudio = useCallback(
    (audioUri: string) => parseAudio(audioUri, voiceParseOptions),
    [parseAudio, voiceParseOptions],
  );

  const handleAlarm = useCallback((schedule: Schedule) => {
    setActiveAlarm((prev) => (prev?.id === schedule.id ? prev : schedule));
  }, []);

  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;

  useScheduleAlarms(schedules, handleAlarm);

  useEffect(() => {
    if (isWeb) return undefined;
    return setupNotificationAlarmListeners(() => schedulesRef.current, handleAlarm);
  }, [handleAlarm]);

  useEffect(() => {
    if (isFixedDateTabKey(selectedDateKey) || isScheduleDateKey(selectedDateKey)) return;
    setSelectedDateKey('all');
  }, [selectedDateKey]);

  useEffect(() => {
    if (selectedMonthKey !== getMonthKey(new Date())) return;
    if (isFixedDateTabKey(selectedDateKey) || isScheduleDateKey(selectedDateKey)) return;
    setSelectedDateKey('all');
  }, [selectedMonthKey, selectedDateKey]);

  useEffect(() => {
    if (userId) {
      registerForPushNotifications(userId).catch(() => undefined);
    }
  }, [userId]);

  useEffect(() => {
    if (schedules.length > 0) {
      rescheduleAllNotifications(schedules).catch(() => undefined);
    }
  }, [schedules]);

  useEffect(() => {
    if (error) {
      showAppAlert('일정 분석', error);
    }
  }, [error]);

  const handleParseText = useCallback(
    async (text: string, rawText?: string) => {
      const parseOptions =
        isScheduleDateKey(selectedDateKey) ? { defaultDateKey: selectedDateKey } : undefined;
      const result = await parseText(text, parseOptions, rawText);
      clearPreview();
      return result;
    },
    [clearPreview, parseText, selectedDateKey],
  );

  const handleConfirmSave = useCallback(
    async (preview: VoiceParseResult) => {
      await savePreview(preview);
      await refresh();
      const savedKey = getScheduleDateKey(preview.schedule.target_timestamp);
      setSelectedDateKey(savedKey);
    },
    [refresh, savePreview],
  );

  const handleEnableNotifications = async () => {
    if (requestingNotification) return;

    setRequestingNotification(true);
    try {
      await unlockAlarmAudio();
      const result = await requestWebNotificationPermission();
      const status = getWebNotificationStatus();
      setNotificationStatus(status);
      setNotificationHint(getWebNotificationHint());

      if (result === 'granted') {
        showWebNotificationTest();
        showAppAlert(
          '알림 허용됨',
          '일정 시간에 브라우저 알림과 소리로 알려드립니다.\n이 탭을 닫으면 알림이 울리지 않을 수 있습니다.',
        );
        if (schedules.length > 0) {
          rescheduleAllNotifications(schedules).catch(() => undefined);
        }
        return;
      }

      if (result === 'insecure') {
        showAppAlert(
          '알림 불가',
          '웹 알림은 https 또는 localhost에서만 사용할 수 있습니다.\n주소창에 http://localhost:8081 을 입력해 접속해 주세요.',
        );
        return;
      }

      if (result === 'denied' || status === 'denied') {
        showAppAlert(
          '알림 차단됨',
          'Chrome: 주소창 왼쪽 🔒 → 사이트 설정 → 알림 → 허용\nEdge도 같은 방법으로 변경할 수 있습니다.',
        );
        return;
      }

      if (result === 'default') {
        showAppAlert(
          '알림 미허용',
          '브라우저 상단에 뜨는 알림 팝업에서 [허용]을 선택해 주세요.\n팝업이 안 보이면 주소창 오른쪽의 🔔 또는 차단 아이콘을 확인해 주세요.',
        );
      }
    } finally {
      setRequestingNotification(false);
    }
  };

  const handleAlarmSnooze = async (minutes: number) => {
    if (!activeAlarm?.target_timestamp) return;
    const newTime = addMinutes(activeAlarm.target_timestamp, minutes);
    clearAlarmFired(activeAlarm.id);
    void clearNativeAlarmFired(activeAlarm.id);
    await updateSchedule(activeAlarm.id, {
      status: 'snoozed',
      target_timestamp: newTime,
      snooze_count: (activeAlarm.snooze_count ?? 0) + 1,
    });
    setActiveAlarm(null);
    await refresh();
  };

  const handleAlarmComplete = async () => {
    if (!activeAlarm) return;
    await updateSchedule(activeAlarm.id, { status: 'completed' });
    setActiveAlarm(null);
    await refresh();
  };

  const sectionLabel =
    selectedDateKey === 'calendar'
      ? `달력 · ${formatMonthLabel(selectedMonthKey)} (${monthSchedules.length})`
      : selectedDateKey === 'all'
        ? `전체 일정 (${filteredSchedules.length})`
        : selectedDateKey === 'incomplete'
          ? `미완료 (${filteredSchedules.length})`
          : isScheduleDateKey(selectedDateKey)
            ? `${formatDateTabLabel(selectedDateKey)} (${filteredSchedules.length})`
            : `${dateTabs.find((t) => t.key === selectedDateKey)?.label ?? ''} (${filteredSchedules.length})`;

  const isListView = viewMode === 'list';

  const showCalendar = selectedDateKey === 'calendar';

  const showNotificationBanner =
    isWeb &&
    notificationStatus !== 'granted' &&
    notificationStatus !== 'unsupported';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>팀데이</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setSearchVisible(true)}
            style={styles.headerIconBtn}
            accessibilityLabel="일정 검색"
          >
            <Text style={styles.headerIcon}>🔍</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Share')}
            style={styles.headerIconBtn}
            accessibilityLabel="일정 공유"
          >
            <Text style={styles.headerIcon}>🔗</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {showNotificationBanner ? (
        <Pressable
          style={[styles.notifyBanner, requestingNotification && styles.notifyBannerBusy]}
          onPress={handleEnableNotifications}
          disabled={requestingNotification}
        >
          <Text style={styles.notifyBannerText}>🔔 {notificationHint}</Text>
          <Text style={styles.notifyBannerAction}>
            {requestingNotification ? '요청 중...' : '알림 허용'}
          </Text>
        </Pressable>
      ) : isWeb ? (
        <Text style={styles.notifyHint}>{notificationHint}</Text>
      ) : null}

      <MonthSelector
        monthKey={selectedMonthKey}
        onPrev={() => {
          setSelectedMonthKey((m) => shiftMonthKey(m, -1));
          if (selectedDateKey !== 'calendar' && selectedDateKey !== 'incomplete') {
            setSelectedDateKey('all');
          }
        }}
        onNext={() => {
          setSelectedMonthKey((m) => shiftMonthKey(m, 1));
          if (selectedDateKey !== 'calendar' && selectedDateKey !== 'incomplete') {
            setSelectedDateKey('all');
          }
        }}
        onSelectCurrent={() => {
          setSelectedMonthKey(getMonthKey(new Date()));
          setSelectedDateKey('calendar');
        }}
      />

      <DateTabBar
        tabs={dateTabs}
        selectedKey={tabBarSelectedKey}
        onSelect={setSelectedDateKey}
      />

      <Text style={styles.sectionTitle}>{sectionLabel}</Text>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, styles.legendMine]} />
        <Text style={styles.legendText}>내 일정</Text>
        <View style={[styles.legendDot, styles.legendOut]} />
        <Text style={styles.legendText}>공유함</Text>
        <View style={[styles.legendDot, styles.legendIn]} />
        <Text style={styles.legendText}>공유받음</Text>
      </View>

      {!showCalendar ? (
        <View style={styles.viewModeRow}>
          <Pressable
            style={[styles.viewModeBtn, !isListView && styles.viewModeBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.viewModeBtnText, !isListView && styles.viewModeBtnTextActive]}>
              ▦ 블록
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewModeBtn, isListView && styles.viewModeBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewModeBtnText, isListView && styles.viewModeBtnTextActive]}>
              ☰ 한줄
            </Text>
          </Pressable>
        </View>
      ) : null}

      {selectionMode ? (
        <>
          <Text style={styles.selectionHint}>탭으로 선택 · 공유 · 삭제</Text>
          <View style={styles.selectionBar}>
            <Text style={styles.selectionCount}>{selectedIds.size}개 선택됨</Text>
            <Pressable
              style={styles.selectionBtn}
              onPress={exitSelectionMode}
              disabled={deleting}
            >
              <Text style={styles.selectionBtnText}>취소</Text>
            </Pressable>
            <Pressable
              style={styles.selectionShareBtn}
              onPress={() => setSharePickerVisible(true)}
              disabled={deleting || selectedIds.size === 0}
            >
              <Text style={styles.selectionShareText}>공유</Text>
            </Pressable>
            <Pressable
              style={styles.selectionDeleteBtn}
              onPress={confirmBulkDelete}
              disabled={deleting || selectedIds.size === 0}
            >
              <Text style={styles.selectionDeleteText}>
                {deleting ? '삭제 중...' : '삭제'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={styles.selectionHint}>내 일정을 길게 눌러 선택 · 공유 · 삭제</Text>
      )}

      <View
        style={styles.listArea}
        onLayout={(event) => setListAreaHeight(event.nativeEvent.layout.height)}
        {...contentSwipeResponder.panHandlers}
      >
        {loading && !showCalendar && filteredSchedules.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.empty}>불러오는 중...</Text>
          </View>
        ) : showCalendar ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.list,
              listAreaHeight > 0 ? { minHeight: listAreaHeight } : null,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onPullRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            }
          >
            <ScheduleCalendar
              monthKey={selectedMonthKey}
              schedules={monthSchedules}
              onSelectDate={handleCalendarSelectDate}
              onSchedulePress={handleSchedulePress}
              onScheduleLongPress={handleScheduleLongPress}
            />
          </ScrollView>
        ) : (
          <FlatList
            data={filteredSchedules}
            key={isListView ? 'schedule-list' : 'schedule-grid-3'}
            numColumns={isListView ? 1 : 3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              listAreaHeight > 0 ? { minHeight: listAreaHeight } : null,
            ]}
            columnWrapperStyle={isListView ? undefined : styles.gridRow}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onPullRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {selectedDateKey === 'incomplete'
                  ? '미완료 일정이 없습니다.\n지난 날짜의 일정을 완료 처리해 주세요.'
                  : selectedDateKey === 'all'
                    ? '등록된 일정이 없습니다.\n아래로 당겨 새로고침 · 마이크로 일정 추가'
                    : '이 날짜에 등록된 일정이 없습니다.\n아래로 당겨 새로고침'}
              </Text>
            }
            renderItem={({ item }) => (
              <ScheduleCard
                variant={isListView ? 'list' : 'grid'}
                schedule={item}
                selectionMode={selectionMode}
                selected={selectedIds.has(item.id)}
                onPress={() => handleSchedulePress(item)}
                onLongPress={() => handleScheduleLongPress(item)}
                onCall={() => item.contact_info && openPhone(item.contact_info)}
                onMap={() => item.location_info && openMaps(item.location_info)}
              />
            )}
          />
        )}
      </View>

      <NativeSpeechBoundary onFailed={() => setSpeechHostFailed(true)}>
        <VoiceChatPanel
          parsing={parsing}
          onParseText={handleParseText}
          onParseAudio={handleParseAudio}
          onConfirmSave={handleConfirmSave}
          recordingDateHint={recordingDateHint}
          defaultDateKey={voiceParseOptions?.defaultDateKey}
          autoStartRecording={widgetAutoRecord}
          speechHostFailed={speechHostFailed}
        />
      </NativeSpeechBoundary>

      <ScheduleDetailModal
        visible={detailScheduleId !== null}
        scheduleId={detailScheduleId}
        onClose={() => {
          setDetailScheduleId(null);
          if (selectionMode) exitSelectionMode();
        }}
        onChanged={() => refresh({ silent: true })}
        updateSchedule={updateSchedule}
        deleteSchedule={deleteSchedule}
        onOpenShareHub={() => {
          setDetailScheduleId(null);
          navigation.navigate('Share');
        }}
      />

      <AlarmOverlay
        schedule={activeAlarm}
        onDismiss={() => setActiveAlarm(null)}
        onSnooze={handleAlarmSnooze}
        onComplete={handleAlarmComplete}
      />

      {userId ? (
        <SharePickerModal
          visible={sharePickerVisible}
          scheduleIds={[...selectedIds]}
          userId={userId}
          onClose={() => setSharePickerVisible(false)}
          onShared={() => {
            exitSelectionMode();
            void refresh();
          }}
          onManageFriends={() => {
            setSharePickerVisible(false);
            navigation.navigate('Share');
          }}
        />
      ) : null}

      <ScheduleSearchModal
        visible={searchVisible}
        schedules={schedules}
        onClose={() => setSearchVisible(false)}
        onSelectSchedule={(scheduleId) => {
          const schedule = schedules.find((item) => item.id === scheduleId);
          if (schedule?.target_timestamp) {
            setSelectedMonthKey(getMonthKey(new Date(schedule.target_timestamp)));
            setSelectedDateKey(getScheduleDateKey(schedule.target_timestamp));
          }
          setDetailScheduleId(scheduleId);
        }}
      />
    </KeyboardAvoidingView>
  );
}
