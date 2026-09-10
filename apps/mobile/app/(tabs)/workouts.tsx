import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, SectionList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Workout, WorkoutStatus } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { useWorkoutPRCounts } from '../../src/hooks/usePRs';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { WorkoutCardSkeleton } from '../../src/components/WorkoutCardSkeleton';
import { syncNow } from '../../src/lib/syncEngine';

const FILTER_OPTIONS: { label: string; value: WorkoutStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Abandoned', value: 'abandoned' },
];

function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function WorkoutsTab() {
  const router = useRouter();
  const { data: workouts, isLoading } = useWorkouts();
  const { data: prCounts } = useWorkoutPRCounts();
  const [filter, setFilter] = useState<WorkoutStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncNow({ force: true });
    } finally {
      setRefreshing(false);
    }
  };

  const sections = useMemo(() => {
    if (!workouts) return [];

    const filtered =
      filter === 'all'
        ? workouts
        : workouts.filter((w) => w.status === filter);

    // Group by date
    const grouped: Record<string, Omit<Workout, 'exercises'>[]> = {};
    for (const w of filtered) {
      const dayKey = new Date(w.startedAt).toDateString();
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(w);
    }

    return Object.entries(grouped).map(([dayKey, items]) => ({
      title: formatSectionDate(items[0].startedAt),
      data: items,
    }));
  }, [workouts, filter]);

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
            onPress={() => setFilter(opt.value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === opt.value && styles.filterTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              prCount={prCounts?.[item.id]}
              onPress={() =>
                (router as any).push({ pathname: '/workout/[id]', params: { id: item.id } })
              }
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No Workouts Logged' : `No ${filter.replace('_', ' ')} workouts`}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Start logging your exercises and sets to see your workout history here.'
                  : `You do not have any ${filter.replace('_', ' ')} workout sessions.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent + '33',
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
    lineHeight: 22,
  },
});
