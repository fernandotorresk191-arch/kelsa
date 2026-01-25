'use client';

import { useEffect, useState } from 'react';
import { adminAnalyticsApi } from '@/features/admin/api';
import { DashboardStats, OrderStatusLabels } from '@/features/admin/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await adminAnalyticsApi.getDashboard();
        const dashData = data as DashboardStats;
        setStats(dashData);
      } catch (error: unknown) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">⚠️</div>
        <div className="admin-empty-title">Ошибка загрузки</div>
        <div className="admin-empty-text">Не удалось загрузить данные дашборда</div>
      </div>
    );
  }

  const { overview, ordersByStatus, topProducts } = stats;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Добро пожаловать!</h1>
          <p className="admin-page-subtitle">Обзор ключевых показателей вашего магазина</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-kpi-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kpi-label">Всего заказов</p>
              <p className="admin-kpi-value">{overview.totalOrders.toLocaleString('ru-RU')}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="admin-kpi-card success">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kpi-label">Общая выручка</p>
              <p className="admin-kpi-value success">{overview.totalRevenue.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kpi-label">Выручка сегодня</p>
              <p className="admin-kpi-value primary">{overview.totalRevenueToday.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-kpi-label">Средний чек</p>
              <p className="admin-kpi-value accent">{overview.averageOrderValue.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Заказы по статусам */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Заказы по статусам</h2>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ordersByStatus.map((item: { status: string; _count: number }) => (
              <div 
                key={item.status} 
                className="text-center p-5 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white hover:shadow-md transition-shadow"
              >
                <p className="text-3xl font-bold text-slate-800">{item._count}</p>
                <p className="text-sm text-slate-500 mt-2">
                  {OrderStatusLabels[item.status as keyof typeof OrderStatusLabels]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Топ товаров */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <h2 className="admin-card-title">Топ товаров по продажам</h2>
          <span className="admin-badge admin-badge-primary">
            {topProducts.length} товаров
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th-narrow">#</th>
                <th>Товар</th>
                <th className="text-right">Продано</th>
                <th className="text-right">Выручка</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product: { productId: string; title: string; _sum: { qty: number; amount: number } }, index: number) => (
                <tr key={product.productId}>
                  <td>
                    <span className={`
                      inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold
                      ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                        index === 1 ? 'bg-slate-200 text-slate-600' : 
                        index === 2 ? 'bg-orange-100 text-orange-700' : 
                        'bg-slate-100 text-slate-500'}
                    `}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="font-medium">{product.title}</td>
                  <td className="text-right text-slate-600">
                    <span className="admin-badge admin-badge-gray">{product._sum.qty} шт.</span>
                  </td>
                  <td className="text-right font-semibold text-slate-800">
                    {product._sum.amount.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
