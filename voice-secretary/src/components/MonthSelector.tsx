import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatMonthLabel } from '../utils/scheduleDates';

type Props = {
  monthKey: string;
  onPrev: () => void;
  onNext: () => void;
  onSelectCurrent: () => void;
};

const createStyles = (c: ThemeColors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },
  arrowText: { color: c.primaryLight, fontSize: 14, fontWeight: '700' },
  labelWrap: { flex: 1, alignItems: 'center' },
  label: { color: c.text, fontSize: 15, fontWeight: '700' },
  subLabel: { color: c.textMuted, fontSize: 10, marginTop: 2 },
});

export function MonthSelector({ monthKey, onPrev, onNext, onSelectCurrent }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Pressable style={styles.arrowBtn} onPress={onPrev}>
        <Text style={styles.arrowText}>◀</Text>
      </Pressable>
      <Pressable style={styles.labelWrap} onPress={onSelectCurrent}>
        <Text style={styles.label}>{formatMonthLabel(monthKey)}</Text>
        <Text style={styles.subLabel}>탭하면 이번 달로</Text>
      </Pressable>
      <Pressable style={styles.arrowBtn} onPress={onNext}>
        <Text style={styles.arrowText}>▶</Text>
      </Pressable>
    </View>
  );
}
