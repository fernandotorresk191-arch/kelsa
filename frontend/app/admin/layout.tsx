'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdmin } from '@/components/admin/AdminProvider';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isLoading, isAuthenticated, logout } = useAdmin();

  // Страница логина не требует аутентификации
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // Для страницы логина — просто показываем children без оболочки
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Хедер */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-bold text-xl text-blue-600">
            Kelsa Admin
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {admin?.email} ({admin?.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Выход
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Сайдбар */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="space-y-2 p-4">
            <Link
              href="/admin"
              className={`block px-4 py-2 rounded-lg transition ${pathname === '/admin' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              📊 Панель управления
            </Link>
            <Link
              href="/admin/orders"
              className={`block px-4 py-2 rounded-lg transition ${pathname.startsWith('/admin/orders') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              📦 Заказы
            </Link>
            <Link
              href="/admin/catalog"
              className={`block px-4 py-2 rounded-lg transition ${pathname.startsWith('/admin/catalog') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              📁 Каталог
            </Link>
            <Link
              href="/admin/products"
              className={`block px-4 py-2 rounded-lg transition ${pathname.startsWith('/admin/products') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              🛍️ Товары
            </Link>
            <Link
              href="/admin/promotions"
              className={`block px-4 py-2 rounded-lg transition ${pathname.startsWith('/admin/promotions') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              🎯 Баннеры
            </Link>
            <Link
              href="/admin/analytics"
              className={`block px-4 py-2 rounded-lg transition ${pathname.startsWith('/admin/analytics') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
            >
              📈 Аналитика
            </Link>
          </nav>
        </aside>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
