import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { getContactLabel, type ShareContact } from '../services/shareContacts';
import type { ShareGroupWithMembers } from '../services/shareGroups';

type Props = {
  group: ShareGroupWithMembers;
  contacts: ShareContact[];
  saving: boolean;
  onAddMember: (groupId: string, contactId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onDeleteGroup: (groupId: string) => void;
};

const createStyles = (c: ThemeColors) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.primary,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: c.text, fontWeight: '800', fontSize: 15 },
  delete: { color: c.danger, fontSize: 11, fontWeight: '700' },
  memberLabel: { color: c.textMuted, fontSize: 11, marginTop: 10, marginBottom: 4 },
  empty: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memberName: { color: c.text, fontSize: 13 },
  removeMember: { color: c.danger, fontSize: 18, fontWeight: '700', paddingHorizontal: 8 },
  addLabel: { color: c.textMuted, fontSize: 11, marginTop: 8, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: c.background,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipText: { color: c.primaryLight, fontSize: 11, fontWeight: '600' },
});

export function ShareGroupCard({
  group,
  contacts,
  saving,
  onAddMember,
  onRemoveMember,
  onDeleteGroup,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const memberContactIds = new Set(group.members.map((m) => m.contact_id));
  const availableContacts = contacts.filter((c) => !memberContactIds.has(c.id));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>👥 {group.name}</Text>
        <Pressable onPress={() => onDeleteGroup(group.id)} disabled={saving}>
          <Text style={styles.delete}>그룹 삭제</Text>
        </Pressable>
      </View>

      <Text style={styles.memberLabel}>멤버 ({group.members.length})</Text>
      {group.members.length === 0 ? (
        <Text style={styles.empty}>아래에서 친구를 추가하세요</Text>
      ) : (
        group.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>
              {member.contact ? getContactLabel(member.contact) : '친구'}
            </Text>
            <Pressable onPress={() => onRemoveMember(member.id)} disabled={saving}>
              <Text style={styles.removeMember}>×</Text>
            </Pressable>
          </View>
        ))
      )}

      {availableContacts.length > 0 ? (
        <>
          <Text style={styles.addLabel}>친구 추가</Text>
          <View style={styles.chipRow}>
            {availableContacts.map((contact) => (
              <Pressable
                key={contact.id}
                style={styles.chip}
                onPress={() => onAddMember(group.id, contact.id)}
                disabled={saving}
              >
                <Text style={styles.chipText}>+ {getContactLabel(contact)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
