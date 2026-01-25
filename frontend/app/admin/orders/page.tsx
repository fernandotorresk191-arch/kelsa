'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminOrdersApi } from '@/features/admin/api';
import { Order, OrderStatus, OrderStatusLabels, OrderStatusColors } from '@/features/admin/types';
import { useOrdersSSE, OrderEventData } from '@/features/admin/useOrdersSSE';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [recentOrderIds, setRecentOrderIds] = useState<Set<string>>(new Set());

  const limit = 20;

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await adminOrdersApi.getOrders(page, limit, statusFilter || undefined);
      setOrders(response.data as unknown as Order[]);
      setTotal(response.pagination.total);
      setNewOrdersCount(0); // Сбрасываем счетчик при загрузке
      setRecentOrderIds(new Set()); // Сбрасываем подсветку
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик нового заказа через SSE
  const handleNewOrder = useCallback((orderData: OrderEventData['order']) => {
    // Если мы на первой странице и нет фильтра, добавляем заказ в начало списка
    if (page === 1 && !statusFilter) {
      setOrders((prev) => {
        // Проверяем, нет ли уже такого заказа
        if (prev.some((o) => o.id === orderData.id)) {
          return prev;
        }
        // Добавляем новый заказ в начало
        const newOrder: Order = {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          phone: orderData.phone,
          totalAmount: orderData.totalAmount,
          status: orderData.status as OrderStatus,
          createdAt: orderData.createdAt,
          items: [],
        };
        return [newOrder, ...prev.slice(0, limit - 1)];
      });
      setTotal((prev) => prev + 1);
      
      // Добавляем ID для подсветки
      setRecentOrderIds((prev) => new Set(prev).add(orderData.id));
      
      // Убираем подсветку через 5 секунд
      setTimeout(() => {
        setRecentOrderIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderData.id);
          return newSet;
        });
      }, 5000);
    } else {
      // Если не на первой странице, показываем уведомление
      setNewOrdersCount((prev) => prev + 1);
    }
  }, [page, statusFilter, limit]);

  // Обработчик обновления заказа через SSE
  const handleOrderUpdated = useCallback((orderData: OrderEventData['order']) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderData.id
          ? { ...order, status: orderData.status as OrderStatus }
          : order
      )
    );
  }, []);

  // Подключаемся к SSE стриму
  useOrdersSSE({
    onNewOrder: handleNewOrder,
    onOrderUpdated: handleOrderUpdated,
    enabled: true,
  });

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Управление заказами</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Уведомление о новых заказах */}
      {newOrdersCount > 0 && (
        <button
          onClick={() => {
            setPage(1);
            setStatusFilter('');
            fetchOrders();
          }}
          className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">🔔</span>
          <span className="font-medium">
            {newOrdersCount} {newOrdersCount === 1 ? 'новый заказ' : 'новых заказов'}
          </span>
          <span className="text-sm">(нажмите для обновления)</span>
        </button>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4">
        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Фильтр по статусу
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все статусы</option>
          {Object.entries(OrderStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label as React.ReactNode}
            </option>
          ))}
        </select>
      </div>

      {/* Таблица заказов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Заказы не найдены</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      №
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 transition-colors duration-500 ${
                        recentOrderIds.has(order.id) 
                          ? 'bg-green-50 animate-pulse' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        #{order.orderNumber}
                        {recentOrderIds.has(order.id) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Новый!
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-500">{order.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            OrderStatusColors[order.status as OrderStatus]
                          }`}
                        >
                          {OrderStatusLabels[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {order.totalAmount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Просмотр →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Показано {(page - 1) * limit + 1}-{Math.min(page * limit, total)} из {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  ← Назад
                </button>
                <span className="px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Далее →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
