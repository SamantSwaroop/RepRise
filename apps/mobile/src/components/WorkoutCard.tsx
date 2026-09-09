import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { Workout, WorkoutStatus } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

const STATUS_CONFIG: Record<WorkoutStatus, { label: string; color: string }> = {
  in_progress: { label: 'In Progress', color: colors.warning },
  completed: { label: 'Completed', color: colors.success },
  abandoned: { label: 'Abandoned', color: colors.danger },
};

interface WorkoutCardProps {
  workout: Omit<Workout, 'exercises'> & { exerciseCount?: number; setCount?: number };
  onPress: () => void;
}

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const statusCfg = STATUS_CONFIG[workout.status];
  const date = new Date(workout.startedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {workout.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22' }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>📅 {dateStr} • {timeStr}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
});
