import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { displayWeight, LBS_PER_KG } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../../src/theme/tokens';
import { useWorkout } from '../../../src/hooks/useWorkouts';
import { useExercises } from '../../../src/hooks/useExercises';
import { useWorkoutPRs } from '../../../src/hooks/usePRs';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { toast } from '../../../src/stores/toastStore';

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: workout, isLoading } = useWorkout(id!);
  const { data: allExercises } = useExercises();
  const { data: prs } = useWorkoutPRs(id);
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const badgeScale = useRef(new Animated.Value(0.3)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (workout) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 180,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 450,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [workout]);

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
  const displayVol = weightUnit === 'lbs' ? totalVolume * LBS_PER_KG : totalVolume;

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
        <Animated.View style={[styles.celebrationBadge, { transform: [{ scale: badgeScale }] }]}>
          <Ionicons name="checkmark-circle-outline" size={38} color={colors.success} />
        </Animated.View>
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.workoutName}>{workout.name}</Text>

        {/* Stats grid */}
        <Animated.View style={[styles.statsGrid, { opacity: contentFade }]}>
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
              {displayVol >= 1000
                ? `${(displayVol / 1000).toFixed(1)}k`
                : Math.round(displayVol)}
            </Text>
            <Text style={styles.statLabel}>Volume ({weightUnit})</Text>
          </View>
        </Animated.View>

        {/* PRs Broken Celebration */}
        {prs && prs.length > 0 && (
          <View style={styles.prSection}>
            <View style={styles.prHeader}>
              <View style={styles.prIconContainer}>
                <Ionicons name="trophy" size={20} color="#EBCB8B" />
              </View>
              <View>
                <Text style={styles.prSectionTitle}>
                  {prs.length} Personal {prs.length === 1 ? 'Record' : 'Records'} Broken!
                </Text>
                <Text style={styles.prSectionSubtitle}>
                  Progressive overload milestone achieved
                </Text>
              </View>
            </View>

            <View style={styles.prList}>
              {prs.map((pr, idx) => {
                const is1RM = pr.type === '1rm';
                const prVal = displayWeight(pr.value, weightUnit);
                const prWeight = displayWeight(pr.weightKg, weightUnit);
                const prImp = pr.improvement != null ? displayWeight(pr.improvement, weightUnit) : null;
                return (
                  <View key={`${pr.exerciseId}-${pr.type}-${idx}`} style={styles.prCard}>
                    <View style={styles.prCardTop}>
                      <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                      <View style={styles.prTypePill}>
                        <Text style={styles.prTypePillText}>
                          {is1RM ? 'Est. 1RM' : 'Heaviest Weight'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.prCardDetails}>
                      <Text style={styles.prValue}>{prVal} {weightUnit}</Text>
                      {prImp != null && prImp > 0 && (
                        <View style={styles.prImprovementBadge}>
                          <Ionicons name="arrow-up" size={10} color="#A3BE8C" />
                          <Text style={styles.prImprovementText}>+{prImp} {weightUnit}</Text>
                        </View>
                      )}
                      <Text style={styles.prSetDetail}>
                        ({prWeight} {weightUnit} × {pr.reps} reps)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
            const bestSetWeight = bestSet ? displayWeight(bestSet.weightKg, weightUnit) : null;

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
  prSection: {
    width: '100%',
    backgroundColor: '#EBCB8B10',
    borderColor: '#EBCB8B44',
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  prIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBCB8B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prSectionTitle: {
    color: '#EBCB8B',
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  prSectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  prList: {
    gap: spacing.sm,
  },
  prCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '66',
  },
  prCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  prExerciseName: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  prTypePill: {
    backgroundColor: '#EBCB8B22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prTypePillText: {
    color: '#EBCB8B',
    fontSize: 10,
    fontWeight: '700',
  },
  prCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prValue: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
  },
  prImprovementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A3BE8C22',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  prImprovementText: {
    color: '#A3BE8C',
    fontSize: 11,
    fontWeight: '700',
  },
  prSetDetail: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
});
