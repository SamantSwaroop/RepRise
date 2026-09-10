import '../src/lib/alertPolyfill';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '../src/lib/queryClient';
import { colors } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { useRestTimerStore } from '../src/stores/restTimerStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { initNotifications } from '../src/lib/notifications';
import { FloatingRestTimer } from '../src/components/FloatingRestTimer';
import { SyncDetailsModal } from '../src/components/SyncDetailsModal';
import { Toast } from '../src/components/Toast';
import { ConfirmModal } from '../src/components/ConfirmModal';
import { getDatabase } from '../src/db/database';
import { initSyncEngine } from '../src/lib/syncEngine';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, loadStoredTokens } = useAuthStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize SQLite database, then load auth tokens and sync engine
    getDatabase()
      .then(() => {
        setDbReady(true);
        initSyncEngine();
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setDbReady(true); // Continue anyway; workout features will fail gracefully
      });
  }, []);

  useEffect(() => {
    if (dbReady) {
      loadStoredTokens();
    }
  }, [dbReady]);

  if (isLoading || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const loadTimerSettings = useRestTimerStore((s) => s.loadSettings);
  const loadUserSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    initNotifications();
    loadTimerSettings();
    loadUserSettings();
  }, [loadTimerSettings, loadUserSettings]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.textPrimary,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="workout/[id]"
              options={{
                headerShown: true,
                title: 'Workout',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="workout/summary/[id]"
              options={{
                headerShown: true,
                title: 'Summary',
                animation: 'slide_from_right',
                headerBackVisible: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="template/[id]"
              options={{
                headerShown: true,
                title: 'Template',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="template/create"
              options={{
                headerShown: true,
                title: 'New Template',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                title: 'Settings',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
          <FloatingRestTimer />
          <SyncDetailsModal />
        </AuthGate>
        <Toast />
        <ConfirmModal />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
