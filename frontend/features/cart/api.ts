import { apiDelete, apiGet, apiPatch, apiPost } from "shared/api/http";
import type { CartDto, CartTotalsDto, CartValidationResult } from "./types";
import { getStoredSettlement } from "shared/settlement/storage";

export type AddCartItemPayload = {
  cartToken: string;
  productId: string;
  qty: number;
};

export type UpdateCartItemPayload = {
  cartToken: string;
  qty: number;
};

function getSettlementQs(): string {
  const s = getStoredSettlement();
  return s?.code ? `?settlement=${encodeURIComponent(s.code)}` : '';
}

export const cartApi = {
  get: (token: string) => apiGet<CartDto>(`/v1/cart/${token}${getSettlementQs()}`),
  totals: (token: string) => apiGet<CartTotalsDto>(`/v1/cart/${token}/totals${getSettlementQs()}`),

  validate: (token: string) =>
    apiPost<CartValidationResult>(`/v1/cart/${token}/validate${getSettlementQs()}`),

  addItem: (payload: AddCartItemPayload) =>
    apiPost<CartDto, AddCartItemPayload>(`/v1/cart/items${getSettlementQs()}`, payload),

  updateItem: (itemId: string, payload: UpdateCartItemPayload) =>
    apiPatch<CartDto, UpdateCartItemPayload>(
      `/v1/cart/items/${itemId}${getSettlementQs()}`,
      payload
    ),

  removeItem: (itemId: string, cartToken: string) =>
    apiDelete<CartDto>(`/v1/cart/items/${itemId}/${cartToken}${getSettlementQs()}`),
};
