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
  email?: string;
  emailRaw?: string;
};

export type CheckEmailResponse = {
  exists: boolean;
};

export type SendEmailCodeResponse = {
  sent: boolean;
};

export type VerifyEmailCodeResponse = {
  valid: boolean;
};

export type LoginByPhonePayload = {
  phone: string;
  password: string;
  email?: string;
  verifiedEmail?: string;
};

export type RegisterByPhonePayload = {
  phone: string;
  password: string;
  name: string;
  addressLine: string;
  settlement: string;
  email?: string;
};

export type RequestPasswordResetResponse = {
  message: string;
  email: string;
};

export type ConfirmPasswordResetPayload = {
  token: string;
  password: string;
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
