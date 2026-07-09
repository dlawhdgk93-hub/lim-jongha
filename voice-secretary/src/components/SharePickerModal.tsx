import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
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
import { showAppAlert } from '../utils/showAppAlert';

type Props = {
  visible: boolean;
  scheduleIds: string[];
  userId: string;
  onClose: () => void;
  onShared: () => void;
  onManageFriends?: () => void;
};

const createStyles = (c: ThemeColors) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { color: c.text, fontSize: 17, fontWeight: '800' },
  closeBtn: { padding: 6 },
  closeText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
  hint: { color: c.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  section: { color: c.textMuted, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 6,
  },
  rowPressed: { borderColor: c.primary },
  rowMain: { flex: 1 },
  rowName: { color: c.text, fontWeight: '700', fontSize: 14 },
  rowEmail: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  rowAction: { color: c.primaryLight, fontWeight: '700', fontSize: 12 },
  empty: { color: c.textMuted, textAlign: 'center', lineHeight: 20, marginVertical: 16 },
  manageBtn: {
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primaryLight,
    alignItems: 'center',
  },
  manageBtnText: { color: c.primaryLight, fontWeight: '700' },
});

export function SharePickerModal({
  visible,
  scheduleIds,
  userId,
  onClose,
  onShared,
  onManageFriends,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [groups, setGroups] = useState<ShareGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [contactRows, groupRows] = await Promise.all([
        fetchShareContacts(userId),
        fetchShareGroups(userId),
      ]);
      setContacts(contactRows);
      setGroups(groupRows);
    } catch (err) {
      showAppAlert('불러오기 실패', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const shareWithContact = async (contact: ShareContact) => {
    if (sharing || scheduleIds.length === 0) return;
    setSharing(true);
    try {
      for (const scheduleId of scheduleIds) {
        await shareScheduleWithContact(
          scheduleId,
          userId,
          contact,
          contact.default_permission,
        );
      }
      showAppAlert(
        '공유 완료',
        `${scheduleIds.length}개 일정을 ${getContactLabel(contact)}에게 공유했습니다.`,
      );
      onShared();
      onClose();
    } catch (err) {
      showAppAlert('공유 실패', (err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const shareWithGroup = async (group: ShareGroupWithMembers) => {
    if (sharing || scheduleIds.length === 0) return;
    setSharing(true);
    try {
      let memberCount = 0;
      for (const scheduleId of scheduleIds) {
        memberCount = await shareScheduleWithGroup(scheduleId, userId, group, 'view');
      }
      showAppAlert(
        '공유 완료',
        `${scheduleIds.length}개 일정을 ${group.name} 그룹(${memberCount}명)에게 공유했습니다.`,
      );
      onShared();
      onClose();
    } catch (err) {
      showAppAlert('공유 실패', (err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>일정 공유</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} disabled={sharing}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {scheduleIds.length}개 일정 · 공유할 친구 또는 그룹을 선택하세요
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView>
              <Text style={styles.section}>친구 ({contacts.length})</Text>
              {contacts.length === 0 ? (
                <Text style={styles.empty}>
                  등록된 친구가 없습니다.{'\n'}친구 관리에서 이메일을 추가해 주세요.
                </Text>
              ) : (
                contacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    style={styles.row}
                    onPress={() => void shareWithContact(contact)}
                    disabled={sharing}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{getContactLabel(contact)}</Text>
                      <Text style={styles.rowEmail}>{contact.contact_email}</Text>
                    </View>
                    <Text style={styles.rowAction}>{sharing ? '...' : '공유'}</Text>
                  </Pressable>
                ))
              )}

              {groups.length > 0 ? (
                <>
                  <Text style={styles.section}>그룹 ({groups.length})</Text>
                  {groups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.row}
                      onPress={() => void shareWithGroup(group)}
                      disabled={sharing}
                    >
                      <View style={styles.rowMain}>
                        <Text style={styles.rowName}>{group.name}</Text>
                        <Text style={styles.rowEmail}>{group.members.length}명</Text>
                      </View>
                      <Text style={styles.rowAction}>{sharing ? '...' : '공유'}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {onManageFriends ? (
                <Pressable style={styles.manageBtn} onPress={onManageFriends} disabled={sharing}>
                  <Text style={styles.manageBtnText}>친구 목록 관리 →</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
