import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const handleGuest = async () => {
    await continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>RepRise</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Track every rep, beat your best.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.guestButton, pressed && styles.buttonPressed]}
          onPress={handleGuest}
        >
          <Text style={styles.guestButtonText}>Continue as Guest (Offline)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 120,
    paddingBottom: 60,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
  },
  wordmark: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  divider: {
    width: 48,
    height: 3,
    marginVertical: spacing.lg,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  guestButtonText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
