import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import { signInWithEmail, signUpWithEmail } from '../services/auth';

type Props = {
  onSignedIn: () => void;
};

function showMessage(title: string, message: string, setInline: (msg: string) => void) {
  if (Platform.OS === 'web') {
    setInline(`${title}: ${message}`);
    return;
  }
  Alert.alert(title, message);
}

const createStyles = (c: ThemeColors) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { color: c.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: c.textMuted, marginTop: 8, textAlign: 'center' },
  form: { gap: 12 },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: c.text,
    fontSize: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  button: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { color: c.primaryLight, textAlign: 'center', marginTop: 16 },
  errorBox: {
    backgroundColor: 'rgba(225, 112, 85, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: c.danger,
  },
  errorText: { color: c.danger, fontSize: 14, lineHeight: 20 },
});

function toUserMessage(error: unknown): string {
  const message = (error as Error).message ?? '알 수 없는 오류가 발생했습니다.';
  if (message.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (message.includes('already') || message.includes('registered')) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.';
  }
  return message;
}

export function AuthScreen({ onSignedIn }: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setInlineError(null);

    if (!email.trim() || !password.trim()) {
      showMessage('입력 오류', '이메일과 비밀번호를 입력해 주세요.', setInlineError);
      return;
    }

    if (password.length < 6) {
      showMessage('입력 오류', '비밀번호는 6자 이상이어야 합니다.', setInlineError);
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSignedIn();
    } catch (error) {
      setInlineError(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🎤</Text>
        <Text style={styles.title}>팀데이</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? '이메일과 비밀번호만 입력하면 바로 시작' : '말 한마디로 끝내는 3초 일정 관리'}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={handleSubmit}
        />

        {inlineError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? '회원가입' : '로그인'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setIsSignUp((prev) => !prev);
            setInlineError(null);
          }}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
