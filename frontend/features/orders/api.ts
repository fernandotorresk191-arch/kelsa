import { apiGet, apiPost, apiPatch, apiUpload } from "shared/api/http";
import type { CreateOrderPayload, OrderDto } from "./types";

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'MANAGER' | 'CLIENT';
  text?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isRead: boolean;
  createdAt: string;
}

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    apiPost<OrderDto, CreateOrderPayload>("/v1/orders", payload),
  get: (orderNumber: number | string) =>
    apiGet<OrderDto>(`/v1/orders/${orderNumber}`),
};

export const chatApi = {
  getMessages: (orderNumber: number) =>
    apiGet<{ orderNumber: number; messages: ChatMessage[] }>(`/v1/orders/${orderNumber}/chat`),

  sendText: (orderNumber: number, text: string, latitude?: number, longitude?: number) =>
    apiPost<ChatMessage>(`/v1/orders/${orderNumber}/chat`, { text, latitude, longitude }),

  sendImage: (orderNumber: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<ChatMessage>(`/v1/orders/${orderNumber}/chat/image`, formData);
  },

  markRead: (orderNumber: number) =>
    apiPatch<{ ok: boolean }>(`/v1/orders/${orderNumber}/chat/read`),
};

export const pushApi = {
  getVapidKey: () => apiGet<{ key: string }>('/v1/push/vapid-key'),
  subscribe: (subscription: PushSubscription) =>
    apiPost('/v1/push/subscribe', { subscription: subscription.toJSON() }),
};
