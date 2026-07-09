import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  onComplete: () => void | Promise<void>;
  onRequestMic: () => Promise<boolean>;
  onRequestPush: () => Promise<boolean>;
};

const createStyles = (c: ThemeColors) => ({
  safe: { flex: 1, backgroundColor: c.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { color: c.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  desc: { color: c.textMuted, marginBottom: 24, lineHeight: 22 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: c.textMuted, fontSize: 14 },
  button: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  skipText: { color: c.textMuted, fontSize: 14 },
  hint: { color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});

export function OnboardingScreen({ onComplete, onRequestMic, onRequestPush }: Props) {
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);

  const finish = async (requestPermissions: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (requestPermissions) {
        try {
          await onRequestMic();
        } catch {
          // 권한 거부해도 앱은 시작
        }
        if (Platform.OS !== 'web') {
          try {
            const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
            await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          } catch {
            // 음성 인식 권한 실패해도 앱은 시작
          }
        }
        try {
          await onRequestPush();
        } catch {
          // 푸시 토큰 실패해도 로컬 알림은 사용 가능
        }
      }
      await onComplete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>팀데이 시작하기</Text>
        <Text style={styles.desc}>
          음성으로 일정을 등록하고 알림을 받으려면 아래 권한이 필요합니다. 거부해도 앱을
          사용할 수 있습니다.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎤 마이크 · 음성 인식</Text>
          <Text style={styles.cardDesc}>음성으로 일정을 빠르게 등록합니다.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔔 알림 · 알람</Text>
          <Text style={styles.cardDesc}>
            일정 시간에 알림과 알람음이 울립니다. Android에서는 정확한 알람 허용 화면이 추가로
            뜰 수 있습니다.
          </Text>
        </View>

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={() => void finish(true)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>권한 허용하고 시작</Text>
          )}
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => void finish(false)} disabled={busy}>
          <Text style={styles.skipText}>건너뛰고 시작</Text>
        </Pressable>

        {busy ? (
          <Text style={styles.hint}>권한 요청 중… 잠시만 기다려 주세요.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
