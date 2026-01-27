'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Courier } from '@/features/courier/types';
import { courierAuthApi } from '@/features/courier/api';

type CourierContextType = {
  courier: Courier | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateCourier: (courier: Courier) => void;
};

const CourierContext = createContext<CourierContextType | undefined>(undefined);

const COURIER_TOKEN_KEY = 'courier_token';

export function CourierProvider({ children }: { children: ReactNode }) {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem(COURIER_TOKEN_KEY);
      if (!token) {
        setCourier(null);
        return;
      }

      const profile = await courierAuthApi.getProfile();
      setCourier(profile);
    } catch {
      setCourier(null);
      localStorage.removeItem(COURIER_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (login: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await courierAuthApi.login(login, password);
      localStorage.setItem(COURIER_TOKEN_KEY, response.accessToken);
      setCourier(response.courier);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(COURIER_TOKEN_KEY);
    setCourier(null);
  }, []);

  const updateCourier = useCallback((updatedCourier: Courier) => {
    setCourier(updatedCourier);
  }, []);

  return (
    <CourierContext.Provider 
      value={{ 
        courier, 
        isLoading, 
        isAuthenticated: !!courier, 
        login, 
        logout, 
        checkAuth,
        updateCourier,
      }}
    >
      {children}
    </CourierContext.Provider>
  );
}

export function useCourier() {
  const context = useContext(CourierContext);
  if (context === undefined) {
    throw new Error('useCourier must be used within CourierProvider');
  }
  return context;
}
