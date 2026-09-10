import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web') {
  Alert.alert = (
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' | string }>
  ) => {
    const textContent = [title, message].filter(Boolean).join('\n\n');

    // Single action alert (e.g. Alert.alert('Error', 'Message'))
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined') {
        window.alert(textContent);
      }
      buttons?.[0]?.onPress?.();
      return;
    }

    // Multi-action confirmation alert (e.g. Cancel vs Log Out / Delete / Complete)
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    const actionButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(textContent);
      if (confirmed) {
        actionButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    }
  };
}
