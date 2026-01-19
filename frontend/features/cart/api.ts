import { apiDelete, apiGet, apiPatch, apiPost } from "shared/api/http";
import type { CartDto, CartTotalsDto } from "./types";

export type AddCartItemPayload = {
  cartToken: string;
  productId: string;
  qty: number;
};

export type UpdateCartItemPayload = {
  cartToken: string;
  qty: number;
};

export const cartApi = {
  get: (token: string) => apiGet<CartDto>(`/v1/cart/${token}`),
  totals: (token: string) => apiGet<CartTotalsDto>(`/v1/cart/${token}/totals`),

  addItem: (payload: AddCartItemPayload) =>
    apiPost<CartDto, AddCartItemPayload>("/v1/cart/items", payload),

  updateItem: (itemId: string, payload: UpdateCartItemPayload) =>
    apiPatch<CartDto, UpdateCartItemPayload>(
      `/v1/cart/items/${itemId}`,
      payload
    ),

  removeItem: (itemId: string, cartToken: string) =>
    apiDelete<CartDto>(`/v1/cart/items/${itemId}/${cartToken}`),
};
