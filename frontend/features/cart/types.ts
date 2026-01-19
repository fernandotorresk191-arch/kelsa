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
