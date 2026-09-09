import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { ApiError } from '../../src/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to continue your journey</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.border}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.border}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, loading && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in…' : 'Log In'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.link}>Sign up</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 100,
    paddingBottom: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1.size,
    fontWeight: typography.h1.weight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    marginBottom: spacing.xxl,
  },
  errorBox: {
    backgroundColor: colors.danger + '22',
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption.size,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    textAlign: 'center',
  },
  link: {
    color: colors.accent,
    fontWeight: '600',
  },
});
