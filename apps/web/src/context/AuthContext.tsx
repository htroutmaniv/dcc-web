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
import type { User } from '../types/game';

interface AuthContextValue {
  user: User | null;
  health: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  devLogin: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void api<{ status: string }>('/health')
      .then((h) => setHealth(h.status))
      .catch(() => setHealth('unreachable'));
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const devLogin = useCallback(
    async (displayName: string) => {
      await api('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, health, loading, refresh, devLogin, logout }),
    [user, health, loading, refresh, devLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
