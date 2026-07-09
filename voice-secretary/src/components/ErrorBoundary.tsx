import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemeStore } from '../store/themeStore';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  componentStack: string;
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      padding: 24,
    },
    title: { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
    box: {
      maxHeight: 200,
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    message: { color: c.danger, fontSize: 13, lineHeight: 20 },
    stack: { color: c.textMuted, fontSize: 11, lineHeight: 16, marginTop: 10 },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    btnText: { color: '#fff', fontWeight: '700' },
  });

async function reloadApp() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
    return;
  }

  try {
    const Updates = require('expo-updates') as {
      reloadAsync?: () => Promise<void>;
    };
    if (typeof Updates.reloadAsync === 'function') {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // fall through
  }

  throw new Error('reload-unavailable');
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' });
    console.error('App crash:', error, info.componentStack);
  }

  handleReload = () => {
    void reloadApp().catch(() => {
      this.setState({ error: null, componentStack: '' });
    });
  };

  render() {
    if (this.state.error) {
      const styles = createStyles(useThemeStore.getState().colors);

      return (
        <View style={styles.container}>
          <Text style={styles.title}>앱을 불러오지 못했습니다</Text>
          <ScrollView style={styles.box}>
            <Text style={styles.message}>{this.state.error.message}</Text>
            {this.state.componentStack ? (
              <Text style={styles.stack}>{this.state.componentStack.slice(0, 600)}</Text>
            ) : null}
          </ScrollView>
          <Pressable style={styles.btn} onPress={this.handleReload}>
            <Text style={styles.btnText}>새로고침</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
