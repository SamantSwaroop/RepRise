import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

// Configure foreground notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Graceful fallback for non-native environments
}

export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rest-timer', {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#88C0D0',
        sound: 'default',
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (err) {
    console.warn('[notifications] Failed to initialize notification channels:', err);
  }
}

export async function scheduleRestNotification(params: {
  seconds: number;
  workoutId?: string;
}): Promise<string | null> {
  if (Platform.OS === 'web' || params.seconds <= 0) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return null;
    }

    const { workoutId } = params;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Complete! ⏱️',
        body: 'Time for your next set!',
        sound: 'default',
        data: {
          workoutId,
          type: 'rest_timer',
        },
        ...(Platform.OS === 'android' ? { channelId: 'rest-timer' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(params.seconds)),
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('[notifications] Failed to schedule rest notification:', err);
    return null;
  }
}

export async function cancelRestNotification(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    // Ignore cancellation errors
  }
}

export async function triggerTimerFinishedFeedback(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 400, 200, 400]);
    } else {
      Vibration.vibrate(400);
    }
  } catch {
    Vibration.vibrate(400);
  }
}
