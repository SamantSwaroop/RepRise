import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, SectionList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { Workout, WorkoutStatus } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { WorkoutCard } from '../../src/components/WorkoutCard';

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
  const [filter, setFilter] = useState<WorkoutStatus | 'all'>('all');

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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() =>
                (router as any).push({ pathname: '/workout/[id]', params: { id: item.id } })
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'No workouts yet. Start your first workout from the Home tab!'
                  : `No ${filter.replace('_', ' ')} workouts`}
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
  list: {
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
