'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, clearTokens, getAccessToken, setTokens } from './api';
import type { PublicUser } from './types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    department?: string;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      department?: string;
    }) => {
      const res = await api.auth.register(data);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore — we're clearing local state regardless
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
