'use client';

import { useEffect, useState } from 'react';
import { adminAnalyticsApi } from '@/features/admin/api';
import { useAdmin } from '@/components/admin/AdminProvider';

type RevenueData = {
  date: string;
  revenue: number;
  profit: number;
  purchaseCost: number;
  courierCost: number;
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
  const { currentDarkstore } = useAdmin();

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
  }, [period, currentDarkstore?.id]);

  if (isLoading) {
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>

      {/* Сводка по экономике */}
      {revenueData.length > 0 && (() => {
        const totals = revenueData.reduce(
          (acc, d) => ({
            revenue: acc.revenue + d.revenue,
            profit: acc.profit + d.profit,
            purchaseCost: acc.purchaseCost + d.purchaseCost,
            courierCost: acc.courierCost + d.courierCost,
          }),
          { revenue: 0, profit: 0, purchaseCost: 0, courierCost: 0 }
        );
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-sm text-gray-500">Выручка</div>
              <div className="text-2xl font-bold text-blue-700">{totals.revenue.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-sm text-gray-500">Себестоимость</div>
              <div className="text-2xl font-bold text-orange-600">{totals.purchaseCost.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-sm text-gray-500">Доставка курьерам</div>
              <div className="text-2xl font-bold text-purple-600">{totals.courierCost.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-sm text-gray-500">Прибыль</div>
              <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.profit.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>
        );
      })()}

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
                  <div className="flex gap-0.5 items-end">
                    <div
                      className="w-6 bg-blue-500 rounded-t"
                      title={`Выручка: ${item.revenue.toLocaleString('ru-RU')} ₽`}
                      style={{
                        height: `${Math.max(20, (item.revenue / 10) || 20)}px`,
                      } as React.CSSProperties}
                    />
                    <div
                      className={`w-6 rounded-t ${item.profit >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                      title={`Прибыль: ${item.profit.toLocaleString('ru-RU')} ₽`}
                      style={{
                        height: `${Math.max(10, Math.abs(item.profit) / 10 || 10)}px`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <div className="text-xs text-gray-900 text-center mt-1 font-medium">
                    {item.revenue.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className={`text-xs text-center ${item.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {item.profit >= 0 ? '+' : ''}{item.profit.toLocaleString('ru-RU')} ₽
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
