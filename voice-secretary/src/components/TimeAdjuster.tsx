import { Pressable, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { shiftDateTimeFields } from '../utils/timeAdjust';

type Props = {
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
  compact?: boolean;
};

const createStyles = (c: ThemeColors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  rowCompact: { marginTop: 6 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  btnText: { color: c.primaryLight, fontSize: 12, fontWeight: '700' },
  time: { color: c.text, fontSize: 16, fontWeight: '800', minWidth: 56, textAlign: 'center' },
});

export function TimeAdjuster({ date, time, onChange, compact }: Props) {
  const styles = useThemedStyles(createStyles);

  const shift = (deltaMinutes: number) => {
    onChange(shiftDateTimeFields(date, time, deltaMinutes));
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable style={styles.btn} onPress={() => shift(-1)}>
        <Text style={styles.btnText}>-1분</Text>
      </Pressable>
      <Text style={styles.time}>{time || '--:--'}</Text>
      <Pressable style={styles.btn} onPress={() => shift(1)}>
        <Text style={styles.btnText}>+1분</Text>
      </Pressable>
    </View>
  );
}
