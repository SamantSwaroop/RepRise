import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../src/theme/tokens';
import { SyncStatusBadge } from '../../src/components/SyncStatusBadge';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isIOS =
    Platform.OS === 'ios' ||
    (isWeb && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));

  // iPhone with Face ID requires 34px bottom inset for the home indicator bar.
  // Note: These MUST be numbers because React Navigation's getTabBarHeight
  // explicitly checks `typeof customHeight === 'number'` and ignores string calc() values!
  const bottomPadding = isIOS ? 34 : Math.max(insets.bottom, 8);
  const tabHeight = 52 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', fontSize: typography.h2.size },
        headerRight: () => <SyncStatusBadge />,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          paddingTop: 6,
          paddingBottom: bottomPadding as any,
          height: tabHeight as any,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="copy-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

