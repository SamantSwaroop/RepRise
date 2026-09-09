import { create } from 'zustand';
import type { UserProfile, AuthTokens } from '@reprise/shared';
import { api, storeTokens, clearTokens, getStoredAccessToken, getStoredRefreshToken } from '../lib/api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
    set({ user: data.user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const data = await api<{ user: UserProfile; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
    await storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
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
      set({ user: null, isAuthenticated: false });
    }
  },

  loadStoredTokens: async () => {
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) {
        set({ isLoading: false });
        return;
      }

      // Try to fetch the user profile with the stored token
      const data = await api<{ user: UserProfile }>('/auth/me');
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch {
      // Token invalid or expired — clear and stay unauthenticated
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
