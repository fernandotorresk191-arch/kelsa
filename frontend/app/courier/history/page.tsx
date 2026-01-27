'use client';

import { useEffect, useState } from 'react';
import { courierOrdersApi } from '@/features/courier/api';
import { CourierOrder, CourierOrderStatusLabels } from '@/features/courier/types';

export default function CourierHistoryPage() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await courierOrdersApi.getHistory();
        setOrders(response.data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      'DELIVERED': 'courier-status-delivered',
      'CANCELED': 'courier-status-canceled',
    };
    return map[status] || '';
  };

  if (isLoading) {
    return (
      <div className="courier-empty">
        <div className="courier-spinner courier-center" />
        <p>Загрузка истории...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="courier-page-title">
        История доставок
      </h2>

      {orders.length === 0 ? (
        <div className="courier-empty">
          <div className="courier-empty-icon">📜</div>
          <div className="courier-empty-title">История пуста</div>
          <div className="courier-empty-text">
            Здесь будут отображаться доставленные заказы
          </div>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order.id} className="courier-card">
              <div className="courier-card-header">
                <span className="courier-order-number">#{order.orderNumber}</span>
                <span className={`courier-order-status ${getStatusClass(order.status)}`}>
                  {CourierOrderStatusLabels[order.status] || order.status}
                </span>
              </div>

              <div className="courier-card-body">
                <div className="courier-order-info">
                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Клиент</div>
                      <div className="courier-order-value">{order.customerName}</div>
                    </div>
                  </div>

                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Адрес</div>
                      <div className="courier-order-value">{order.addressLine}</div>
                    </div>
                  </div>

                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Дата</div>
                      <div className="courier-order-value">
                        {new Date(order.updatedAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Сумма</div>
                      <div className="courier-order-value courier-font-semibold">
                        {order.totalAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
