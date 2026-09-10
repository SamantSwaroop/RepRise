import { StyleSheet, Text, Pressable, View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/tokens';
import { useSyncStore } from '../stores/syncStore';

export function SyncStatusBadge() {
  const status = useSyncStore((s) => s.status);
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const setModalVisible = useSyncStore((s) => s.setModalVisible);

  // Subtle pulsing animation when syncing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'syncing') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const getBadgeContent = () => {
    if (!isOnline || status === 'offline') {
      return {
        icon: 'cloud-offline-outline' as const,
        text: pendingCount > 0 ? `${pendingCount}` : 'Offline',
        color: colors.warning,
        bgColor: 'rgba(235, 203, 139, 0.15)',
        borderColor: 'rgba(235, 203, 139, 0.3)',
      };
    }

    if (status === 'syncing') {
      return {
        icon: 'sync-outline' as const,
        text: 'Syncing',
        color: colors.accent,
        bgColor: 'rgba(136, 192, 208, 0.15)',
        borderColor: 'rgba(136, 192, 208, 0.3)',
      };
    }

    if (status === 'error') {
      return {
        icon: 'alert-circle-outline' as const,
        text: 'Sync error',
        color: colors.danger,
        bgColor: 'rgba(191, 97, 106, 0.15)',
        borderColor: 'rgba(191, 97, 106, 0.3)',
      };
    }

    // Idle & synced
    return {
      icon: 'cloud-done-outline' as const,
      text: pendingCount > 0 ? `${pendingCount} pending` : 'Synced',
      color: pendingCount > 0 ? colors.warning : colors.textSecondary,
      bgColor: 'rgba(46, 52, 64, 0.6)',
      borderColor: 'rgba(76, 86, 106, 0.4)',
    };
  };

  const badge = getBadgeContent();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: badge.bgColor, borderColor: badge.borderColor },
        pressed && styles.pressed,
      ]}
      onPress={() => setModalVisible(true)}
      hitSlop={8}
    >
      <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={badge.icon} size={14} color={badge.color} style={styles.icon} />
        <Text style={[styles.text, { color: badge.color }]}>{badge.text}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
