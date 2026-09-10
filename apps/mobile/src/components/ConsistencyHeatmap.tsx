import { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StreakData } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

interface ConsistencyHeatmapProps {
  streak?: StreakData | null;
}

const DAYS_LABELS = ['M', 'W', 'F', 'S'];

export function ConsistencyHeatmap({ streak }: ConsistencyHeatmapProps) {
  const recentDays = streak?.recentActiveDays ?? [];

  // Group the 84 days into 12 weekly columns (each with 7 days Mon-Sun)
  const weeks = useMemo(() => {
    const result: Array<Array<{ date: string; count: number }>> = [];
    for (let i = 0; i < recentDays.length; i += 7) {
      result.push(recentDays.slice(i, i + 7));
    }
    return result;
  }, [recentDays]);

  const totalRecentWorkouts = useMemo(() => {
    return recentDays.reduce((acc, d) => acc + d.count, 0);
  }, [recentDays]);

  const activeDaysCount = useMemo(() => {
    return recentDays.filter((d) => d.count > 0).length;
  }, [recentDays]);

  if (!streak) return null;

  const getSquareColor = (count: number) => {
    if (count === 0) return colors.surfaceRaised + '66';
    if (count === 1) return colors.accent;
    return '#A3BE8C'; // Multiple workouts on same day
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calendar" size={16} color={colors.accent} />
          <Text style={styles.title}>Consistency Heatmap</Text>
        </View>
        <Text style={styles.sub}>Past 12 Weeks</Text>
      </View>

      {/* Stat Tiles */}
      <View style={styles.statGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{streak.currentWeeklyStreak}w</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{streak.longestWeeklyStreak}w</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{activeDaysCount}</Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{totalRecentWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
      </View>

      {/* Grid Container */}
      <View style={styles.gridWrapper}>
        {/* Day indicators on the left (M, W, F, S) */}
        <View style={styles.daysColumn}>
          <Text style={styles.dayIndicator}>M</Text>
          <Text style={styles.dayIndicator}>T</Text>
          <Text style={styles.dayIndicator}>W</Text>
          <Text style={styles.dayIndicator}>T</Text>
          <Text style={styles.dayIndicator}>F</Text>
          <Text style={styles.dayIndicator}>S</Text>
          <Text style={styles.dayIndicator}>S</Text>
        </View>

        {/* 12 Weekly Columns */}
        <View style={styles.columnsContainer}>
          {weeks.map((weekDays, colIdx) => (
            <View key={colIdx} style={styles.weekCol}>
              {weekDays.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.square,
                    { backgroundColor: getSquareColor(day.count) },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.legendSquare, { backgroundColor: colors.surfaceRaised + '66' }]} />
        <View style={[styles.legendSquare, { backgroundColor: colors.accent }]} />
        <View style={[styles.legendSquare, { backgroundColor: '#A3BE8C' }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '44',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.background + '88',
    borderRadius: radius.control,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  gridWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  daysColumn: {
    gap: 4,
    justifyContent: 'space-between',
  },
  dayIndicator: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    height: 12,
    lineHeight: 12,
    textAlign: 'center',
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  weekCol: {
    gap: 4,
  },
  square: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.xs,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 9,
    marginHorizontal: 2,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
