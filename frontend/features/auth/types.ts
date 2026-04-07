import type { OrderStatus } from "../orders/types";

export type SettlementCode = string;

export type SettlementDto = {
  code: string;
  title: string;
  darkstoreId: string;
};

export type AuthUser = {
  id: string;
  login: string;
  name: string;
  phone: string;
  addressLine: string;
  settlement: string;
  settlementTitle: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type RegisterPayload = {
  login: string;
  password: string;
  settlement: string;
  email: string;
  phone: string;
  name: string;
  addressLine: string;
};

export type LoginPayload = {
  login: string;
  password: string;
};

export type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  addressLine?: string;
  settlement?: string;
};

export type CheckPhoneResponse = {
  exists: boolean;
};

export type LoginByPhonePayload = {
  phone: string;
  password: string;
};

export type RegisterByPhonePayload = {
  phone: string;
  password: string;
  name: string;
  addressLine: string;
  settlement: string;
};

export type UserOrderItem = {
  title: string;
  qty: number;
  price: number;
  amount: number;
};

export type UserOrder = {
  orderNumber: number;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  addressLine?: string | null;
  createdAt: string;
  updatedAt: string;
  items: UserOrderItem[];
};
