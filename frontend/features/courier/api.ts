import { http } from '@/shared/api/http';
import { Courier, CourierOrder } from './types';

interface LoginResponse {
  accessToken: string;
  courier: Courier;
}

interface OrdersResponse {
  data: CourierOrder[];
}

interface StatusResponse {
  status: string;
  activeOrdersCount: number;
}

interface ActionResponse {
  success: boolean;
  order?: CourierOrder;
  message?: string;
  count?: number;
}

// API авторизации курьера
export const courierAuthApi = {
  login: async (login: string, password: string): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/v1/courier-auth/login', { login, password });
  },

  getProfile: async (): Promise<Courier> => {
    return http.get<Courier>('/v1/courier-auth/me');
  },
};

// API заказов курьера
export const courierOrdersApi = {
  // Получить активные заказы
  getOrders: async (): Promise<OrdersResponse> => {
    return http.get<OrdersResponse>('/v1/courier/orders');
  },

  // Получить историю заказов
  getHistory: async (): Promise<OrdersResponse> => {
    return http.get<OrdersResponse>('/v1/courier/orders/history');
  },

  // Получить текущий статус курьера
  getStatus: async (): Promise<StatusResponse> => {
    return http.get<StatusResponse>('/v1/courier/orders/status');
  },

  // Принять заказ
  acceptOrder: async (orderId: string): Promise<ActionResponse> => {
    return http.patch<ActionResponse>(`/v1/courier/orders/${orderId}/accept`);
  },

  // Начать доставку (выехать)
  startDelivery: async (): Promise<ActionResponse> => {
    return http.patch<ActionResponse>('/v1/courier/orders/start-delivery');
  },

  // Доставить заказ
  deliverOrder: async (orderId: string): Promise<ActionResponse> => {
    return http.patch<ActionResponse>(`/v1/courier/orders/${orderId}/deliver`);
  },

  // Отменить заказ
  cancelOrder: async (orderId: string, reason?: string): Promise<ActionResponse> => {
    return http.patch<ActionResponse>(`/v1/courier/orders/${orderId}/cancel`, { reason });
  },
};
