'use client';

import { useEffect, useState } from 'react';
import { adminAnalyticsApi } from '@/features/admin/api';

type RevenueData = {
  date: string;
  revenue: number;
};

type ProductSalesData = {
  productId: string;
  title: string;
  totalSold: number;
  totalRevenue: number;
  ordersCount: number;
};

export default function AdminAnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [productsSales, setProductsSales] = useState<ProductSalesData[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const [revenue, sales] = await Promise.all([
          adminAnalyticsApi.getRevenueAnalytics(period),
          adminAnalyticsApi.getProductsSales(),
        ]);
        const revenueData = revenue as { data: RevenueData[] };
        const salesData = sales as { data: ProductSalesData[] };
        setRevenueData(revenueData.data);
        setProductsSales(salesData.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  if (isLoading) {
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>

      {/* Выручка */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Выручка по периодам</h2>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4">
            {revenueData.length > 0 ? (
              revenueData.map((item) => (
                <div key={item.date} className="flex-shrink-0 flex flex-col items-center">
                  <div className="text-xs text-gray-600 text-center mb-1">
                    {new Date(item.date).toLocaleDateString('ru-RU')}
                  </div>
                  {/* Dynamic height for chart bar - inline style is required here */}
                  <div
                    className="w-12 bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.max(30, (item.revenue / 10) || 30)}px`,
                    } as React.CSSProperties}
                  />
                  <div className="text-xs text-gray-900 text-center mt-1 font-medium">
                    {item.revenue.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-600">Нет данных</div>
            )}
          </div>
        </div>
      </div>

      {/* Топ продаж */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6">Топ товаров по продажам</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">#</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Товар</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Продано шт.</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Заказов</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Выручка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productsSales.map((product, index) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-900">{product.title}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.totalSold}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.ordersCount}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {product.totalRevenue.toLocaleString('ru-RU')} ₽
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
