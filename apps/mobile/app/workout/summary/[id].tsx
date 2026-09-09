import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../../src/theme/tokens';
import { useWorkout } from '../../../src/hooks/useWorkouts';
import { useExercises } from '../../../src/hooks/useExercises';

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: workout, isLoading } = useWorkout(id!);
  const { data: allExercises } = useExercises();

  const exerciseMap = new Map(
    (allExercises ?? []).map((e) => [e.id, e]),
  );

  if (isLoading || !workout) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Calculate stats
  const totalSets = workout.exercises.reduce((sum, we) => sum + we.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.isCompleted).length,
    0,
  );
  const totalVolume = workout.exercises.reduce(
    (sum, we) =>
      sum +
      we.sets.reduce((setSum, s) => {
        if (s.isCompleted && s.weightKg && s.reps) {
          return setSum + s.weightKg * s.reps;
        }
        return setSum;
      }, 0),
    0,
  );

  const startTime = new Date(workout.startedAt);
  const endTime = workout.completedAt ? new Date(workout.completedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMin = Math.floor(durationMs / 60000);
  const durationH = Math.floor(durationMin / 60);
  const durationM = durationMin % 60;
  const durationStr = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM}m`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Celebration */}
        <View style={styles.celebrationBadge}>
          <Ionicons name="checkmark-circle-outline" size={38} color={colors.success} />
        </View>
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.workoutName}>{workout.name}</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{durationStr}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{workout.exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedSets}/{totalSets}</Text>
            <Text style={styles.statLabel}>Sets Done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}k`
                : Math.round(totalVolume)}
            </Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </View>
        </View>

        {/* Exercise breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Exercise Breakdown</Text>
          {workout.exercises.map((we) => {
            const name = exerciseMap.get(we.exerciseId)?.name ?? 'Exercise';
            const setsCompleted = we.sets.filter((s) => s.isCompleted).length;
            const bestSet = we.sets
              .filter((s) => s.isCompleted && s.weightKg && s.reps)
              .sort((a, b) => (b.weightKg! * b.reps!) - (a.weightKg! * a.reps!))
              [0];

            return (
              <View key={we.id} style={styles.breakdownRow}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownName}>{name}</Text>
                  <Text style={styles.breakdownMeta}>
                    {setsCompleted}/{we.sets.length} sets
                    {bestSet ? ` • Best: ${bestSet.weightKg}kg × ${bestSet.reps}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Done button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
          onPress={() => {
            // Go back to home
            router.dismissAll();
            (router as any).replace('/(tabs)');
          }}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  celebrationBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  title: {
    color: colors.success,
    fontSize: typography.h1.size,
    fontWeight: typography.h1.weight,
    marginBottom: spacing.xs,
  },
  workoutName: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    marginBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  statCard: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.h1.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  breakdownSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  breakdownTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border + '44',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownName: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '500',
    marginBottom: 2,
  },
  breakdownMeta: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  doneBtn: {
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  doneBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  doneBtnText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
});
