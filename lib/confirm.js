import { Alert, Platform } from 'react-native';

// Alert.alert renders nothing on react-native-web, so confirmations silently
// no-op there. These helpers fall back to window.confirm/alert on web.
export function confirmAsync(title, message) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'ביטול', style: 'cancel', onPress: () => resolve(false) },
      { text: 'אישור', onPress: () => resolve(true) },
    ]);
  });
}

export function alertAsync(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: 'אישור', onPress: () => resolve() }]);
  });
}
