'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AdminUser, Darkstore } from '@/features/admin/types';
import { adminAuthApi, adminDarkstoresApi } from '@/features/admin/api';
import { setAdminDarkstoreId, getAdminDarkstoreId } from '@/shared/api/http';

type AdminContextType = {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (section: string) => boolean;
  darkstores: Darkstore[];
  currentDarkstore: Darkstore | null;
  switchDarkstore: (id: string) => void;
  refreshDarkstores: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkstores, setDarkstores] = useState<Darkstore[]>([]);
  const [currentDarkstore, setCurrentDarkstore] = useState<Darkstore | null>(null);

  const applyDarkstore = useCallback((stores: Darkstore[]) => {
    setDarkstores(stores);
    const savedId = getAdminDarkstoreId();
    const found = stores.find(d => d.id === savedId);
    if (found) {
      setCurrentDarkstore(found);
      setAdminDarkstoreId(found.id);
    } else if (stores.length > 0) {
      setCurrentDarkstore(stores[0]);
      setAdminDarkstoreId(stores[0].id);
    } else {
      setCurrentDarkstore(null);
      setAdminDarkstoreId(null);
    }
  }, []);

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

      // Load darkstores
      if (profile.darkstores && profile.darkstores.length > 0) {
        applyDarkstore(profile.darkstores);
      } else {
        // Fallback: fetch from API
        try {
          const stores = await adminDarkstoresApi.list();
          applyDarkstore(stores);
        } catch {
          // ignore
        }
      }
    } catch {
      setAdmin(null);
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  }, [applyDarkstore]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await adminAuthApi.login(email, password);
      localStorage.setItem('admin_token', response.accessToken);
      setAdmin(response.admin as AdminUser);

      // Set darkstores from login response
      if (response.darkstores && response.darkstores.length > 0) {
        applyDarkstore(response.darkstores);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyDarkstore]);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdminDarkstoreId(null);
    setAdmin(null);
    setDarkstores([]);
    setCurrentDarkstore(null);
  }, []);

  const switchDarkstore = useCallback((id: string) => {
    const found = darkstores.find(d => d.id === id);
    if (found) {
      setCurrentDarkstore(found);
      setAdminDarkstoreId(found.id);
    }
  }, [darkstores]);

  const refreshDarkstores = useCallback(async () => {
    try {
      const stores = admin?.role === 'superadmin'
        ? await adminDarkstoresApi.list()
        : (await adminAuthApi.getProfile()).darkstores || [];
      applyDarkstore(stores);
    } catch {
      // ignore
    }
  }, [admin?.role, applyDarkstore]);

  const hasPermission = useCallback((section: string) => {
    if (!admin) return false;
    // Суперадмин и админ имеют доступ ко всему
    if (admin.role === 'superadmin' || admin.role === 'admin') return true;
    // Менеджер — только к разрешённым разделам
    if (!admin.permissions || admin.permissions.length === 0) return false;
    return admin.permissions.includes(section);
  }, [admin]);

  return (
    <AdminContext.Provider value={{ admin, isLoading, isAuthenticated: !!admin, login, logout, checkAuth, hasPermission, darkstores, currentDarkstore, switchDarkstore, refreshDarkstores }}>
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
