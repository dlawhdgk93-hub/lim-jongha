import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import { fetchScheduleById } from '../hooks/useSchedules';
import {
  fetchShareContacts,
  getContactLabel,
  shareScheduleWithContact,
  type ShareContact,
} from '../services/shareContacts';
import {
  fetchShareGroups,
  shareScheduleWithGroup,
  type ShareGroupWithMembers,
} from '../services/shareGroups';
import {
  fetchSharesForSchedule,
  removeScheduleShare,
  shareScheduleWithEmail,
  type ScheduleShareRow,
} from '../services/scheduleShare';
import { supabase } from '../services/supabase';
import { clearAlarmFired } from '../services/webNotifications';
import { useAuthStore } from '../store/scheduleStore';
import type { Schedule } from '../types/schedule';
import { addMinutes, formatScheduleDate, formatScheduleTime } from '../utils/dateFormatter';
import { openMaps, openPhone } from '../utils/deepLinks';
import { buildTimestampFromFields, extractDateTimeFromSchedule } from '../utils/scheduleForm';
import { TimeAdjuster } from './TimeAdjuster';

type Props = {
  visible: boolean;
  scheduleId: string | null;
  onClose: () => void;
  onChanged: () => void;
  updateSchedule: (id: string, updates: Record<string, unknown>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  onOpenShareHub?: () => void;
};

const createStyles = (c: ThemeColors) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: 420,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
  closeBtn: { color: c.textMuted, fontSize: 22, padding: 4 },
  center: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: c.textMuted },
  content: { padding: 20, paddingBottom: 40 },
  successText: { color: c.success, marginBottom: 8 },
  errorText: { color: c.danger, textAlign: 'center', marginBottom: 16 },
  errorBanner: {
    color: c.danger,
    backgroundColor: c.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
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
  rawTextBox: {
    backgroundColor: c.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  rawTextLabel: { color: c.primaryLight, fontSize: 11, fontWeight: '700' },
  rawTextValue: { color: c.text, fontSize: 13, lineHeight: 20, marginTop: 6 },
  sharedBanner: {
    backgroundColor: c.sharedIncomingBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.sharedIncoming,
  },
  sharedBannerText: { color: c.sharedIncoming, fontSize: 12, fontWeight: '600' },
  shareSection: { marginTop: 8 },
  shareHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareManageLink: { color: c.primaryLight, fontSize: 12, fontWeight: '700' },
  shareSubLabel: { color: c.textMuted, fontSize: 11, marginTop: 10, marginBottom: 6 },
  permRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  permBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  permBtnActive: { borderColor: c.primary, backgroundColor: c.surface },
  permBtnText: { color: c.text, fontSize: 12, fontWeight: '600' },
  groupChip: {
    backgroundColor: c.sharedIncomingBg,
    borderWidth: 1,
    borderColor: c.sharedIncoming,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupChipText: { color: c.text, fontSize: 12, fontWeight: '600' },
  contactChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  contactChip: {
    backgroundColor: c.sharedOutgoingBg,
    borderWidth: 1,
    borderColor: c.sharedOutgoing,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contactChipShared: {
    backgroundColor: c.border,
    borderColor: c.textMuted,
    opacity: 0.7,
  },
  contactChipText: { color: c.text, fontSize: 12, fontWeight: '600' },
  shareRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  shareInput: { flex: 1, marginTop: 0 },
  shareBtn: {
    backgroundColor: c.sharedOutgoing,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shareBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 13 },
  shareList: { marginTop: 8, gap: 6 },
  shareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.sharedOutgoingBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: c.sharedOutgoing,
  },
  shareItemEmail: { color: c.text, fontSize: 12, flex: 1 },
  shareRemove: { color: c.danger, fontWeight: '700', fontSize: 12 },
  shareHint: { color: c.textMuted, fontSize: 11, marginTop: 6 },
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
  btnDisabled: { opacity: 0.6 },
});

export function ScheduleDetailModal({
  visible,
  scheduleId,
  onClose,
  onChanged,
  updateSchedule,
  deleteSchedule,
  onOpenShareHub,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shares, setShares] = useState<ScheduleShareRow[]>([]);
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [groups, setGroups] = useState<ShareGroupWithMembers[]>([]);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sharing, setSharing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isOwner = schedule?.user_id === user?.id;
  const isSharedWithMe = schedule != null && schedule.user_id !== user?.id;
  const [canEditShared, setCanEditShared] = useState(false);

  useEffect(() => {
    if (!visible || !scheduleId) {
      setSchedule(null);
      setError(null);
      setMessage(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const data = await fetchScheduleById(scheduleId);
      if (cancelled) return;

      if (data) {
        setSchedule(data);
        const fields = extractDateTimeFromSchedule(data);
        setTitle(fields.title);
        setDate(fields.date);
        setTime(fields.time);
        setNotes(fields.notes);

        if (data.user_id === user?.id) {
          const [shareRows, contactRows, groupRows] = await Promise.all([
            fetchSharesForSchedule(data.id),
            user?.id ? fetchShareContacts(user.id) : Promise.resolve([]),
            user?.id ? fetchShareGroups(user.id) : Promise.resolve([]),
          ]);
          if (!cancelled) {
            setShares(shareRows);
            setContacts(contactRows);
            setGroups(groupRows);
          }
        } else {
          setShares([]);
          if (user?.id) {
            const shareQuery = user.email
              ? `shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email.toLowerCase()}`
              : `shared_with_user_id.eq.${user.id}`;
            const { data: myShare } = await supabase
              .from('schedule_shares')
              .select('permission')
              .eq('schedule_id', data.id)
              .or(shareQuery)
              .maybeSingle();
            if (!cancelled) setCanEditShared(myShare?.permission === 'edit');
          }
        }
      } else {
        setSchedule(null);
        setError('일정을 찾을 수 없습니다.');
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [visible, scheduleId, user?.id]);

  const handleShareWithContact = async (contact: ShareContact) => {
    if (!schedule || !user?.id) return;
    setSharing(true);
    setError(null);
    try {
      await shareScheduleWithContact(schedule.id, user.id, contact, sharePermission);
      setMessage(`${contact.display_name ?? contact.contact_email}에게 공유했습니다.`);
      setShares(await fetchSharesForSchedule(schedule.id));
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleShareWithGroup = async (group: ShareGroupWithMembers) => {
    if (!schedule || !user?.id) return;
    setSharing(true);
    setError(null);
    try {
      const count = await shareScheduleWithGroup(schedule.id, user.id, group, sharePermission);
      setMessage(`${group.name} 그룹 ${count}명에게 공유했습니다.`);
      setShares(await fetchSharesForSchedule(schedule.id));
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleShare = async () => {
    if (!schedule || !user?.id || !shareEmail.trim()) return;
    setSharing(true);
    setError(null);
    try {
      await shareScheduleWithEmail(schedule.id, user.id, shareEmail.trim(), sharePermission);
      setShareEmail('');
      setMessage('일정을 공유했습니다.');
      const rows = await fetchSharesForSchedule(schedule.id);
      setShares(rows);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    setSharing(true);
    try {
      await removeScheduleShare(shareId);
      if (schedule) {
        setShares(await fetchSharesForSchedule(schedule.id));
      }
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    if (!schedule) return;
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const parsed_content = { title: title.trim(), date, time, notes: notes || undefined };
      const target_timestamp = buildTimestampFromFields(date, time);
      clearAlarmFired(schedule.id);
      await updateSchedule(schedule.id, { parsed_content, target_timestamp });
      setMessage('저장되었습니다.');
      onChanged();
      setTimeout(onClose, 400);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      await updateSchedule(schedule.id, { status: 'completed' });
      setSchedule({ ...schedule, status: 'completed' });
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUndoComplete = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      await updateSchedule(schedule.id, { status: 'pending' });
      setSchedule({ ...schedule, status: 'pending' });
      setMessage('완료 처리를 취소했습니다.');
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSnooze = async (minutes: number) => {
    if (!schedule?.target_timestamp) return;
    setSaving(true);
    try {
      const newTime = addMinutes(schedule.target_timestamp, minutes);
      clearAlarmFired(schedule.id);
      await updateSchedule(schedule.id, {
        status: 'snoozed',
        target_timestamp: newTime,
        snooze_count: (schedule.snooze_count ?? 0) + 1,
      });
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;

    setSaving(true);
    try {
      await deleteSchedule(schedule.id);
      clearAlarmFired(schedule.id);
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteNative = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('이 일정을 목록에서 숨길까요? (기록은 서버에 보관됩니다)')) {
        handleDelete();
      }
      return;
    }

    Alert.alert('목록에서 숨기기', '이 일정을 목록에서 숨길까요? (기록은 서버에 보관됩니다)', [
      { text: '취소', style: 'cancel' },
      { text: '숨기기', style: 'destructive', onPress: handleDelete },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>일정 수정</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : error && !schedule ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>닫기</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {message ? <Text style={styles.successText}>{message}</Text> : null}
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              {schedule?.raw_text ? (
                <View style={styles.rawTextBox}>
                  <Text style={styles.rawTextLabel}>🎙 음성 인식 원문</Text>
                  <Text style={styles.rawTextValue}>{schedule.raw_text}</Text>
                </View>
              ) : null}

              {isSharedWithMe ? (
                <View style={styles.sharedBanner}>
                  <Text style={styles.sharedBannerText}>
                    👥 다른 사용자가 공유한 일정입니다
                    {canEditShared ? ' (수정 가능)' : ' (보기만)'}
                  </Text>
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
                editable={!isSharedWithMe || canEditShared}
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
                placeholder="14:45"
                placeholderTextColor={colors.textMuted}
              />
              <TimeAdjuster
                date={date}
                time={time}
                onChange={(next) => {
                  setDate(next.date);
                  setTime(next.time);
                }}
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

              {isOwner ? (
                <View style={styles.shareSection}>
                  <View style={styles.shareHeaderRow}>
                    <Text style={styles.label}>일정 공유</Text>
                    {onOpenShareHub ? (
                      <Pressable onPress={onOpenShareHub}>
                        <Text style={styles.shareManageLink}>친구 관리 →</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.shareSubLabel}>공유 권한</Text>
                  <View style={styles.permRow}>
                    <Pressable
                      style={[styles.permBtn, sharePermission === 'view' && styles.permBtnActive]}
                      onPress={() => setSharePermission('view')}
                    >
                      <Text style={styles.permBtnText}>보기만</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.permBtn, sharePermission === 'edit' && styles.permBtnActive]}
                      onPress={() => setSharePermission('edit')}
                    >
                      <Text style={styles.permBtnText}>수정 가능</Text>
                    </Pressable>
                  </View>

                  {groups.length > 0 ? (
                    <>
                      <Text style={styles.shareSubLabel}>그룹 공유</Text>
                      <View style={styles.contactChips}>
                        {groups.map((group) => (
                          <Pressable
                            key={group.id}
                            style={[styles.groupChip, sharing && styles.btnDisabled]}
                            onPress={() => handleShareWithGroup(group)}
                            disabled={sharing || group.members.length === 0}
                          >
                            <Text style={styles.groupChipText}>
                              👥 {group.name} ({group.members.length})
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}

                  {contacts.length > 0 ? (
                    <>
                      <Text style={styles.shareSubLabel}>친구 공유</Text>
                      <View style={styles.contactChips}>
                      {contacts.map((contact) => {
                        const alreadyShared = shares.some(
                          (s) => s.shared_with_email === contact.contact_email,
                        );
                        return (
                          <Pressable
                            key={contact.id}
                            style={[
                              styles.contactChip,
                              alreadyShared && styles.contactChipShared,
                              sharing && styles.btnDisabled,
                            ]}
                            onPress={() => handleShareWithContact(contact)}
                            disabled={sharing || alreadyShared}
                          >
                            <Text style={styles.contactChipText}>
                              {alreadyShared ? '✓ ' : ''}
                              {getContactLabel(contact)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    </>
                  ) : (
                    <Text style={styles.shareHint}>
                      🔗 상단 공유 아이콘에서 친구 이메일을 먼저 등록해 주세요.
                    </Text>
                  )}

                  <Text style={styles.shareSubLabel}>또는 이메일 직접 입력</Text>
                  <View style={styles.shareRow}>
                    <TextInput
                      style={[styles.input, styles.shareInput]}
                      value={shareEmail}
                      onChangeText={setShareEmail}
                      placeholder="colleague@email.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <Pressable
                      style={[styles.shareBtn, sharing && styles.btnDisabled]}
                      onPress={handleShare}
                      disabled={sharing || !shareEmail.trim()}
                    >
                      <Text style={styles.shareBtnText}>공유</Text>
                    </Pressable>
                  </View>
                  {shares.length > 0 ? (
                    <View style={styles.shareList}>
                      {shares.map((share) => (
                        <View key={share.id} style={styles.shareItem}>
                          <Text style={styles.shareItemEmail}>
                            {share.shared_with_email}
                            {share.permission === 'edit' ? ' · 수정 가능' : ' · 보기만'}
                          </Text>
                          <Pressable onPress={() => handleRemoveShare(share.id)} disabled={sharing}>
                            <Text style={styles.shareRemove}>해제</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.shareHint}>공유한 사람의 화면에 청록색으로 표시됩니다.</Text>
                  )}
                </View>
              ) : null}

              {!isSharedWithMe || canEditShared ? (
              <Pressable
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>{saving ? '저장 중...' : '저장'}</Text>
              </Pressable>
              ) : null}

              {!isSharedWithMe ? (
              <View style={styles.snoozeRow}>
                {[5, 10, 30].map((min) => (
                  <Pressable
                    key={min}
                    style={[styles.snoozeBtn, saving && styles.btnDisabled]}
                    onPress={() => handleSnooze(min)}
                    disabled={saving}
                  >
                    <Text style={styles.snoozeText}>{min}분 미루기</Text>
                  </Pressable>
                ))}
              </View>
              ) : null}

              {!isSharedWithMe && schedule ? (
              schedule.status === 'completed' ? (
                <Pressable
                  style={[styles.undoCompleteBtn, saving && styles.btnDisabled]}
                  onPress={handleUndoComplete}
                  disabled={saving}
                >
                  <Text style={styles.undoCompleteBtnText}>완료 취소 (다시 활성화)</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.completeBtn, saving && styles.btnDisabled]}
                  onPress={handleComplete}
                  disabled={saving}
                >
                  <Text style={styles.completeBtnText}>완료 처리</Text>
                </Pressable>
              )
              ) : null}

            {!isSharedWithMe ? (
            <Pressable
              style={[styles.deleteBtn, saving && styles.btnDisabled]}
              onPress={confirmDeleteNative}
              disabled={saving}
            >
              <Text style={styles.deleteBtnText}>목록에서 숨기기</Text>
            </Pressable>
            ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
