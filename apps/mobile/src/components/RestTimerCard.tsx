import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatTimerSeconds,
  PRESET_REST_DURATIONS,
  type RestTimerMeta,
} from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { useRestTimerStore } from '../stores/restTimerStore';

interface RestTimerCardProps {
  currentMeta?: RestTimerMeta;
  defaultCollapsed?: boolean;
}

export function RestTimerCard({ currentMeta, defaultCollapsed = false }: RestTimerCardProps) {
  const {
    isActive,
    isPaused,
    duration,
    remaining,
    meta,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    addSeconds,
    stopTimer,
    updateSettings,
  } = useRestTimerStore();

  const [collapsed, setCollapsed] = useState(defaultCollapsed && !isActive);

  // If timer becomes active, automatically uncollapse
  React.useEffect(() => {
    if (isActive) {
      setCollapsed(false);
    }
  }, [isActive]);

  const activeMeta = meta || currentMeta;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100)) : 0;

  const animatedProgress = useRef(new Animated.Value(progressPercent)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressPercent,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const widthInterpolation = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const isUrgent = isActive && remaining <= 10 && remaining > 0;

  const handleStartPreset = (sec: number) => {
    updateSettings({ defaultDuration: sec });
    startTimer(sec, activeMeta ?? undefined);
  };

  return (
    <View style={styles.card}>
      {/* Top Header Bar */}
      <Pressable
        style={styles.header}
        onPress={() => setCollapsed((prev) => !prev)}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
            <Ionicons
              name={isActive ? (isPaused ? 'pause' : 'hourglass-outline') : 'timer-outline'}
              size={18}
              color={isActive ? (isUrgent ? colors.warning : colors.accent) : colors.textMuted}
            />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Rest Timer</Text>
              {isActive && (
                <View style={[styles.statusBadge, isPaused && styles.statusBadgePaused]}>
                  <Text style={styles.statusBadgeText}>
                    {isPaused ? 'PAUSED' : isUrgent ? 'FINAL SECONDS' : 'RESTING'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.subtext}>
              {isActive ? 'Catch your breath & recover' : `Default: ${formatTimerSeconds(settings.defaultDuration)}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isActive && (
            <Text style={[styles.headerMiniCountdown, isUrgent && { color: colors.warning }]}>
              {formatTimerSeconds(remaining)}
            </Text>
          )}
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.textMuted}
            style={{ marginLeft: spacing.xs }}
          />
        </View>
      </Pressable>

      {/* Progress Bar (Always visible when active, even if collapsed) */}
      {isActive && (
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: widthInterpolation },
              isUrgent && { backgroundColor: colors.warning },
            ]}
          />
        </View>
      )}

      {/* Expanded Content */}
      {!collapsed && (
        <View style={styles.body}>
          {/* Large Countdown Display */}
          <View style={styles.countdownContainer}>
            <Text
              style={[
                styles.countdownText,
                isActive && styles.countdownTextActive,
                isUrgent && styles.countdownTextUrgent,
              ]}
            >
              {formatTimerSeconds(remaining)}
            </Text>
            {isActive && (
              <Text style={styles.countdownSub}>
                Target: {formatTimerSeconds(duration)}
              </Text>
            )}
          </View>

          {/* Quick Preset Selector Chips */}
          <View style={styles.presetChipsScroll}>
            {PRESET_REST_DURATIONS.map((sec) => {
              const isCurrentPreset = isActive && duration === sec;
              const isDefault = !isActive && settings.defaultDuration === sec;
              return (
                <Pressable
                  key={sec}
                  style={[
                    styles.presetChip,
                    (isCurrentPreset || isDefault) && styles.presetChipActive,
                  ]}
                  onPress={() => handleStartPreset(sec)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      (isCurrentPreset || isDefault) && styles.presetChipTextActive,
                    ]}
                  >
                    {sec >= 60 && sec % 60 === 0 ? `${sec / 60}m` : `${sec}s`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Controls Button Row */}
          <View style={styles.controlsRow}>
            {isActive ? (
              <>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => addSeconds(-15)}
                >
                  <Text style={styles.adjustBtnText}>-15s</Text>
                </Pressable>

                <Pressable
                  style={[styles.mainBtn, isPaused && styles.mainBtnResume]}
                  onPress={isPaused ? resumeTimer : pauseTimer}
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={18}
                    color="#2E3440"
                  />
                  <Text style={styles.mainBtnText}>
                    {isPaused ? 'Resume' : 'Pause'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => addSeconds(30)}
                >
                  <Text style={styles.adjustBtnText}>+30s</Text>
                </Pressable>

                <Pressable
                  style={styles.skipBtn}
                  onPress={stopTimer}
                >
                  <Ionicons name="stop-circle-outline" size={16} color={colors.danger} />
                  <Text style={styles.skipBtnText}>Skip</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.startDefaultBtn}
                onPress={() => startTimer(settings.defaultDuration, activeMeta ?? undefined)}
              >
                <Ionicons name="play" size={18} color="#2E3440" />
                <Text style={styles.startDefaultBtnText}>
                  Start Rest ({formatTimerSeconds(settings.defaultDuration)})
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: colors.accent + '22',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: colors.accent + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePaused: {
    backgroundColor: '#EBCB8B33',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerMiniCountdown: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
    marginRight: spacing.xs,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: colors.surfaceRaised,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  countdownTextActive: {
    color: colors.accent,
  },
  countdownTextUrgent: {
    color: colors.warning,
  },
  countdownSub: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    marginTop: -2,
  },
  presetChipsScroll: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '22',
  },
  presetChipText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.textMuted,
  },
  presetChipTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  adjustBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustBtnText: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: radius.control,
    gap: spacing.xs,
  },
  mainBtnResume: {
    backgroundColor: '#A3BE8C',
  },
  mainBtnText: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: '#2E3440',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceRaised,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  startDefaultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radius.control,
    gap: spacing.xs,
  },
  startDefaultBtnText: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: '#2E3440',
  },
});
