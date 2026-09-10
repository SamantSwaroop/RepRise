import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors, radius, spacing } from '../theme/tokens';

export function WorkoutCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width="55%" height={20} borderRadius={6} />
        <Skeleton width={70} height={20} borderRadius={6} />
      </View>

      <View style={styles.meta}>
        <Skeleton width="40%" height={14} borderRadius={4} />
        <Skeleton width={50} height={14} borderRadius={4} />
      </View>

      <View style={styles.stats}>
        <Skeleton width="28%" height={14} borderRadius={4} />
        <Skeleton width="28%" height={14} borderRadius={4} />
        <Skeleton width="28%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
