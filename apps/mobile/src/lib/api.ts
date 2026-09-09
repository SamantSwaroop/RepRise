import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const TOKEN_KEY = 'reprise_access_token';
const REFRESH_KEY = 'reprise_refresh_token';

// ─── Token Storage ─────────────────────────────────────────────────

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function storeTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// ─── API Fetch Wrapper ─────────────────────────────────────────────

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown>;
  skipAuth?: boolean;
};

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const json = await res.json();
    const tokens = json.data.tokens;
    await storeTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, skipAuth, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getStoredAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  let res = await fetch(url, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = attemptRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry with new token
      const newToken = await getStoredAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(url, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  const json = await res.json();

  if (!res.ok) {
    const errorMessage = json.error?.message ?? 'Something went wrong';
    throw new ApiError(res.status, json.error?.code ?? 'unknown', errorMessage);
  }

  return json.data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(typeof message === 'string' ? message : JSON.stringify(message));
    this.name = 'ApiError';
  }
}
