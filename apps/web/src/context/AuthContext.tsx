import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { disconnectAccountSocket, ensureAccountSocket } from '../lib/game-socket-client';
import type { User } from '../types/game';

export interface AuthConfig {
  devLogin: boolean;
  emailAuth: boolean;
  publicUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  health: string | null;
  loading: boolean;
  authConfig: AuthConfig;
  refresh: () => Promise<void>;
  devLogin: (account: 'dm' | 'player') => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<{ message: string }>;
  login: (params: { email: string; password: string }) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_AUTH_CONFIG: AuthConfig = { devLogin: true, emailAuth: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  const loadAuthConfig = useCallback(async () => {
    try {
      const data = await api<AuthConfig>('/auth/config');
      setAuthConfig(data);
    } catch {
      setAuthConfig(DEFAULT_AUTH_CONFIG);
    }
  }, []);

  useEffect(() => {
    void api<{ status: string }>('/health')
      .then((h) => setHealth(h.status))
      .catch(() => setHealth('unreachable'));
    void loadAuthConfig();
    void refresh().finally(() => setLoading(false));
  }, [refresh, loadAuthConfig]);

  useEffect(() => {
    if (user) {
      ensureAccountSocket();
    }
  }, [user]);

  const devLogin = useCallback(
    async (account: 'dm' | 'player') => {
      await api('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ account }),
      });
      await refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (params: { email: string; password: string; displayName?: string }) => {
      const data = await api<{ ok: boolean; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return { message: data.message };
    },
    [],
  );

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      await refresh();
    },
    [refresh],
  );

  const resendVerification = useCallback(async (email: string) => {
    const data = await api<{ ok: boolean; message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { message: data.message };
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const data = await api<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { message: data.message };
  }, []);

  const logout = useCallback(async () => {
    disconnectAccountSocket();
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      health,
      loading,
      authConfig,
      refresh,
      devLogin,
      register,
      login,
      resendVerification,
      forgotPassword,
      logout,
    }),
    [user, health, loading, authConfig, refresh, devLogin, register, login, resendVerification, forgotPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
