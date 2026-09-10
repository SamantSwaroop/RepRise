import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StreakData } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface StreakBannerProps {
  streak?: StreakData | null;
  onPress?: () => void;
}

export function StreakBanner({ streak, onPress }: StreakBannerProps) {
  if (!streak) return null;

  const currentStreak = streak.currentWeeklyStreak;
  const thisWeekCount = streak.thisWeekWorkoutCount;
  const goal = streak.weeklyGoal;
  const progressRatio = Math.min(1, thisWeekCount / (goal || 1));

  // Today's index in Monday=0 ... Sunday=6
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Top row: Fire icon + Streak count + Goal progress */}
      <View style={styles.topRow}>
        <View style={styles.streakTitleRow}>
          <View style={styles.flameCircle}>
            <Ionicons name="flame" size={20} color="#D08770" />
          </View>
          <View>
            <Text style={styles.streakCount}>
              {currentStreak > 0
                ? `${currentStreak} Week${currentStreak === 1 ? '' : 's'} Streak`
                : 'Start Your Streak'}
            </Text>
            <Text style={styles.streakSub}>
              {thisWeekCount >= goal
                ? 'Weekly goal completed! 🔥'
                : `${thisWeekCount} of ${goal} workouts this week`}
            </Text>
          </View>
        </View>

        {currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={12} color="#D08770" style={{ marginRight: 2 }} />
            <Text style={styles.streakBadgeText}>{currentStreak}w</Text>
          </View>
        )}
      </View>

      {/* Weekly Goal Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.round(progressRatio * 100)}%`,
              backgroundColor: thisWeekCount >= goal ? colors.success : colors.accent,
            },
          ]}
        />
      </View>

      {/* 7-Day Week Strip (Mon - Sun) */}
      <View style={styles.weekStrip}>
        {DAYS_SHORT.map((dayLabel, idx) => {
          const isActive = streak.daysActiveThisWeek[idx];
          const isToday = idx === todayIndex;

          return (
            <View
              key={idx}
              style={[
                styles.dayPill,
                isActive && styles.dayPillActive,
                isToday && !isActive && styles.dayPillToday,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isActive && styles.dayLabelActive,
                  isToday && !isActive && styles.dayLabelToday,
                ]}
              >
                {dayLabel}
              </Text>
              {isActive ? (
                <Ionicons name="checkmark" size={10} color={colors.background} />
              ) : (
                <View
                  style={[
                    styles.dayDot,
                    isToday && styles.dayDotToday,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '66',
    marginBottom: spacing.lg,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flameCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D0877022',
    borderWidth: 1,
    borderColor: '#D0877055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  streakSub: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0877022',
    borderColor: '#D0877066',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.control,
  },
  streakBadgeText: {
    color: '#D08770',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised + '88',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayPillToday: {
    borderColor: colors.accent + '88',
    backgroundColor: colors.surfaceRaised,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  dayLabelActive: {
    color: colors.background,
    fontWeight: '700',
  },
  dayLabelToday: {
    color: colors.accent,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dayDotToday: {
    backgroundColor: colors.accent,
  },
});
