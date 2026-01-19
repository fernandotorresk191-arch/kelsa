export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "ASSEMBLING"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELED";

export type OrderItemDto = {
  id: string;
  orderId: string;
  productId: string;
  title: string;
  price: number;
  qty: number;
  amount: number;
};

export type OrderDto = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  cartId?: string | null;
  cartToken?: string | null;
  customerName: string;
  phone: string;
  addressLine: string;
  comment?: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
};

export type CreateOrderPayload = {
  cartToken: string;
  customerName: string;
  phone: string;
  addressLine: string;
  comment?: string;
};
