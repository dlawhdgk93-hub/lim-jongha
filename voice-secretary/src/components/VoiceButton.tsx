import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef } from 'react';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  isRecording: boolean;
  parsing: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

const createStyles = (c: ThemeColors) => ({
  wrapper: { alignItems: 'center', gap: 16 },
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonRecording: { backgroundColor: c.danger },
  buttonParsing: { backgroundColor: c.border },
  icon: { fontSize: 36 },
  label: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
});

export function VoiceButton({ isRecording, parsing, onPress, onLongPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isRecording, pulse]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          style={[
            styles.button,
            isRecording && styles.buttonRecording,
            parsing && styles.buttonParsing,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={parsing}
        >
          {parsing ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.icon}>{isRecording ? '⏹' : '🎤'}</Text>
          )}
        </Pressable>
      </Animated.View>
      <Text style={styles.label}>
        {parsing ? '분석 중...' : isRecording ? '듣고 있어요 (3초 무음 시 종료)' : '탭하여 말해보세요'}
      </Text>
    </View>
  );
}
