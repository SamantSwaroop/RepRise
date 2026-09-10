import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatTimerSeconds } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { useRestTimerStore } from '../stores/restTimerStore';

export function FloatingRestTimer() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    isActive,
    isPaused,
    remaining,
    meta,
    addSeconds,
    stopTimer,
  } = useRestTimerStore();

  // If timer is not running, don't show
  if (!isActive) return null;

  // If user is currently looking at the workout detail screen, don't overlap with the in-workout timer
  if (pathname.includes('/workout/')) return null;

  const handleReturnToWorkout = () => {
    if (meta?.workoutId) {
      router.push({
        pathname: '/workout/[id]',
        params: { id: meta.workoutId },
      });
    }
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <Pressable
        style={styles.pill}
        onPress={handleReturnToWorkout}
      >
        {/* Left: Icon & Live Countdown */}
        <View style={styles.pillLeft}>
          <View style={[styles.iconCircle, isPaused && styles.iconCirclePaused]}>
            <Ionicons
              name={isPaused ? 'pause' : 'hourglass'}
              size={14}
              color="#2E3440"
            />
          </View>
          <View>
            <Text style={styles.timeText}>{formatTimerSeconds(remaining)}</Text>
            <Text style={styles.labelText}>Rest Timer</Text>
          </View>
        </View>

        {/* Right: +30s button & dismiss */}
        <View style={styles.pillRight}>
          <Pressable
            style={styles.quickAddBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={(e) => {
              e.stopPropagation();
              addSeconds(30);
            }}
          >
            <Text style={styles.quickAddText}>+30s</Text>
          </Pressable>

          <Pressable
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              stopTimer();
            }}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const isIOSDevice =
  Platform.OS === 'ios' ||
  (Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: isIOSDevice ? 98 : 80,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B4252FA',
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePaused: {
    backgroundColor: '#EBCB8B',
  },
  timeText: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  labelText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
    maxWidth: 180,
  },
  pillRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickAddBtn: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
