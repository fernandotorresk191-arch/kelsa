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
  [OrderStatus.NEW]: 'admin-status-new',
  [OrderStatus.CONFIRMED]: 'admin-status-confirmed',
  [OrderStatus.ASSEMBLING]: 'admin-status-assembling',
  [OrderStatus.ON_THE_WAY]: 'admin-status-delivering',
  [OrderStatus.DELIVERED]: 'admin-status-completed',
  [OrderStatus.CANCELED]: 'admin-status-cancelled',
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
    changedBy?: string;
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
  purchasePrice?: number;
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

// ==================== ЗАКУПКИ И ПАРТИИ ====================

export type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'SOLD_OUT' | 'WRITTEN_OFF';

export type Batch = {
  id: string;
  batchCode: string;
  productId: string;
  purchaseId: string;
  quantity: number;
  remainingQty: number;
  purchasePrice: number;
  cellNumber: string;
  expiryDate?: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    title: string;
    imageUrl?: string;
    cellNumber?: string;
    price?: number;
    category?: {
      id: string;
      name: string;
    };
  };
  purchase?: {
    id: string;
    purchaseNumber: number;
    createdAt: string;
  };
};

export type Purchase = {
  id: string;
  purchaseNumber: number;
  supplierName?: string;
  notes?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  batches: Batch[];
};

export type WriteOff = {
  id: string;
  batchId: string;
  quantity: number;
  reason: string;
  createdAt: string;
  batch: Batch;
};

export type ExpiryStats = {
  totalWriteOffs: number;
  totalQuantity: number;
  totalValue: number;
  byProduct: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    value: number;
  }>;
  expiringBatches: number;
  expiredBatches: number;
};

// ==================== КУРЬЕРЫ ====================

export type Courier = {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  carBrand?: string;
  carNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
