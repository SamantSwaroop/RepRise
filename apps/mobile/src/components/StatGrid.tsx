import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DashboardStats } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

interface StatGridProps {
  stats: DashboardStats;
}

export function StatGrid({ stats }: StatGridProps) {
  const formatVolume = (kg: number) => {
    if (kg >= 1000000) {
      return `${(kg / 1000000).toFixed(2)}M`;
    }
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}k`;
    }
    return String(kg);
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Week-over-week calculation
  const volumeDiff = stats.thisWeekVolumeKg - stats.lastWeekVolumeKg;
  const percentChange =
    stats.lastWeekVolumeKg > 0
      ? Math.round((volumeDiff / stats.lastWeekVolumeKg) * 100)
      : stats.thisWeekVolumeKg > 0
      ? 100
      : 0;

  return (
    <View style={styles.container}>
      {/* This week highlight banner */}
      <View style={styles.weekBanner}>
        <View style={styles.weekLeft}>
          <Text style={styles.weekTitle}>This Week</Text>
          <Text style={styles.weekSub}>
            {stats.thisWeekWorkouts}{' '}
            {stats.thisWeekWorkouts === 1 ? 'workout' : 'workouts'} •{' '}
            {formatVolume(stats.thisWeekVolumeKg)} kg lifted
          </Text>
        </View>
        {stats.lastWeekVolumeKg > 0 && (
          <View
            style={[
              styles.trendBadge,
              percentChange >= 0 ? styles.trendUp : styles.trendDown,
            ]}
          >
            <Ionicons
              name={percentChange >= 0 ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={percentChange >= 0 ? colors.success : colors.danger}
              style={{ marginRight: 2 }}
            />
            <Text
              style={[
                styles.trendText,
                { color: percentChange >= 0 ? colors.success : colors.danger },
              ]}
            >
              {Math.abs(percentChange)}%
            </Text>
          </View>
        )}
      </View>

      {/* 2x2 Lifetime Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="barbell-outline" size={18} color={colors.accent} />
          </View>
          <Text style={styles.value}>{formatVolume(stats.totalVolumeKg)}</Text>
          <Text style={styles.label}>Total Volume (kg)</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="fitness-outline" size={18} color={colors.success} />
          </View>
          <Text style={styles.value}>{stats.totalWorkouts}</Text>
          <Text style={styles.label}>Workouts</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="layers-outline" size={18} color={colors.warning} />
          </View>
          <Text style={styles.value}>{stats.totalSets.toLocaleString()}</Text>
          <Text style={styles.label}>Sets Logged</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="time-outline" size={18} color="#D08770" />
          </View>
          <Text style={styles.value}>{formatHours(stats.totalDurationMinutes)}</Text>
          <Text style={styles.label}>Time Training</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  weekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border + '66',
  },
  weekLeft: {
    flex: 1,
  },
  weekTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
    marginBottom: 2,
  },
  weekSub: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendUp: {
    backgroundColor: colors.success + '18',
  },
  trendDown: {
    backgroundColor: colors.danger + '18',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '44',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
