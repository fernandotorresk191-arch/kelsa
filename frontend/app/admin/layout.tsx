'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdmin } from '@/components/admin/AdminProvider';
import Link from 'next/link';
import Image from 'next/image';
import './admin.css';

// Иконки для навигации
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  catalog: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  banners: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  purchases: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
    </svg>
  ),
  expiry: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  couriers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (pathname: string) => boolean;
  section?: string;
  permission?: string; // ключ для проверки доступа менеджера
}

const navItems: NavItem[] = [
  { 
    href: '/admin', 
    label: 'Дашборд', 
    icon: Icons.dashboard,
    match: (p) => p === '/admin',
    permission: 'dashboard'
  },
  { 
    href: '/admin/orders', 
    label: 'Заказы', 
    icon: Icons.orders,
    match: (p) => p.startsWith('/admin/orders'),
    permission: 'orders'
  },
  { 
    href: '/admin/catalog', 
    label: 'Каталог', 
    icon: Icons.catalog,
    match: (p) => p.startsWith('/admin/catalog'),
    permission: 'catalog'
  },
  { 
    href: '/admin/products', 
    label: 'Товары', 
    icon: Icons.products,
    match: (p) => p.startsWith('/admin/products'),
    permission: 'products'
  },
  { 
    href: '/admin/promotions', 
    label: 'Баннеры', 
    icon: Icons.banners,
    match: (p) => p.startsWith('/admin/promotions'),
    permission: 'promotions'
  },
  { 
    href: '/admin/purchases', 
    label: 'Закупки', 
    icon: Icons.purchases,
    match: (p) => p.startsWith('/admin/purchases'),
    section: 'Склад',
    permission: 'purchases'
  },
  { 
    href: '/admin/expiry', 
    label: 'Просрочка', 
    icon: Icons.expiry,
    match: (p) => p.startsWith('/admin/expiry'),
    permission: 'expiry'
  },
  { 
    href: '/admin/analytics', 
    label: 'Аналитика', 
    icon: Icons.analytics,
    match: (p) => p.startsWith('/admin/analytics'),
    section: 'Отчёты',
    permission: 'analytics'
  },
  { 
    href: '/admin/couriers', 
    label: 'Курьеры', 
    icon: Icons.couriers,
    match: (p) => p.startsWith('/admin/couriers'),
    section: 'Доставка',
    permission: 'couriers'
  },
  { 
    href: '/admin/users', 
    label: 'Пользователи', 
    icon: Icons.users,
    match: (p) => p.startsWith('/admin/users'),
    section: 'Система',
    permission: 'users'
  },
];

// Все доступные разделы для назначения менеджерам
export const ALL_SECTIONS = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'orders', label: 'Заказы' },
  { key: 'catalog', label: 'Каталог' },
  { key: 'products', label: 'Товары' },
  { key: 'promotions', label: 'Баннеры' },
  { key: 'purchases', label: 'Закупки' },
  { key: 'expiry', label: 'Просрочка' },
  { key: 'analytics', label: 'Аналитика' },
  { key: 'couriers', label: 'Курьеры' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isLoading, isAuthenticated, logout, hasPermission } = useAdmin();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="admin-spinner mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Проверка доступа менеджера к текущему разделу
  const currentNavItem = navItems.find(item => item.match ? item.match(pathname) : pathname === item.href);
  const currentPermission = currentNavItem?.permission;
  if (currentPermission && !hasPermission(currentPermission)) {
    // Найти первый доступный раздел для редиректа
    const firstAllowed = navItems.find(item => item.permission && hasPermission(item.permission));
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Доступ к этому разделу закрыт</p>
          <button
            onClick={() => router.push(firstAllowed?.href || '/admin')}
            className="admin-btn admin-btn-primary"
          >
            Перейти в доступный раздел
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  let currentSection = '';

  return (
    <div className="fixed inset-0 z-50 flex admin-root">
      {/* Сайдбар */}
      <aside 
        className="w-64 flex-shrink-0 flex flex-col admin-scrollbar overflow-y-auto admin-sidebar"
      >
        {/* Логотип */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image 
              src="/logo-admin.svg" 
              alt="kelsa.bo" 
              width={32} 
              height={32}
              className="invert"
            />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">Kelsa</span>
            <span className="text-xl font-light text-indigo-400">.Bo</span>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !item.permission || hasPermission(item.permission))
            .map((item) => {
            const showSection = item.section && item.section !== currentSection;
            if (item.section) currentSection = item.section;
            
            const isActive = item.match ? item.match(pathname) : pathname === item.href;
            
            return (
              <div key={item.href}>
                {showSection && (
                  <div className="admin-nav-section mt-6 first:mt-0">{item.section}</div>
                )}
                <Link
                  href={item.href}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Профиль */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
              {admin?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {admin?.name || admin?.email}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {admin?.role === 'admin' ? 'Администратор' : 'Менеджер'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 admin-nav-item hover:!bg-red-500/20 hover:!text-red-400"
          >
            <span className="admin-nav-icon">{Icons.logout}</span>
            Выйти
          </button>
        </div>
      </aside>
      {/* Основной контент */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Хедер */}
        <header 
          className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b admin-header"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-800">
              {navItems.find(item => item.match ? item.match(pathname) : pathname === item.href)?.label || 'Панель управления'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Онлайн
            </span>
          </div>
        </header>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto p-6 admin-scrollbar admin-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
