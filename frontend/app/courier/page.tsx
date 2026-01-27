'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCourier } from '@/components/courier/CourierProvider';
import { courierOrdersApi } from '@/features/courier/api';
import { CourierOrder, CourierOrderStatusLabels, CourierStatusLabels } from '@/features/courier/types';
import { API_URL } from '@/shared/api/config';

export default function CourierOrdersPage() {
  const { courier, updateCourier } = useCourier();
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showStartDeliveryConfirm, setShowStartDeliveryConfirm] = useState(false);
  
  // Состояние для модального окна подтверждения доставки
  const [deliveryConfirmOrderId, setDeliveryConfirmOrderId] = useState<string | null>(null);

  // Загрузка заказов
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await courierOrdersApi.getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обновить статус курьера
  const refreshStatus = useCallback(async () => {
    try {
      const statusResponse = await courierOrdersApi.getStatus();
      if (courier && statusResponse.status !== courier.status) {
        updateCourier({ ...courier, status: statusResponse.status as typeof courier.status });
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  }, [courier, updateCourier]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // SSE для live обновлений
  useEffect(() => {
    const token = localStorage.getItem('courier_token');
    if (!token) return;

    const eventSource = new EventSource(`${API_URL}/v1/courier/events/orders?token=${token}`);

    eventSource.addEventListener('order', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE Event:', data);
        
        if (data.type === 'ORDER_ASSIGNED_TO_COURIER') {
          // Новый заказ назначен - обновляем список
          fetchOrders();
        } else if (data.type === 'ORDER_UPDATED') {
          // Обновляем статус заказа в списке
          setOrders(prev => prev.map(order => 
            order.id === data.order.id 
              ? { ...order, status: data.order.status }
              : order
          ));
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    });

    eventSource.onerror = () => {
      console.error('SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [fetchOrders]);

  // Принять заказ
  const handleAcceptOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await courierOrdersApi.acceptOrder(orderId);
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'ACCEPTED_BY_COURIER' }
          : order
      ));
      await refreshStatus();
    } catch (error) {
      console.error('Failed to accept order:', error);
      alert('Ошибка при принятии заказа');
    } finally {
      setActionLoading(null);
    }
  };

  // Начать доставку
  const handleStartDelivery = async () => {
    try {
      setActionLoading('start-delivery');
      await courierOrdersApi.startDelivery();
      setOrders(prev => prev.map(order =>
        order.status === 'ACCEPTED_BY_COURIER'
          ? { ...order, status: 'ON_THE_WAY' }
          : order
      ));
      await refreshStatus();
      setShowStartDeliveryConfirm(false);
    } catch (error) {
      console.error('Failed to start delivery:', error);
      alert('Ошибка при начале доставки');
    } finally {
      setActionLoading(null);
    }
  };

  // Доставить заказ (товар передан клиенту)
  const handleDeliverOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await courierOrdersApi.deliverOrder(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
      await refreshStatus();
    } catch (error) {
      console.error('Failed to deliver order:', error);
      alert('Ошибка при доставке заказа');
    } finally {
      setActionLoading(null);
      setDeliveryConfirmOrderId(null);
    }
  };

  // Отменить заказ (товар не передан)
  const handleCancelOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await courierOrdersApi.cancelOrder(orderId, 'Товар не передан клиенту');
      setOrders(prev => prev.filter(order => order.id !== orderId));
      await refreshStatus();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('Ошибка при отмене заказа');
    } finally {
      setActionLoading(null);
      setDeliveryConfirmOrderId(null);
    }
  };

  // Открыть модальное окно подтверждения доставки
  const openDeliveryConfirm = (orderId: string) => {
    setDeliveryConfirmOrderId(orderId);
  };

  // Статус заказа -> стиль
  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      'ASSIGNED_TO_COURIER': 'courier-status-assigned',
      'ACCEPTED_BY_COURIER': 'courier-status-accepted',
      'ON_THE_WAY': 'courier-status-delivering',
    };
    return map[status] || '';
  };

  // Есть ли принятые заказы
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED_BY_COURIER');
  const hasAcceptedOrders = acceptedOrders.length > 0;

  // Статус курьера
  const courierStatusClass = courier?.status === 'AVAILABLE' 
    ? 'available' 
    : courier?.status === 'ACCEPTED' 
      ? 'accepted' 
      : 'delivering';

  if (isLoading) {
    return (
      <div className="courier-empty">
        <div className="courier-spinner courier-center" />
        <p>Загрузка заказов...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Статус курьера */}
      <div className={`courier-my-status ${courierStatusClass}`}>
        <span className="courier-my-status-dot" />
        <span>{courier?.status ? CourierStatusLabels[courier.status] : 'Загрузка...'}</span>
        {orders.length > 0 && (
          <span className="courier-ml-auto courier-font-semibold">
            {orders.length} заказ{orders.length === 1 ? '' : orders.length < 5 ? 'а' : 'ов'}
          </span>
        )}
      </div>

      {/* Список заказов */}
      {orders.length === 0 ? (
        <div className="courier-empty">
          <div className="courier-empty-icon">📦</div>
          <div className="courier-empty-title">Нет активных заказов</div>
          <div className="courier-empty-text">
            Ожидайте назначения заказов от менеджера
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
                  {/* Клиент */}
                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Клиент</div>
                      <div className="courier-order-value">{order.customerName}</div>
                    </div>
                  </div>

                  {/* Телефон */}
                  <div className="courier-order-row">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">Телефон</div>
                      <a href={`tel:${order.phone}`} className="courier-phone-link">
                        {order.phone}
                      </a>
                    </div>
                  </div>

                  {/* Адрес */}
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

                  {/* Комментарий */}
                  {order.comment && (
                    <div className="courier-order-row">
                      <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <div>
                        <div className="courier-order-label">Комментарий</div>
                        <div className="courier-order-value">{order.comment}</div>
                      </div>
                    </div>
                  )}

                  {/* Товары */}
                  <div className="courier-order-items">
                    <div className="courier-order-items-title">Товары:</div>
                    {order.items.map((item) => (
                      <div key={item.id} className="courier-order-item">
                        <span className="courier-order-item-name">{item.title}</span>
                        <span className="courier-order-item-qty">× {item.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Сумма */}
                  <div className="courier-order-row courier-mt-sm">
                    <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <div className="courier-order-label">К оплате</div>
                      <div className="courier-order-total">{order.totalAmount.toLocaleString('ru-RU')} ₽</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="courier-card-footer">
                {order.status === 'ASSIGNED_TO_COURIER' && (
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={actionLoading === order.id}
                    className="courier-btn courier-btn-primary"
                  >
                    {actionLoading === order.id ? 'Обработка...' : '✓ Взять заказ'}
                  </button>
                )}

                {order.status === 'ON_THE_WAY' && (
                  <button
                    onClick={() => openDeliveryConfirm(order.id)}
                    disabled={actionLoading === order.id}
                    className="courier-btn courier-btn-success"
                  >
                    {actionLoading === order.id ? 'Обработка...' : '✓ Доставлено'}
                  </button>
                )}

                {order.status === 'ACCEPTED_BY_COURIER' && (
                  <div className="courier-order-label courier-text-center">
                    Ожидание выезда...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Кнопка "Везу заказы" */}
      {hasAcceptedOrders && (
        <button
          onClick={() => setShowStartDeliveryConfirm(true)}
          disabled={actionLoading === 'start-delivery'}
          className="courier-fab"
        >
          🚚 Везу заказы ({acceptedOrders.length})
        </button>
      )}

      {/* Диалог подтверждения начала доставки */}
      {showStartDeliveryConfirm && (
        <div className="courier-dialog-overlay" onClick={() => setShowStartDeliveryConfirm(false)}>
          <div className="courier-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="courier-dialog-title">Начать доставку?</h3>
            <p className="courier-dialog-text">
              Вы выезжаете с {acceptedOrders.length} заказ{acceptedOrders.length === 1 ? 'ом' : acceptedOrders.length < 5 ? 'ами' : 'ами'}.
              После подтверждения менеджер не сможет добавлять новые заказы.
            </p>
            <div className="courier-dialog-buttons">
              <button
                onClick={() => setShowStartDeliveryConfirm(false)}
                className="courier-btn courier-btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleStartDelivery}
                disabled={actionLoading === 'start-delivery'}
                className="courier-btn courier-btn-primary"
              >
                {actionLoading === 'start-delivery' ? 'Обработка...' : 'Выехать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог подтверждения доставки */}
      {deliveryConfirmOrderId && (
        <div className="courier-dialog-overlay" onClick={() => setDeliveryConfirmOrderId(null)}>
          <div className="courier-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="courier-dialog-title">Товар передан клиенту?</h3>
            <p className="courier-dialog-text">
              Подтвердите, что заказ был передан клиенту.
            </p>
            <div className="courier-dialog-buttons courier-dialog-buttons-vertical">
              <button
                onClick={() => handleDeliverOrder(deliveryConfirmOrderId)}
                disabled={actionLoading === deliveryConfirmOrderId}
                className="courier-btn courier-btn-success"
              >
                {actionLoading === deliveryConfirmOrderId ? 'Обработка...' : '✓ Да, передан'}
              </button>
              <button
                onClick={() => handleCancelOrder(deliveryConfirmOrderId)}
                disabled={actionLoading === deliveryConfirmOrderId}
                className="courier-btn courier-btn-danger"
              >
                {actionLoading === deliveryConfirmOrderId ? 'Обработка...' : '✕ Нет, не передан'}
              </button>
              <button
                onClick={() => setDeliveryConfirmOrderId(null)}
                className="courier-btn courier-btn-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
