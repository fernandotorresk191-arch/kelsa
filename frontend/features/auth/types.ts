import type { OrderStatus } from "../orders/types";

export type SettlementCode =
  | "KALINOVSKAYA"
  | "NOVOTERSKAYA"
  | "LEVOBEREZHNOE"
  | "YUBILEYNOE"
  | "NOVOE_SOLKUSHINO";

export type SettlementDto = {
  code: SettlementCode;
  title: string;
};

export type AuthUser = {
  id: string;
  login: string;
  settlement: SettlementCode;
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
  settlement: SettlementCode;
  email: string;
  phone: string;
  addressLine: string;
};

export type LoginPayload = {
  login: string;
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
  createdAt: string;
  updatedAt: string;
  items: UserOrderItem[];
};
