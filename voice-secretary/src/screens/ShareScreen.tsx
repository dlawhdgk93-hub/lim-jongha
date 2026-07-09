import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { ShareContactCard } from '../components/ShareContactCard';
import { ShareGroupCard } from '../components/ShareGroupCard';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import {
  addShareContact,
  fetchShareContacts,
  removeShareContact,
  updateShareContactSettings,
  type ShareContact,
  type ShareContactSettings,
} from '../services/shareContacts';
import {
  addContactToGroup,
  createShareGroup,
  deleteShareGroup,
  fetchShareGroups,
  removeContactFromGroup,
  type ShareGroupWithMembers,
} from '../services/shareGroups';
import { useAuthStore } from '../store/scheduleStore';
import { showAppAlert } from '../utils/showAppAlert';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Share'>;

const createStyles = (c: ThemeColors) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 40 },
  planCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 16,
  },
  planTitle: { color: c.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  planIntro: { color: c.textMuted, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  sectionHint: { color: c.textMuted, fontSize: 11, marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    color: c.text,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  empty: { color: c.textMuted, textAlign: 'center', lineHeight: 22, marginVertical: 12 },
  groupCreateRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  groupInput: { flex: 1, marginBottom: 0 },
  groupCreateBtn: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupCreateBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  homeBtn: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primaryLight,
    alignItems: 'center',
  },
  homeBtnText: { color: c.primaryLight, fontWeight: '700' },
});

export function ShareScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [groups, setGroups] = useState<ShareGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [groupName, setGroupName] = useState('');

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [contactRows, groupRows] = await Promise.all([
        fetchShareContacts(user.id),
        fetchShareGroups(user.id),
      ]);
      setContacts(contactRows);
      setGroups(groupRows);
    } catch (err) {
      showAppAlert('불러오기 실패', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const goHome = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      }),
    );
  }, [navigation]);

  const handleAddContact = async () => {
    if (!user?.id || !email.trim()) return;
    if (email.trim().toLowerCase() === user.email?.toLowerCase()) {
      showAppAlert('안내', '본인 이메일은 추가할 수 없습니다.');
      return;
    }

    setSaving(true);
    try {
      await addShareContact(user.id, email, nickname);
      setEmail('');
      setNickname('');
      await loadAll();
    } catch (err) {
      showAppAlert('추가 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContact = async (contactId: string, settings: ShareContactSettings) => {
    setSaving(true);
    try {
      await updateShareContactSettings(contactId, settings);
      await loadAll();
    } catch (err) {
      showAppAlert('저장 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveContact = async (contact: ShareContact) => {
    setSaving(true);
    try {
      await removeShareContact(contact.id);
      await loadAll();
    } catch (err) {
      showAppAlert('삭제 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.id || !groupName.trim()) return;
    setSaving(true);
    try {
      await createShareGroup(user.id, groupName);
      setGroupName('');
      await loadAll();
    } catch (err) {
      showAppAlert('그룹 생성 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (groupId: string, contactId: string) => {
    setSaving(true);
    try {
      await addContactToGroup(groupId, contactId);
      await loadAll();
    } catch (err) {
      showAppAlert('추가 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setSaving(true);
    try {
      await removeContactFromGroup(memberId);
      await loadAll();
    } catch (err) {
      showAppAlert('제거 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setSaving(true);
    try {
      await deleteShareGroup(groupId);
      await loadAll();
    } catch (err) {
      showAppAlert('삭제 실패', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>👥 친구 목록</Text>
        <Text style={styles.planIntro}>
          공유할 친구를 등록해 두세요. 홈에서 일정을 길게 눌러 선택한 뒤 공유 버튼으로 보낼 수
          있습니다. 가족·팀은 그룹으로 묶어 한 번에 공유할 수 있습니다.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>친구 추가</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="friend@email.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="별명 (선택) 예: 엄마, 팀장"
        placeholderTextColor={colors.textMuted}
      />
      <Pressable
        style={[styles.primaryBtn, (saving || !email.trim()) && styles.btnDisabled]}
        onPress={handleAddContact}
        disabled={saving || !email.trim()}
      >
        <Text style={styles.primaryBtnText}>{saving ? '추가 중...' : '친구 추가'}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>내 친구 ({contacts.length})</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : contacts.length === 0 ? (
        <Text style={styles.empty}>등록된 친구가 없습니다. 위에서 이메일을 추가해 주세요.</Text>
      ) : (
        contacts.map((contact) => (
          <ShareContactCard
            key={contact.id}
            contact={contact}
            saving={saving}
            onUpdate={handleUpdateContact}
            onRemove={handleRemoveContact}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>그룹 ({groups.length})</Text>
      <Text style={styles.sectionHint}>일정 선택 후 그룹으로 한 번에 공유할 수 있습니다</Text>
      <View style={styles.groupCreateRow}>
        <TextInput
          style={[styles.input, styles.groupInput]}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="그룹 이름 (예: 우리 가족, A팀)"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          style={[styles.groupCreateBtn, (saving || !groupName.trim()) && styles.btnDisabled]}
          onPress={handleCreateGroup}
          disabled={saving || !groupName.trim()}
        >
          <Text style={styles.groupCreateBtnText}>만들기</Text>
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <Text style={styles.empty}>그룹을 만들고 친구를 추가하세요.</Text>
      ) : (
        groups.map((group) => (
          <ShareGroupCard
            key={group.id}
            group={group}
            contacts={contacts}
            saving={saving}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onDeleteGroup={handleDeleteGroup}
          />
        ))
      )}

      <Pressable style={styles.homeBtn} onPress={goHome}>
        <Text style={styles.homeBtnText}>← 일정 목록으로</Text>
      </Pressable>
    </ScrollView>
  );
}
