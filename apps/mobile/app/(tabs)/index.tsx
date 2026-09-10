import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { useRouter } from 'expo-router';
import { useWorkouts, useCreateWorkout } from '../../src/hooks/useWorkouts';
import { useStreakData } from '../../src/hooks/useAnalytics';
import { StreakBanner } from '../../src/components/StreakBanner';

export default function HomeTab() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { data: workouts } = useWorkouts();
  const { data: streak } = useStreakData();
  const createWorkout = useCreateWorkout();

  const inProgressWorkout = workouts?.find((w) => w.status === 'in_progress');

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
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name}>{user?.displayName ?? 'Athlete'}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Streak & Consistency Banner */}
      <StreakBanner
        streak={streak}
        onPress={() => (router as any).push('/(tabs)/progress')}
      />

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

      {/* Quick Access Navigation */}
      <View style={styles.quickNavSection}>
        <Pressable
          style={({ pressed }) => [styles.quickNavCard, pressed && styles.quickNavCardPressed]}
          onPress={() => (router as any).push('/(tabs)/workouts')}
        >
          <View style={styles.quickNavIconWrap}>
            <Ionicons name="barbell-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.quickNavContent}>
            <Text style={styles.quickNavTitle}>Workout History</Text>
            <Text style={styles.quickNavSubtitle}>View and review past logged sessions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.quickNavCard, pressed && styles.quickNavCardPressed]}
          onPress={() => (router as any).push('/(tabs)/progress')}
        >
          <View style={styles.quickNavIconWrap}>
            <Ionicons name="trending-up-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.quickNavContent}>
            <Text style={styles.quickNavTitle}>Progress & PRs</Text>
            <Text style={styles.quickNavSubtitle}>Volume charts, PR records, and muscle map</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greeting: {
    flex: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  settingsBtnPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceRaised,
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
  quickNavSection: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  quickNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickNavCardPressed: {
    backgroundColor: colors.surfaceRaised,
    opacity: 0.9,
  },
  quickNavIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  quickNavContent: {
    flex: 1,
  },
  quickNavTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  quickNavSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    marginTop: 2,
  },
});
