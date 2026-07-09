import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { ALARM_SOUND_OPTIONS, type AlarmSoundId } from '../constants/alarmSounds';
import { PLANS } from '../constants/config';
import { useThemeMode, useThemedStyles } from '../hooks/useThemedStyles';
import { previewAlarmSound } from '../services/alarmSound';
import { supabase } from '../services/supabase';
import { useAlarmSoundStore } from '../store/alarmSoundStore';
import { useAuthStore } from '../store/scheduleStore';
import { useThemeStore } from '../store/themeStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const createStyles = (c: ThemeColors) => ({
    container: { flex: 1, backgroundColor: c.background, padding: 20, paddingTop: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { color: c.textMuted, fontSize: 13, marginBottom: 8 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    planName: { color: c.text, fontSize: 18, fontWeight: '700' },
    planDesc: { color: c.textMuted, marginTop: 4 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    rowLabel: { color: c.text },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: c.text, fontSize: 18 },
    stepValue: { color: c.text, fontWeight: '700', minWidth: 24, textAlign: 'center' },
    themeRow: { flexDirection: 'row', gap: 10 },
    themeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      backgroundColor: c.background,
    },
    themeBtnActive: { borderColor: c.primary, backgroundColor: c.surface },
    themeBtnText: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
    themeBtnTextActive: { color: c.text, fontWeight: '800' },
    email: { color: c.textMuted },
    saveBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: { color: '#fff', fontWeight: '700' },
    logoutBtn: { marginTop: 16, padding: 16, alignItems: 'center' },
    logoutBtnText: { color: c.danger },
    soundRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
      gap: 10,
    },
    soundRowActive: { borderColor: c.primary, backgroundColor: c.background },
    soundMain: { flex: 1 },
    soundLabel: { color: c.text, fontWeight: '700', fontSize: 15 },
    soundDesc: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    previewBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    previewBtnText: { color: c.primaryLight, fontWeight: '700', fontSize: 12 },
    previewBtnPlaying: { borderColor: c.primary, backgroundColor: c.surface },
    previewHint: { color: c.textMuted, fontSize: 11, marginTop: 6 },
  });

export function SettingsScreen(_props: Props) {
  const styles = useThemedStyles(createStyles);
  const themeMode = useThemeMode();
  const setThemeMode = useThemeStore((s) => s.setMode);
  const alarmSoundId = useAlarmSoundStore((s) => s.soundId);
  const setAlarmSoundId = useAlarmSoundStore((s) => s.setSoundId);
  const user = useAuthStore((s) => s.user);
  const [planType, setPlanType] = useState<string>('starter');
  const [leadMinutes, setLeadMinutes] = useState(10);
  const [previewingId, setPreviewingId] = useState<AlarmSoundId | null>(null);

  const handlePreviewSound = async (soundId: AlarmSoundId) => {
    setPreviewingId(soundId);
    try {
      const ok = await previewAlarmSound(soundId);
      if (!ok) {
        Alert.alert(
          '소리 재생 실패',
          Platform.OS === 'web'
            ? '브라우저에서 소리가 차단되었을 수 있습니다.\n탭/PC 볼륨을 확인하고 다시 눌러 주세요.'
            : '기기 볼륨과 무음 모드를 확인한 뒤 다시 눌러 주세요.',
        );
      }
    } finally {
      setTimeout(() => setPreviewingId(null), 1200);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('plan_type, notification_lead_minutes')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPlanType(data.plan_type);
          setLeadMinutes(data.notification_lead_minutes);
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ notification_lead_minutes: leadMinutes })
      .eq('id', user.id);

    if (error) {
      Alert.alert('오류', error.message);
    } else {
      Alert.alert('저장됨', '설정이 저장되었습니다.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const plan = PLANS[planType as keyof typeof PLANS] ?? PLANS.starter;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>화면 테마</Text>
        <View style={styles.themeRow}>
          <Pressable
            style={[styles.themeBtn, themeMode === 'dark' && styles.themeBtnActive]}
            onPress={() => setThemeMode('dark')}
          >
            <Text
              style={[styles.themeBtnText, themeMode === 'dark' && styles.themeBtnTextActive]}
            >
              🌙 어두운 모드
            </Text>
          </Pressable>
          <Pressable
            style={[styles.themeBtn, themeMode === 'light' && styles.themeBtnActive]}
            onPress={() => setThemeMode('light')}
          >
            <Text
              style={[styles.themeBtnText, themeMode === 'light' && styles.themeBtnTextActive]}
            >
              ☀️ 밝은 모드
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알람음</Text>
        <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: -4 }]}>
          일정 시간에 선택한 소리가 반복 재생됩니다
        </Text>
        {ALARM_SOUND_OPTIONS.map((option) => {
          const selected = alarmSoundId === option.id;
          return (
            <View key={option.id} style={[styles.soundRow, selected && styles.soundRowActive]}>
              <Pressable style={styles.soundMain} onPress={() => setAlarmSoundId(option.id)}>
                <Text style={styles.soundLabel}>
                  {option.emoji} {option.label}
                </Text>
                <Text style={styles.soundDesc}>{option.description}</Text>
              </Pressable>
              <Pressable
                style={[styles.previewBtn, previewingId === option.id && styles.previewBtnPlaying]}
                onPress={() => void handlePreviewSound(option.id)}
              >
                <Text style={styles.previewBtnText}>
                  {previewingId === option.id ? '🔊 재생 중' : '▶ 듣기'}
                </Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.previewHint}>듣기 버튼을 누르면 바로 소리가 나와야 합니다.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>플랜</Text>
        <View style={styles.card}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planDesc}>
            음성 파싱 {plan.dailyVoiceLimit === Infinity ? '무제한' : `일 ${plan.dailyVoiceLimit}회`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>사전 알림 (분)</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setLeadMinutes((v) => Math.max(0, v - 5))}
            >
              <Text style={styles.stepBtnText}>-</Text>
            </Pressable>
            <Text style={styles.stepValue}>{leadMinutes}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setLeadMinutes((v) => v + 5)}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>설정 저장</Text>
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}
