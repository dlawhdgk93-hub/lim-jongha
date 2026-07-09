import { Platform } from 'react-native';

export function showAppAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${message}`);
    }
    return;
  }

  const { Alert } = require('react-native');
  Alert.alert(title, message);
}
