import { ProductDto } from "../catalog/types";

export type CartStatus = "ACTIVE" | "CHECKED_OUT";

export type CartItemDto = {
  id: string;
  cartId: string;
  productId: string;
  qty: number;
  createdAt: string;
  updatedAt: string;
  product: ProductDto;
  stock?: number;
  maxPerOrder?: number;
};

export type CartDto = {
  id: string;
  token: string;
  status: CartStatus;
  items: CartItemDto[];
};

export type CartTotalsDto = {
  totalAmount: number;
};

export type CartValidationIssue = {
  productId: string;
  title: string;
  requested: number;
  available: number;
  maxPerOrder: number;
  reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'OVER_LIMIT';
};

export type CartValidationResult = {
  ok: boolean;
  issues: CartValidationIssue[];
};
