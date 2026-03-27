'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminOrdersApi, adminChatApi } from '@/features/admin/api';
import { Order, OrderStatus, OrderStatusLabels } from '@/features/admin/types';
import { useOrdersSSE, OrderEventData } from '@/features/admin/useOrdersSSE';
import { useAdmin } from '@/components/admin/AdminProvider';

// Статусы с современными стилями
const StatusStyles: Record<OrderStatus, string> = {
  NEW: 'admin-status-new',
  CONFIRMED: 'admin-status-confirmed',
  ASSEMBLING: 'admin-status-assembling',
  ASSIGNED_TO_COURIER: 'admin-status-assigned',
  ACCEPTED_BY_COURIER: 'admin-status-accepted',
  ON_THE_WAY: 'admin-status-delivering',
  DELIVERED: 'admin-status-completed',
  CANCELED: 'admin-status-cancelled',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [recentOrderIds, setRecentOrderIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const { currentDarkstore } = useAdmin();

  const limit = 20;

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await adminOrdersApi.getOrders(page, limit, statusFilter || undefined);
      setOrders(response.data as unknown as Order[]);
      setTotal(response.pagination.total);
      setNewOrdersCount(0);
      setRecentOrderIds(new Set());
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread chat counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const counts = await adminChatApi.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  }, []);

  const handleNewOrder = useCallback((orderData: OrderEventData['order']) => {
    if (page === 1 && !statusFilter) {
      setOrders((prev) => {
        if (prev.some((o) => o.id === orderData.id)) {
          return prev;
        }
        const newOrder: Order = {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          phone: orderData.phone,
          totalAmount: orderData.totalAmount,
          status: orderData.status as OrderStatus,
          createdAt: orderData.createdAt,
          items: [],
          userId: '',
          addressLine: '',
          deliveryFee: 0,
          updatedAt: orderData.createdAt,
          user: {
            id: '',
            login: '',
            name: orderData.customerName,
            phone: orderData.phone,
          },
          statusHistory: [],
        };
        return [newOrder, ...prev.slice(0, limit - 1)];
      });
      setTotal((prev) => prev + 1);
      setRecentOrderIds((prev) => new Set(prev).add(orderData.id));
      setTimeout(() => {
        setRecentOrderIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderData.id);
          return newSet;
        });
      }, 5000);
    } else {
      setNewOrdersCount((prev) => prev + 1);
    }
  }, [page, statusFilter, limit]);

  const handleOrderUpdated = useCallback((orderData: OrderEventData['order']) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderData.id
          ? { ...order, status: orderData.status as OrderStatus }
          : order
      )
    );
  }, []);

  useOrdersSSE({
    onNewOrder: handleNewOrder,
    onOrderUpdated: handleOrderUpdated,
    enabled: true,
  });

  useEffect(() => {
    fetchOrders();
    fetchUnreadCounts();
    // Периодически обновляем счётчики непрочитанных сообщений
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, currentDarkstore?.id]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Заказы</h1>
          <p className="admin-page-subtitle">Управление заказами клиентов</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full font-medium">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live обновления
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
          className="w-full admin-card p-4 border-2 border-indigo-200 hover:border-indigo-300 transition-colors flex items-center justify-center gap-3 group"
        >
          <span className="text-2xl group-hover:animate-bounce">🔔</span>
          <span className="font-semibold text-indigo-700">
            {newOrdersCount} {newOrdersCount === 1 ? 'новый заказ' : 'новых заказов'}
          </span>
          <span className="text-sm text-indigo-500">(нажмите для обновления)</span>
        </button>
      )}

      {/* Фильтры */}
      <div className="admin-card">
        <div className="admin-card-body">
          <div className="flex items-center gap-4">
            <label htmlFor="status-filter" className="text-sm font-medium text-slate-600">
              Фильтр:
            </label>
            <select
              id="status-filter"
              title="Фильтр по статусу"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="admin-input admin-select max-w-xs"
            >
              <option value="">Все статусы</option>
              {Object.entries(OrderStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label as React.ReactNode}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <span className="text-sm text-slate-500">
              Всего: <strong>{total}</strong> заказов
            </span>
          </div>
        </div>
      </div>

      {/* Таблица заказов */}
      <div className="admin-card">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📦</div>
            <div className="admin-empty-title">Заказы не найдены</div>
            <div className="admin-empty-text">Попробуйте изменить фильтры</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>№ заказа</th>
                    <th>Клиент</th>
                    <th>Статус</th>
                    <th className="text-right">Сумма</th>
                    <th>Дата</th>
                    <th className="admin-th-actions">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={recentOrderIds.has(order.id) ? 'bg-emerald-50' : ''}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-600">#{order.orderNumber}</span>
                          {recentOrderIds.has(order.id) && (
                            <span className="admin-badge admin-badge-success text-xs">Новый!</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.phone}</div>
                      </td>
                      <td>
                        <span className={`admin-badge px-3 py-1 ${StatusStyles[order.status] || 'admin-badge-gray'}`}>
                          {OrderStatusLabels[order.status]}
                        </span>
                      </td>
                      <td className="text-left font-semibold text-slate-800">
                        {order.totalAmount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="text-slate-600">
                        <div>{new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                          >
                            Открыть
                          </Link>
                          {(unreadCounts[order.id] ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full animate-pulse">
                              {unreadCounts[order.id]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="admin-card-body border-t border-slate-200 flex items-center justify-between">
              <div className="admin-pagination-info">
                Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
              </div>
              <div className="admin-pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="admin-pagination-btn"
                >
                  ← Назад
                </button>
                <span className="admin-pagination-info">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="admin-pagination-btn"
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
