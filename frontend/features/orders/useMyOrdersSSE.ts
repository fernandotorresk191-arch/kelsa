'use client';

import { useEffect, useRef, useCallback } from 'react';
import { API_URL } from '@/shared/api/config';
import { getStoredAccessToken } from '@/shared/auth/token';

export interface OrderStatusEvent {
  type: 'ORDER_UPDATED';
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    phone: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  ASSEMBLING: 'Собирается',
  ON_THE_WAY: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменён',
};

interface UseMyOrdersSSEOptions {
  onOrderUpdated?: (order: OrderStatusEvent['order']) => void;
  enabled?: boolean;
}

export function useMyOrdersSSE({
  onOrderUpdated,
  enabled = true,
}: UseMyOrdersSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = getStoredAccessToken();
    if (!token || !enabled) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // SSE doesn't support custom headers, so we pass token as query param
    const url = `${API_URL}/v1/events/my-orders?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE] Connected to my-orders stream');
    };

    eventSource.addEventListener('order', (event) => {
      try {
        const data = JSON.parse(event.data) as OrderStatusEvent;
        
        if (data.type === 'ORDER_UPDATED' && onOrderUpdated) {
          onOrderUpdated(data.order);
          
          // Показываем браузерное уведомление если разрешено
          showNotification(data.order);
        }
      } catch (error) {
        console.error('[SSE] Failed to parse event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received, connection is alive
    });

    eventSource.onerror = () => {
      console.log('[SSE] Connection error, reconnecting in 5s...');
      eventSource.close();
      
      // Reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [enabled, onOrderUpdated]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return { reconnect: connect };
}

// Браузерные Push-уведомления
function showNotification(order: OrderStatusEvent['order']) {
  if (typeof window === 'undefined') return;
  
  // Проверяем поддержку и разрешение
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const statusLabel = STATUS_LABELS[order.status] || order.status;
    new Notification(`Заказ #${order.orderNumber}`, {
      body: `Статус изменён: ${statusLabel}`,
      icon: '/icons/icon-192x192.png',
      tag: `order-${order.id}`,
    });
  }
}

// Запрос разрешения на уведомления
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied' as NotificationPermission);
  }
  
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  
  return Promise.resolve(Notification.permission);
}
