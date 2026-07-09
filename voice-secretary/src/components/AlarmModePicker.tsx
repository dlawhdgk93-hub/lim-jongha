import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { ALARM_MODE_OPTIONS, type AlarmMode } from '../constants/alarmModes';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  value: AlarmMode;
  onChange: (mode: AlarmMode) => void;
  compact?: boolean;
};

const createStyles = (c: ThemeColors) => ({
  label: { color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 6 },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
  },
  btnActive: { borderColor: c.primary, backgroundColor: `${c.primary}22` },
  btnText: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
  btnTextActive: { color: c.text, fontWeight: '700' },
});

export function AlarmModePicker({ value, onChange, compact }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={compact ? { marginTop: 8 } : { marginTop: 10 }}>
      <Text style={styles.label}>알림 방식</Text>
      <View style={styles.row}>
        {ALARM_MODE_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => onChange(option.id)}
            >
              <Text style={[styles.btnText, active && styles.btnTextActive]}>
                {option.emoji} {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
