import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, removeToken, hasToken } from '@/lib/api';
import type { AuthUser, AuthResponse, Settlement } from '@/lib/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  settlements: Settlement[];
  login: (login: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  login: string;
  password: string;
  name: string;
  phone: string;
  email: string;
  settlement: string;
  addressLine: string;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  settlements: [],
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const has = await hasToken();
        if (has) {
          const me = await api<AuthUser>('/v1/me', { auth: true });
          setUser(me);
        }
      } catch {
        await removeToken();
      } finally {
        setLoading(false);
      }
    })();

    api<Settlement[]>('/v1/settlements').then(setSettlements).catch(() => {});
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    const res = await api<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: { login: loginStr, password },
    });
    await setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api<AuthResponse>('/v1/auth/register', {
      method: 'POST',
      body: data,
    });
    await setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, settlements, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
