import { apiGet, apiPost } from "shared/api/http";
import type { CreateOrderPayload, OrderDto } from "./types";

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    apiPost<OrderDto, CreateOrderPayload>("/v1/orders", payload),
  get: (orderNumber: number | string) =>
    apiGet<OrderDto>(`/v1/orders/${orderNumber}`),
};
