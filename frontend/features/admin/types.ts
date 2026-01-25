export type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'manager';
};

export enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  ASSEMBLING = 'ASSEMBLING',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'Новый',
  [OrderStatus.CONFIRMED]: 'Подтвержден',
  [OrderStatus.ASSEMBLING]: 'Собирается',
  [OrderStatus.ON_THE_WAY]: 'В пути',
  [OrderStatus.DELIVERED]: 'Доставлен',
  [OrderStatus.CANCELED]: 'Отменен',
};

export const OrderStatusColors: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'bg-blue-100 text-blue-800',
  [OrderStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [OrderStatus.ASSEMBLING]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.ON_THE_WAY]: 'bg-purple-100 text-purple-800',
  [OrderStatus.DELIVERED]: 'bg-green-200 text-green-900',
  [OrderStatus.CANCELED]: 'bg-red-100 text-red-800',
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  title: string;
  price: number;
  qty: number;
  amount: number;
  product: {
    id: string;
    title: string;
  };
};

export type Order = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  userId: string;
  customerName: string;
  phone: string;
  addressLine: string;
  comment?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  user: {
    id: string;
    login: string;
    name: string;
    phone: string;
  };
  statusHistory: {
    id: string;
    orderId: string;
    status: OrderStatus;
    comment?: string;
    createdAt: string;
  }[];
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  weightGr?: number;
  isActive: boolean;
  price: number;
  oldPrice?: number;
  stock: number;
  categoryId?: string;
  subcategoryId?: string;
  cellNumber?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort: number;
  isActive: boolean;
  imageUrl?: string;
  parentId?: string;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategories?: Category[];
};

export type DashboardStats = {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalRevenueToday: number;
    averageOrderValue: number;
  };
  ordersByStatus: Array<{
    status: OrderStatus;
    _count: number;
  }>;
  recentOrders: Array<{
    amount: number;
    date: string;
  }>;
  topProducts: Array<{
    productId: string;
    title: string;
    _sum: {
      qty: number;
      amount: number;
    };
  }>;
};

export type Promotion = {
  id: string;
  title: string;
  imageUrl: string;
  url?: string | null;
  sort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
