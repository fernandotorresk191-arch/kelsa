"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "features/auth/api";
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "features/auth/types";
import type { ApiError } from "shared/api/http";
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from "shared/auth/token";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const maybeApi = err as ApiError;
    if (typeof maybeApi.message === "string") {
      return maybeApi.details
        ? `${maybeApi.message}: ${maybeApi.details}`
        : maybeApi.message;
    }
  }

  return "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyToken = useCallback((token: string | null) => {
    if (token) {
      storeAccessToken(token);
      setAccessToken(token);
    } else {
      clearStoredAccessToken();
      setAccessToken(null);
    }
  }, []);

  const loadProfile = useCallback(
    async (token?: string) => {
      const effectiveToken = token ?? accessToken ?? getStoredAccessToken();
      if (!effectiveToken) {
        setUser(null);
        return;
      }

      setIsLoading(true);
      try {
        const profile = await authApi.me();
        setUser(profile);
        setError(null);
      } catch (err) {
        setUser(null);
        applyToken(null);
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, applyToken],
  );

  useEffect(() => {
    const stored = getStoredAccessToken();
    if (!stored) {
      setIsReady(true);
      return;
    }

    applyToken(stored);
    loadProfile(stored)
      .catch(() => {
        // ошибка уже записана
      })
      .finally(() => setIsReady(true));
  }, [applyToken, loadProfile]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.register(payload);
        applyToken(res.accessToken);
        setUser(res.user);
        setError(null);
        setIsReady(true);
        return res.user;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [applyToken],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.login(payload);
        applyToken(res.accessToken);
        setUser(res.user);
        setError(null);
        setIsReady(true);
        return res.user;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    setUser(null);
    applyToken(null);
    setError(null);
  }, [applyToken]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      accessToken,
      isReady,
      isLoading,
      error,
      register,
      login,
      logout,
      refreshProfile,
      clearError,
    }),
    [
      accessToken,
      clearError,
      error,
      isLoading,
      isReady,
      login,
      logout,
      refreshProfile,
      register,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
