import { StyleSheet, Text, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { useRouter } from 'expo-router';
import { useWorkouts, useCreateWorkout } from '../../src/hooks/useWorkouts';
import { WorkoutCard } from '../../src/components/WorkoutCard';

export default function HomeTab() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { data: workouts, isLoading } = useWorkouts();
  const createWorkout = useCreateWorkout();

  const recentWorkouts = workouts?.slice(0, 5) ?? [];
  const inProgressWorkout = workouts?.find((w) => w.status === 'in_progress');

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleStartWorkout = () => {
    if (inProgressWorkout) {
      (router as any).push({
        pathname: '/workout/[id]',
        params: { id: inProgressWorkout.id },
      });
      return;
    }

    createWorkout.mutate(undefined, {
      onSuccess: (workout) => {
        (router as any).push({
          pathname: '/workout/[id]',
          params: { id: workout.id },
        });
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello,</Text>
        <Text style={styles.name}>{user?.displayName ?? 'Athlete'}</Text>
      </View>

      {/* Start / Resume Workout Button */}
      <Pressable
        style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
        onPress={handleStartWorkout}
        disabled={createWorkout.isPending}
      >
        <View style={styles.btnRow}>
          {inProgressWorkout ? (
            <Ionicons name="play" size={18} color={colors.background} style={styles.btnIcon} />
          ) : (
            <Ionicons name="add" size={22} color={colors.background} style={styles.btnIcon} />
          )}
          <Text style={styles.startBtnText}>
            {createWorkout.isPending
              ? 'Starting…'
              : inProgressWorkout
              ? 'Resume Workout'
              : 'Start Workout'}
          </Text>
        </View>
        {inProgressWorkout && (
          <Text style={styles.startBtnSub}>{inProgressWorkout.name}</Text>
        )}
      </Pressable>

      {/* Start from Template */}
      {!inProgressWorkout && (
        <Pressable
          style={({ pressed }) => [styles.templateBtn, pressed && styles.templateBtnPressed]}
          onPress={() => (router as any).push('/(tabs)/templates')}
        >
          <View style={styles.btnRow}>
            <Ionicons name="copy-outline" size={16} color={colors.accent} style={styles.btnIcon} />
            <Text style={styles.templateBtnText}>Start from Template</Text>
          </View>
        </Pressable>
      )}

      {/* Recent Workouts */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Workouts</Text>
        {recentWorkouts.length > 0 && (
          <Pressable onPress={() => (router as any).push('/(tabs)/workouts')}>
            <Text style={styles.seeAll}>See All →</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : recentWorkouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptyBody}>
            Tap "Start Workout" above to log your first session. Your data is
            saved locally — no internet required.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() =>
                (router as any).push({ pathname: '/workout/[id]', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      )}

      <View style={styles.spacer} />

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
  },
  greeting: {
    marginBottom: spacing.xl,
  },
  hello: {
    color: colors.textMuted,
    fontSize: typography.body.size,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.display.size,
    fontWeight: typography.display.weight,
    letterSpacing: -0.5,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startBtnText: {
    color: colors.background,
    fontSize: typography.h2.size,
    fontWeight: '700',
  },
  startBtnSub: {
    color: colors.background,
    fontSize: typography.caption.size,
    opacity: 0.8,
    marginTop: 2,
  },
  templateBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: -spacing.md,
  },
  templateBtnPressed: {
    backgroundColor: colors.accent + '11',
    opacity: 0.9,
  },
  templateBtnText: {
    color: colors.accent,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: spacing.xs,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recentTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
  },
  seeAll: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    lineHeight: 22,
  },
  listContent: {
    gap: 0,
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: 30,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: colors.danger,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});
