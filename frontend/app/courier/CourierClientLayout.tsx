'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CourierProvider, useCourier } from '@/components/courier/CourierProvider';
import './courier.css';

function CourierLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { courier, isLoading, isAuthenticated, logout } = useCourier();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !pathname.includes('/courier/login')) {
      router.push('/courier/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Показываем загрузку
  if (isLoading) {
    return (
      <div className="courier-loading-screen">
        <div className="courier-spinner" />
        <p>Загрузка...</p>
      </div>
    );
  }

  // Страница логина без layout
  if (pathname.includes('/courier/login')) {
    return <>{children}</>;
  }

  // Не авторизован
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="courier-app">
      {/* Header */}
      <header className="courier-header">
        <div className="courier-header-content">
          <div className="courier-header-left">
            <span className="courier-logo">🚚</span>
            <span className="courier-title">Kelsa Курьер</span>
          </div>
          <div className="courier-header-right">
            <span className="courier-name">{courier?.fullName}</span>
            <button onClick={logout} className="courier-logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="courier-main">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="courier-nav">
        <a 
          href="/courier" 
          className={`courier-nav-item ${pathname === '/courier' ? 'active' : ''}`}
        >
          <svg className="courier-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Заказы</span>
        </a>
        <a 
          href="/courier/history" 
          className={`courier-nav-item ${pathname === '/courier/history' ? 'active' : ''}`}
        >
          <svg className="courier-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>История</span>
        </a>
        <a 
          href="/courier/profile" 
          className={`courier-nav-item ${pathname === '/courier/profile' ? 'active' : ''}`}
        >
          <svg className="courier-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Профиль</span>
        </a>
      </nav>
    </div>
  );
}

export default function CourierClientLayout({ children }: { children: ReactNode }) {
  return (
    <CourierProvider>
      <CourierLayoutContent>{children}</CourierLayoutContent>
    </CourierProvider>
  );
}
