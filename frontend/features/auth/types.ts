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

export type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  addressLine?: string;
  settlement?: string;
};

export type SendSmsCodeResponse = {
  sent: boolean;
  isNewUser: boolean;
  userName: string | null;
};

export type VerifySmsCodePayload = {
  phone: string;
  code: string;
  name?: string;
  addressLine?: string;
  settlement?: string;
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
