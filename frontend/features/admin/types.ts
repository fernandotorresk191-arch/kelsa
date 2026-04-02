export type Darkstore = {
  id: string;
  name: string;
  shortName?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager';
  name?: string | null;
  phone?: string | null;
  permissions?: string[] | null;
  isActive?: boolean;
  createdAt?: string;
  darkstores?: Darkstore[];
};

export enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  ASSEMBLING = 'ASSEMBLING',
  ASSIGNED_TO_COURIER = 'ASSIGNED_TO_COURIER',
  ACCEPTED_BY_COURIER = 'ACCEPTED_BY_COURIER',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'Новый',
  [OrderStatus.CONFIRMED]: 'Подтвержден',
  [OrderStatus.ASSEMBLING]: 'Собирается',
  [OrderStatus.ASSIGNED_TO_COURIER]: 'Передан курьеру',
  [OrderStatus.ACCEPTED_BY_COURIER]: 'Курьер принял',
  [OrderStatus.ON_THE_WAY]: 'В пути',
  [OrderStatus.DELIVERED]: 'Доставлен',
  [OrderStatus.CANCELED]: 'Отменен',
};

export const OrderStatusColors: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'admin-status-new',
  [OrderStatus.CONFIRMED]: 'admin-status-confirmed',
  [OrderStatus.ASSEMBLING]: 'admin-status-assembling',
  [OrderStatus.ASSIGNED_TO_COURIER]: 'admin-status-assigned',
  [OrderStatus.ACCEPTED_BY_COURIER]: 'admin-status-accepted',
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

export type DeliveryZone = {
  id: string;
  settlement: string;
  settlementTitle: string;
  deliveryFee: number;
  freeDeliveryFrom: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  deliveryFee: number;
  purchaseCost?: number;
  courierCost?: number;
  profit?: number;
  settlement?: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
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
  weight?: string;
  barcode?: string;
  isActive: boolean;
  price: number;
  oldPrice?: number;
  purchasePrice?: number;
  stock: number;
  categoryId?: string;
  subcategoryId?: string;
  cellNumber?: string;
  maxPerOrder?: number;
  darkstoreProductId?: string;
  isActiveInDarkstore?: boolean;
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
  description?: string;
  sort: number;
  isActive: boolean;
  imageUrl?: string;
  parentId?: string;
  markupPercent: number;
  darkstoreActive?: boolean | null;
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
    totalPurchaseCost: number;
    totalCourierCost: number;
    totalProfit: number;
    totalProfitToday: number;
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
  markupPercent: number;
  sellingPrice: number;
  discountPercent: number;
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
  status?: string;
  createdAt: string;
  updatedAt: string;
};

export type CourierProfileStats = {
  totalDeliveries: number;
  deliveriesToday: number;
  deliveriesThisWeek: number;
  deliveriesThisMonth: number;
  earningsToday: number;
  earningsThisWeek: number;
  earningsThisMonth: number;
  totalEarnings: number;
  activeOrdersCount: number;
};

export type CourierDelivery = {
  id: string;
  orderNumber: number;
  customerName: string;
  addressLine: string;
  phone: string;
  totalAmount: number;
  courierCost?: number;
  createdAt: string;
  updatedAt: string;
  status?: string;
};

export type CourierProfile = {
  courier: Courier;
  stats: CourierProfileStats;
  activeOrders: CourierDelivery[];
  recentDeliveries: CourierDelivery[];
};

// ==================== КЛИЕНТЫ ====================

export type ClientListItem = {
  id: string;
  login: string;
  name: string;
  phone: string;
  email: string;
  settlement: string;
  createdAt: string;
  totalOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type ClientDetail = {
  user: {
    id: string;
    login: string;
    name: string;
    phone: string;
    email: string;
    settlement: string;
    addressLine: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalOrders: number;
    deliveredOrders: number;
    canceledOrders: number;
    totalSpent: number;
    totalDeliveryFee: number;
    avgOrderValue: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    daysSinceLastOrder: number | null;
    daysSinceRegistration: number | null;
    statusBreakdown: Array<{ status: string; count: number }>;
  };
  topProducts: Array<{
    productId: string;
    title: string;
    totalQty: number;
    totalAmount: number;
    ordersCount: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalAmount: number;
    deliveryFee: number;
    settlement: string;
    createdAt: string;
    canceledBy: string | null;
    darkstore: { name: string; shortName?: string | null } | null;
    items: Array<{ title: string; qty: number; price: number }>;
  }>;
};

