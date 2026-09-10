import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, AuthTokens } from '@reprise/shared';
import { api, storeTokens, clearTokens, getStoredAccessToken, getStoredRefreshToken } from '../lib/api';

const USER_CACHE_KEY = 'reprise_cached_user';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: { displayName?: string; avatarUrl?: string | null }) => Promise<void>;
  loadStoredTokens: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  register: async (email, password, displayName) => {
    const data = await api<{ user: UserProfile; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
      skipAuth: true,
    });
    await storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const data = await api<{ user: UserProfile; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
    await storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const refreshToken = await getStoredRefreshToken();
      if (refreshToken) {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        }).catch(() => {});
      }
    } finally {
      await clearTokens();
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      set({ user: null, isAuthenticated: false });
    }
  },

  updateProfile: async (input) => {
    try {
      const data = await api<{ user: UserProfile }>('/auth/me', {
        method: 'PATCH',
        body: input,
      });
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
      set({ user: data.user });
    } catch (err: any) {
      const isNetworkErr = err?.code === 'network_error' || err?.message?.includes('Cannot connect');
      if (isNetworkErr) {
        const currentUser = get().user;
        if (currentUser) {
          const updated: UserProfile = {
            ...currentUser,
            displayName: input.displayName !== undefined ? input.displayName.trim() : currentUser.displayName,
            avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : currentUser.avatarUrl,
          };
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updated));
          set({ user: updated });
          return;
        }
      }
      throw err;
    }
  },

  loadStoredTokens: async () => {
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) {
        // Check if guest user was previously active
        const cachedUserStr = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            if (cachedUser?.id === 'guest') {
              set({ user: cachedUser, isAuthenticated: true, isLoading: false });
              return;
            }
          } catch {}
        }
        set({ isLoading: false });
        return;
      }

      // Check if we have a locally cached user profile
      const cachedUserStr = await AsyncStorage.getItem(USER_CACHE_KEY);
      let cachedUser: UserProfile | null = null;
      if (cachedUserStr) {
        try {
          cachedUser = JSON.parse(cachedUserStr);
          // Pre-populate so offline workouts load instantly without blocking
          set({ user: cachedUser, isAuthenticated: true });
        } catch {
          // ignore cache parse error
        }
      }

      // Try to fetch latest user profile from API
      try {
        const data = await api<{ user: UserProfile }>('/auth/me');
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } catch (err: any) {
        // If network error (offline), keep user logged in with cached profile!
        const isNetworkErr = err?.code === 'network_error' || err?.message?.includes('Cannot connect');
        if (isNetworkErr && cachedUser) {
          set({ user: cachedUser, isAuthenticated: true, isLoading: false });
          return;
        }

        // Only clear if token is genuinely invalid (401, etc.)
        await clearTokens();
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  continueAsGuest: async () => {
    const guestUser: UserProfile = {
      id: 'guest',
      email: 'athlete@reprise.local',
      displayName: 'Athlete',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(guestUser));
    set({ user: guestUser, isAuthenticated: true });
  },
}));
