// Auth
export interface AuthUser {
  id: string;
  login: string;
  name: string;
  phone: string;
  addressLine: string;
  settlement: string;
  settlementTitle: string;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface Settlement {
  code: string;
  title: string;
  darkstoreId: string;
}

// Catalog
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort: number;
  isActive?: boolean;
  imageUrl?: string | null;
  parentId?: string | null;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  weight?: string | null;
  barcode?: string | null;
  isActive: boolean;
  price: number; // kopeks
  oldPrice?: number | null;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  subcategoryId?: string | null;
  subcategory?: { id: string; name: string; slug: string } | null;
}

// Cart
export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  qty: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
  stock?: number;
  maxPerOrder?: number;
}

export interface Cart {
  id: string;
  token: string;
  status: 'ACTIVE' | 'CHECKED_OUT';
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartTotals {
  totalAmount: number;
}

export interface CartValidationResult {
  ok: boolean;
  issues: Array<{
    productId: string;
    title: string;
    requested: number;
    available: number;
    maxPerOrder: number;
    reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'OVER_LIMIT';
  }>;
}

// Orders
export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'ASSEMBLING'
  | 'ASSIGNED_TO_COURIER'
  | 'ACCEPTED_BY_COURIER'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  title: string;
  price: number;
  qty: number;
  amount: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  customerName: string;
  phone: string;
  addressLine: string;
  comment?: string | null;
  totalAmount: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

// Delivery settings
export interface DeliverySettings {
  deliveryFee: number;
  freeDeliveryFrom: number;
  isActive: boolean;
}
