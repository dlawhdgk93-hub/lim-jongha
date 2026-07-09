import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  getContactLabel,
  type ShareContact,
  type ShareContactSettings,
} from '../services/shareContacts';

type Props = {
  contact: ShareContact;
  saving: boolean;
  onUpdate: (contactId: string, settings: ShareContactSettings) => void;
  onRemove: (contact: ShareContact) => void;
};

const createStyles = (c: ThemeColors) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  info: { flex: 1 },
  name: { color: c.text, fontWeight: '700', fontSize: 14 },
  email: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  pending: { color: c.warning, fontSize: 10, marginTop: 4 },
  remove: { color: c.danger, fontWeight: '700', fontSize: 12 },
  ruleLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    backgroundColor: c.background,
  },
  toggleOnPerm: { borderColor: c.primary, backgroundColor: c.surface },
  toggleText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  toggleTextOn: { color: c.text, fontWeight: '700' },
});

export function ShareContactCard({ contact, saving, onUpdate, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);

  const setPermission = (permission: 'view' | 'edit') => {
    if (contact.default_permission === permission) return;
    onUpdate(contact.id, { default_permission: permission });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{getContactLabel(contact)}</Text>
          <Text style={styles.email}>{contact.contact_email}</Text>
          {!contact.contact_user_id ? (
            <Text style={styles.pending}>가입 전 · 가입 후 자동 연결</Text>
          ) : null}
        </View>
        <Pressable onPress={() => onRemove(contact)} disabled={saving}>
          <Text style={styles.remove}>삭제</Text>
        </Pressable>
      </View>

      <Text style={styles.ruleLabel}>공유 시 기본 권한</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, contact.default_permission === 'view' && styles.toggleOnPerm]}
          onPress={() => setPermission('view')}
          disabled={saving}
        >
          <Text
            style={[
              styles.toggleText,
              contact.default_permission === 'view' && styles.toggleTextOn,
            ]}
          >
            보기만
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, contact.default_permission === 'edit' && styles.toggleOnPerm]}
          onPress={() => setPermission('edit')}
          disabled={saving}
        >
          <Text
            style={[
              styles.toggleText,
              contact.default_permission === 'edit' && styles.toggleTextOn,
            ]}
          >
            수정 가능
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
