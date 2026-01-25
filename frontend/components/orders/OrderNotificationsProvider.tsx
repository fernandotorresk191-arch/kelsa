'use client';

import { createContext, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../ui/toast';
import { useMyOrdersSSE, OrderStatusEvent, requestNotificationPermission } from '@/features/orders/useMyOrdersSSE';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  ASSEMBLING: 'Собирается',
  ON_THE_WAY: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменён',
};

const STATUS_TYPES: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  NEW: 'info',
  CONFIRMED: 'success',
  ASSEMBLING: 'info',
  ON_THE_WAY: 'info',
  DELIVERED: 'success',
  CANCELED: 'error',
};

interface OrderNotificationsContextType {
  isConnected: boolean;
  requestPermission: () => Promise<void>;
}

const OrderNotificationsContext = createContext<OrderNotificationsContextType>({
  isConnected: false,
  requestPermission: async () => {},
});

export function useOrderNotifications() {
  return useContext(OrderNotificationsContext);
}

interface OrderNotificationsProviderProps {
  children: ReactNode;
}

export function OrderNotificationsProvider({ children }: OrderNotificationsProviderProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  const handleOrderUpdated = useCallback((order: OrderStatusEvent['order']) => {
    const statusLabel = STATUS_LABELS[order.status] || order.status;
    const toastType = STATUS_TYPES[order.status] || 'info';

    addToast({
      title: `Заказ #${order.orderNumber}`,
      description: `Статус изменён: ${statusLabel}`,
      type: toastType,
      duration: 6000,
    });
  }, [addToast]);

  // SSE подключение только для авторизованных пользователей
  useMyOrdersSSE({
    onOrderUpdated: handleOrderUpdated,
    enabled: !!user,
  });

  // Запрашиваем разрешение на уведомления при монтировании
  useEffect(() => {
    if (user) {
      setIsConnected(true);
      // Запрашиваем разрешение на Push-уведомления
      requestNotificationPermission();
    } else {
      setIsConnected(false);
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    await requestNotificationPermission();
  }, []);

  return (
    <OrderNotificationsContext.Provider value={{ isConnected, requestPermission }}>
      {children}
    </OrderNotificationsContext.Provider>
  );
}
