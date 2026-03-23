'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AdminUser } from '@/features/admin/types';
import { adminAuthApi } from '@/features/admin/api';

type AdminContextType = {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (section: string) => boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setAdmin(null);
        return;
      }

      const profile = await adminAuthApi.getProfile();
      setAdmin(profile as AdminUser);
    } catch {
      setAdmin(null);
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await adminAuthApi.login(email, password);
      localStorage.setItem('admin_token', response.accessToken);
      setAdmin(response.admin as AdminUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  }, []);

  const hasPermission = useCallback((section: string) => {
    if (!admin) return false;
    // Админ имеет доступ ко всему
    if (admin.role === 'admin') return true;
    // Менеджер — только к разрешённым разделам
    if (!admin.permissions || admin.permissions.length === 0) return false;
    return admin.permissions.includes(section);
  }, [admin]);

  return (
    <AdminContext.Provider value={{ admin, isLoading, isAuthenticated: !!admin, login, logout, checkAuth, hasPermission }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
