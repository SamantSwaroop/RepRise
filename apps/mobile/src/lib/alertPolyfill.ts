import { Alert, Platform } from 'react-native';
import { useConfirmStore } from '../stores/confirmStore';
import { toast } from '../stores/toastStore';

if (Platform.OS === 'web') {
  Alert.alert = (
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' | string }>
  ) => {
    // Single-action notification alert (e.g. Alert.alert('Error', 'Something went wrong'))
    if (!buttons || buttons.length <= 1) {
      const text = [title, message].filter(Boolean).join(': ');
      if (title.toLowerCase().includes('error') || title.toLowerCase().includes('fail')) {
        toast.error(text || 'An error occurred');
      } else {
        toast.info(text || title);
      }
      buttons?.[0]?.onPress?.();
      return;
    }

    // Multi-action confirmation dialog (e.g. Log Out, Delete, Complete Workout)
    const cancelButton = buttons.find((b) => b.style === 'cancel') || (buttons.length > 1 ? buttons[0] : undefined);
    const actionButton =
      buttons.find((b) => b.style !== 'cancel' && b !== cancelButton) || buttons[buttons.length - 1];

    useConfirmStore.getState().showConfirm({
      title,
      message,
      confirmText: actionButton?.text || 'Confirm',
      cancelText: cancelButton?.text || 'Cancel',
      isDestructive: actionButton?.style === 'destructive',
      onConfirm: async () => {
        await actionButton?.onPress?.();
      },
      onCancel: () => {
        cancelButton?.onPress?.();
      },
    });
  };
}
