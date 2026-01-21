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
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-center text-red-600">Ошибка при загрузке данных</div>;
  }

  const { overview, ordersByStatus, topProducts } = stats;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Панель управления</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Всего заказов</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalOrders}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Общая выручка</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {overview.totalRevenue.toLocaleString('ru-RU')} ₽
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Выручка сегодня</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {overview.totalRevenueToday.toLocaleString('ru-RU')} ₽
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Средний чек</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {overview.averageOrderValue.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Заказы по статусам */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Заказы по статусам</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {ordersByStatus.map((item: { status: string; _count: number }) => (
            <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{item._count}</p>
              <p className="text-sm text-gray-600 mt-1">
                {OrderStatusLabels[item.status as keyof typeof OrderStatusLabels]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Топ товаров */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Топ товаров по продажам</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">#</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Товар</th>
                <th className="px-4 py-2 text-right text-gray-600 font-medium">Продано шт.</th>
                <th className="px-4 py-2 text-right text-gray-600 font-medium">Выручка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product: { productId: string; title: string; _sum: { qty: number; amount: number } }, index: number) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 text-gray-900 font-medium">{product.title}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{product._sum.qty}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">
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
