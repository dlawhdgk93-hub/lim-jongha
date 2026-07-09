import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StatusBar } from 'expo-status-bar';

import { useEffect, useMemo, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';

import { RootStackParamList } from './src/navigation/RootNavigator';

import { AuthScreen } from './src/screens/AuthScreen';

import { DetailScreen } from './src/screens/DetailScreen';

import { HomeScreen } from './src/screens/HomeScreen';

import { OnboardingScreen } from './src/screens/OnboardingScreen';

import { SettingsScreen } from './src/screens/SettingsScreen';

import { ShareScreen } from './src/screens/ShareScreen';

import { useAudioRecorder } from './src/hooks/useAudioRecorder';

import { registerForPushNotifications, requestNotificationPermission } from './src/services/pushNotification';

import { supabase } from './src/services/supabase';

import { useAuthStore } from './src/store/scheduleStore';

import { useAlarmSoundStore } from './src/store/alarmSoundStore';

import { useThemeStore } from './src/store/themeStore';

import { setupAlarmAudioUnlockListeners } from './src/services/alarmSound';



const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY = 'voice_secretary_onboarding_done';

const INIT_TIMEOUT_MS = 8000;



function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {

  return Promise.race([

    promise,

    new Promise<T>((_, reject) =>

      setTimeout(() => reject(new Error('timeout')), ms),

    ),

  ]);

}



function AppContent() {

  const { session, loading, setSession, setLoading } = useAuthStore();

  const colors = useThemeStore((s) => s.colors);

  const themeMode = useThemeStore((s) => s.mode);

  const themeReady = useThemeStore((s) => s.ready);

  const loadTheme = useThemeStore((s) => s.loadTheme);

  const loadAlarmSound = useAlarmSoundStore((s) => s.loadSound);

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  const [initError, setInitError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  const { requestPermission } = useAudioRecorder();



  useEffect(() => {

    loadTheme();

    loadAlarmSound();

  }, [loadTheme, loadAlarmSound]);



  useEffect(() => setupAlarmAudioUnlockListeners(), []);



  const navTheme = useMemo(

    () => ({

      ...DefaultTheme,

      dark: themeMode === 'dark',

      colors: {

        ...DefaultTheme.colors,

        background: colors.background,

        card: colors.surface,

        text: colors.text,

        border: colors.border,

        primary: colors.primary,

      },

    }),

    [colors, themeMode],

  );



  const statusBarStyle = themeMode === 'dark' ? 'light' : 'dark';

  useEffect(() => {

    let mounted = true;



    const init = async () => {

      setInitError(null);

      setLoading(true);



      try {

        const stored = await withTimeout(

          AsyncStorage.getItem(ONBOARDING_KEY),

          INIT_TIMEOUT_MS,

        );

        if (mounted) {

          setOnboardingDone(Platform.OS === 'web' ? true : stored === 'true');

        }

      } catch {

        if (mounted) setOnboardingDone(Platform.OS === 'web' ? true : false);

      }



      try {

        const { data } = await withTimeout(

          supabase.auth.getSession(),

          INIT_TIMEOUT_MS,

        );

        if (mounted) setSession(data.session);

      } catch {

        if (mounted) {

          setSession(null);

          setInitError('서버 연결 지연. 로그인 화면으로 진행합니다.');

        }

      } finally {

        if (mounted) setLoading(false);

      }

    };



    init();



    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {

      setSession(nextSession);

    });



    return () => {

      mounted = false;

      listener.subscription.unsubscribe();

    };

  }, [retryKey, setSession, setLoading]);



  const completeOnboarding = async () => {

    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

    setOnboardingDone(true);

  };



  if (!themeReady || loading || onboardingDone === null) {

    return (

      <SafeAreaProvider>

        <View

          style={{

            flex: 1,

            backgroundColor: colors.background,

            justifyContent: 'center',

            alignItems: 'center',

            padding: 24,

          }}

        >

          <ActivityIndicator color={colors.primary} size="large" />

          <Text style={{ color: colors.textMuted, marginTop: 16 }}>앱 불러오는 중...</Text>

        </View>

      </SafeAreaProvider>

    );

  }



  if (initError && !session) {

    return (

      <SafeAreaProvider>

        <View

          style={{

            flex: 1,

            backgroundColor: colors.background,

            justifyContent: 'center',

            padding: 24,

          }}

        >

          <Text style={{ color: colors.text, fontSize: 16, marginBottom: 12 }}>{initError}</Text>

          <Pressable

            style={{

              backgroundColor: colors.primary,

              padding: 14,

              borderRadius: 10,

              alignItems: 'center',

            }}

            onPress={() => setRetryKey((k) => k + 1)}

          >

            <Text style={{ color: '#fff', fontWeight: '700' }}>다시 시도</Text>

          </Pressable>

        </View>

      </SafeAreaProvider>

    );

  }



  if (!session) {

    return (

      <SafeAreaProvider>

        <StatusBar style={statusBarStyle} />

        <AuthScreen onSignedIn={() => undefined} />

      </SafeAreaProvider>

    );

  }



  if (!onboardingDone) {

    return (

      <SafeAreaProvider>

        <StatusBar style={statusBarStyle} />

        <OnboardingScreen

          onComplete={completeOnboarding}

          onRequestMic={requestPermission}

          onRequestPush={requestNotificationPermission}

        />

      </SafeAreaProvider>

    );

  }



  return (

    <SafeAreaProvider>

      <StatusBar style={statusBarStyle} />

      <NavigationContainer theme={navTheme}>

        <Stack.Navigator

          screenOptions={{

            headerStyle: { backgroundColor: colors.surface },

            headerTintColor: colors.text,

            contentStyle: { backgroundColor: colors.background },

          }}

        >

          <Stack.Screen

            name="Home"

            component={HomeScreen}

            options={{ headerShown: false }}

          />

          <Stack.Screen

            name="Detail"

            component={DetailScreen}

            options={{

              title: '일정 수정',

              headerStyle: { backgroundColor: colors.surface },

              headerTintColor: colors.text,

              contentStyle: { backgroundColor: colors.background, flex: 1 },

              animation: Platform.OS === 'web' ? 'fade' : 'default',

            }}

          />

          <Stack.Screen

            name="Settings"

            component={SettingsScreen}

            options={{ title: '설정' }}

          />

          <Stack.Screen

            name="Share"

            component={ShareScreen}

            options={{

              title: '친구 목록',

              headerBackTitle: '목록',

            }}

          />

        </Stack.Navigator>

      </NavigationContainer>

    </SafeAreaProvider>

  );

}



export default function App() {

  return (

    <ErrorBoundary>

      <AppContent />

    </ErrorBoundary>

  );

}


