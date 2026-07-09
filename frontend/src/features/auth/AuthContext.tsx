import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, refreshAccessToken, setAccessToken, setOnAuthFailure } from '@/lib/api';
import type { AuthUser } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const handleAuthFailure = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setOnAuthFailure(handleAuthFailure);
    return () => setOnAuthFailure(null);
  }, [handleAuthFailure]);

  useEffect(() => {
    (async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const me = await apiFetch<AuthUser>('/auth/me');
        setUser(me);
        setStatus('authenticated');
      } catch {
        setStatus('unauthenticated');
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
}
