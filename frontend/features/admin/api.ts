import { http } from '@/shared/api/http';
import { AdminUser, DashboardStats, Order, Product, Category, Promotion, Purchase, Batch, WriteOff, ExpiryStats, Courier, CourierProfile, DeliveryZone } from './types';

interface LoginResponse {
  accessToken: string;
  admin: AdminUser;
}

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CategoriesResponse {
  data: (Category & { _count: { products: number; subcategories: number } })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RevenueResponse {
  data: Array<{
    date: string;
    revenue: number;
    profit: number;
    purchaseCost: number;
    courierCost: number;
  }>;
}

interface SalesResponse {
  data: Array<{
    productId: string;
    title: string;
    totalSold: number;
    totalRevenue: number;
    ordersCount: number;
  }>;
}

export const adminAuthApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/v1/admin-auth/login', { email, password });
  },

  getProfile: async (): Promise<AdminUser> => {
    return http.get<AdminUser>('/v1/admin-auth/me');
  },

  // === Управление пользователями ===

  listUsers: async (): Promise<AdminUser[]> => {
    return http.get<AdminUser[]>('/v1/admin-auth/users');
  },

  createUser: async (data: {
    email: string;
    password: string;
    role: 'admin' | 'manager';
    name?: string;
    phone?: string;
    permissions?: string[];
  }): Promise<AdminUser> => {
    return http.post<AdminUser>('/v1/admin-auth/create', data);
  },

  updateUser: async (id: string, data: {
    email?: string;
    password?: string;
    role?: 'admin' | 'manager';
    name?: string;
    phone?: string;
    permissions?: string[];
    isActive?: boolean;
  }): Promise<AdminUser> => {
    return http.patch<AdminUser>(`/v1/admin-auth/users/${id}`, data);
  },

  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin-auth/users/${id}`);
  },
};

export const adminOrdersApi = {
  getOrders: async (
    page = 1,
    limit = 20,
    status?: string
  ): Promise<OrdersResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    return http.get<OrdersResponse>(
      `/v1/admin/orders?${params.toString()}`
    );
  },

  getOrder: async (id: string): Promise<Order> => {
    return http.get<Order>(`/v1/admin/orders/${id}`);
  },

  updateOrderStatus: async (
    id: string,
    status: string,
    comment?: string
  ): Promise<Order> => {
    return http.patch<Order>(`/v1/admin/orders/${id}/status`, {
      status,
      comment,
    });
  },

  getInvoice: async (id: string): Promise<{ html: string; fileName: string }> => {
    return http.get<{ html: string; fileName: string }>(
      `/v1/admin/orders/${id}/print/invoice`
    );
  },

  getPickingList: async (id: string): Promise<{ html: string; fileName: string }> => {
    return http.get<{ html: string; fileName: string }>(
      `/v1/admin/orders/${id}/print/picking`
    );
  },

  // Назначить курьера на заказ
  assignCourier: async (orderId: string, courierId: string): Promise<{ success: boolean }> => {
    return http.patch<{ success: boolean }>(`/v1/admin/orders/${orderId}/assign-courier`, {
      courierId,
    });
  },

  // Получить список доступных курьеров
  getAvailableCouriers: async (): Promise<{
    data: Array<{
      id: string;
      fullName: string;
      phone: string;
      carBrand?: string;
      carNumber?: string;
      status: string;
      activeOrdersCount: number;
    }>;
  }> => {
    return http.get('/v1/admin/orders/available-couriers');
  },
};

// ==================== Chat API ====================

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'MANAGER' | 'CLIENT';
  text?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isRead: boolean;
  createdAt: string;
}

export const adminChatApi = {
  getMessages: async (orderId: string): Promise<{ orderNumber: number; messages: ChatMessage[] }> => {
    return http.get(`/v1/admin/orders/${orderId}/chat`);
  },

  sendText: async (orderId: string, text: string): Promise<ChatMessage> => {
    return http.post(`/v1/admin/orders/${orderId}/chat`, { text });
  },

  sendImage: async (orderId: string, file: File): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload(`/v1/admin/orders/${orderId}/chat/image`, formData);
  },

  markRead: async (orderId: string): Promise<{ ok: boolean }> => {
    return http.patch(`/v1/admin/orders/${orderId}/chat/read`);
  },

  getUnreadCounts: async (): Promise<Record<string, number>> => {
    return http.get('/v1/admin/orders/unread-counts');
  },

  setOrderGeolocation: async (orderId: string, latitude: number, longitude: number): Promise<{ ok: boolean }> => {
    return http.patch(`/v1/admin/orders/${orderId}/geolocation`, { latitude, longitude });
  },
};

export const adminProductsApi = {
  getProducts: async (
    page = 1,
    limit = 20,
    categoryId?: string,
    search?: string
  ): Promise<ProductsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);
    return http.get<ProductsResponse>(
      `/v1/admin/products?${params.toString()}`
    );
  },

  getProduct: async (id: string): Promise<Product> => {
    return http.get<Product>(`/v1/admin/products/${id}`);
  },

  createProduct: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    return http.post<Product>('/v1/admin/products', product);
  },

  updateProduct: async (
    id: string,
    product: Partial<Product>
  ): Promise<Product> => {
    return http.put<Product>(`/v1/admin/products/${id}`, product);
  },

  deleteProduct: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin/products/${id}`);
  },

  updateStock: async (
    id: string,
    quantity: number
  ): Promise<{ success: boolean; stock: number }> => {
    return http.patch<{ success: boolean; stock: number }>(
      `/v1/admin/products/${id}/stock`,
      { quantity }
    );
  },

  checkSlug: async (
    slug: string,
    excludeId?: string
  ): Promise<{ available: boolean; existingId: string | null }> => {
    const params = excludeId ? `?excludeId=${excludeId}` : '';
    return http.get<{ available: boolean; existingId: string | null }>(
      `/v1/admin/products/check-slug/${encodeURIComponent(slug)}${params}`
    );
  },
};

export const adminAnalyticsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    return http.get<DashboardStats>('/v1/admin/analytics/dashboard');
  },

  getOrdersStats: async (
    startDate?: string,
    endDate?: string
  ): Promise<{ period: { start: string; end: string }; totalOrders: number; totalRevenue: number; byDate: Record<string, any> }> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return http.get<{
      period: { start: string; end: string };
      totalOrders: number;
      totalRevenue: number;
      byDate: Record<string, any>;
    }>(`/v1/admin/analytics/orders-stats?${params.toString()}`);
  },

  getProductsSales: async (limit = 20): Promise<SalesResponse> => {
    return http.get<SalesResponse>(
      `/v1/admin/analytics/products-sales?limit=${limit}`
    );
  },

  getRevenueAnalytics: async (
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<RevenueResponse> => {
    return http.get<RevenueResponse>(
      `/v1/admin/analytics/revenue-analytics?period=${period}`
    );
  },
};

export const adminCategoriesApi = {
  getCategories: async (
    page = 1,
    limit = 50
  ): Promise<CategoriesResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return http.get<CategoriesResponse>(
      `/v1/admin/categories?${params.toString()}`
    );
  },

  getCategory: async (id: string): Promise<Category & { _count: { products: number } }> => {
    return http.get<Category & { _count: { products: number } }>(`/v1/admin/categories/${id}`);
  },

  createCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
    return http.post<Category>('/v1/admin/categories', category);
  },

  updateCategory: async (
    id: string,
    category: Partial<Category>
  ): Promise<Category> => {
    return http.put<Category>(`/v1/admin/categories/${id}`, category);
  },

  checkSlug: async (
    slug: string,
    excludeId?: string
  ): Promise<{ available: boolean; existingId: string | null }> => {
    const params = excludeId ? `?excludeId=${excludeId}` : '';
    return http.get<{ available: boolean; existingId: string | null }>(
      `/v1/admin/categories/check-slug/${encodeURIComponent(slug)}${params}`
    );
  },

  deleteCategory: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin/categories/${id}`);
  },
};

// API для загрузки изображений
export const adminUploadApi = {
  uploadProductImage: async (productId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return http.upload<{ imageUrl: string }>(`/v1/upload/product/${productId}`, formData);
  },

  uploadCategoryImage: async (categoryId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return http.upload<{ imageUrl: string }>(`/v1/upload/category/${categoryId}`, formData);
  },

  uploadPromotionImage: async (promotionId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return http.upload<{ imageUrl: string }>(`/v1/upload/promotion/${promotionId}`, formData);
  },

  deleteProductImage: async (productId: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/upload/product/${productId}`);
  },

  deleteCategoryImage: async (categoryId: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/upload/category/${categoryId}`);
  },

  deletePromotionImage: async (promotionId: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/upload/promotion/${promotionId}`);
  },
};

export const adminPromotionsApi = {
  getPromotions: async (
    page = 1,
    limit = 20
  ): Promise<{
    data: Promotion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return http.get<{
      data: Promotion[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/v1/admin/promotions?${params.toString()}`);
  },

  getPromotion: async (id: string): Promise<Promotion> => {
    return http.get<Promotion>(`/v1/admin/promotions/${id}`);
  },

  createPromotion: async (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Promotion> => {
    return http.post<Promotion>('/v1/admin/promotions', promotion);
  },

  updatePromotion: async (
    id: string,
    promotion: Partial<Promotion>
  ): Promise<Promotion> => {
    return http.put<Promotion>(`/v1/admin/promotions/${id}`, promotion);
  },

  deletePromotion: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin/promotions/${id}`);
  },
};

// ==================== ЗАКУПКИ ====================

interface PurchasesResponse {
  data: Purchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface BatchItemInput {
  productId: string;
  quantity: number;
  purchasePrice: number;
  cellNumber: string;
  expiryDate?: string;
  markupPercent?: number;
}

interface CreatePurchaseInput {
  supplierName?: string;
  notes?: string;
  items: BatchItemInput[];
}

export const adminPurchasesApi = {
  // Получить список закупок
  getPurchases: async (page = 1, limit = 20): Promise<PurchasesResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return http.get<PurchasesResponse>(`/admin/purchases?${params.toString()}`);
  },

  // Получить закупку по ID
  getPurchase: async (id: string): Promise<Purchase> => {
    return http.get<Purchase>(`/admin/purchases/${id}`);
  },

  // Создать новую закупку
  createPurchase: async (data: CreatePurchaseInput): Promise<Purchase> => {
    return http.post<Purchase>('/admin/purchases', data);
  },

  // Получить партии товара
  getProductBatches: async (productId: string, status?: string): Promise<Batch[]> => {
    const params = status ? `?status=${status}` : '';
    return http.get<Batch[]>(`/admin/purchases/product/${productId}/batches${params}`);
  },

  // Получить партию по ID
  getBatch: async (batchId: string): Promise<Batch> => {
    return http.get<Batch>(`/admin/purchases/batch/${batchId}`);
  },

  // Получить партию по коду
  getBatchByCode: async (code: string): Promise<Batch> => {
    return http.get<Batch>(`/admin/purchases/batch/code/${encodeURIComponent(code)}`);
  },

  // FIFO - получить партии для продажи
  getNextBatchForSale: async (productId: string, qty = 1): Promise<{
    batches: Array<{
      batchId: string;
      batchCode: string;
      cellNumber: string;
      qtyFromBatch: number;
      expiryDate: string | null;
    }>;
    totalAvailable: number;
    canFulfill: boolean;
  }> => {
    return http.get(`/admin/purchases/product/${productId}/fifo?qty=${qty}`);
  },

  // Удалить закупку
  deletePurchase: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/admin/purchases/${id}`);
  },
};

// ==================== ПРОСРОЧКА И СПИСАНИЯ ====================

interface ExpiringBatchesResponse {
  data: Batch[];
  total: number;
  daysThreshold: number;
}

interface WriteOffsResponse {
  data: WriteOff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const adminExpiryApi = {
  // Получить партии с истекающим сроком годности
  getExpiringBatches: async (days = 7): Promise<ExpiringBatchesResponse> => {
    return http.get<ExpiringBatchesResponse>(`/admin/expiry/expiring?days=${days}`);
  },

  // Получить просроченные партии
  getExpiredBatches: async (): Promise<{ data: Batch[]; total: number }> => {
    return http.get<{ data: Batch[]; total: number }>('/admin/expiry/expired');
  },

  // Списать товар
  writeOff: async (batchId: string, quantity: number, reason?: string): Promise<{ success: boolean; message: string }> => {
    return http.post<{ success: boolean; message: string }>('/admin/expiry/write-off', {
      batchId,
      quantity,
      reason,
    });
  },

  // Списать всю партию
  writeOffBatch: async (batchId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    return http.post<{ success: boolean; message: string }>(`/admin/expiry/write-off-batch/${batchId}`, {
      reason,
    });
  },

  // Получить историю списаний
  getWriteOffs: async (page = 1, limit = 50, from?: string, to?: string): Promise<WriteOffsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return http.get<WriteOffsResponse>(`/admin/expiry/write-offs?${params.toString()}`);
  },

  // Статистика списаний
  getStats: async (from?: string, to?: string): Promise<ExpiryStats> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return http.get<ExpiryStats>(`/admin/expiry/stats?${params.toString()}`);
  },

  // Установить скидку на партию
  setDiscount: async (batchId: string, discountPercent: number): Promise<{ success: boolean; message: string; discountPercent: number }> => {
    return http.patch<{ success: boolean; message: string; discountPercent: number }>(
      `/admin/expiry/batch/${batchId}/discount`,
      { discountPercent },
    );
  },
};

// ==================== КУРЬЕРЫ ====================

interface CouriersResponse {
  data: Courier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateCourierInput {
  fullName: string;
  login: string;
  password: string;
  phone: string;
  carBrand?: string;
  carNumber?: string;
  isActive?: boolean;
}

interface UpdateCourierInput {
  fullName?: string;
  login?: string;
  password?: string;
  phone?: string;
  carBrand?: string;
  carNumber?: string;
  isActive?: boolean;
}

export const adminCouriersApi = {
  // Получить список курьеров
  getCouriers: async (page = 1, limit = 20, search?: string): Promise<CouriersResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    return http.get<CouriersResponse>(`/v1/admin/couriers?${params.toString()}`);
  },

  // Получить курьера по ID
  getCourier: async (id: string): Promise<Courier> => {
    return http.get<Courier>(`/v1/admin/couriers/${id}`);
  },

  // Создать курьера
  createCourier: async (data: CreateCourierInput): Promise<Courier> => {
    return http.post<Courier>('/v1/admin/couriers', data);
  },

  // Обновить курьера
  updateCourier: async (id: string, data: UpdateCourierInput): Promise<Courier> => {
    return http.put<Courier>(`/v1/admin/couriers/${id}`, data);
  },

  // Удалить курьера
  deleteCourier: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin/couriers/${id}`);
  },

  // Проверить доступность логина
  checkLogin: async (login: string, excludeId?: string): Promise<{ available: boolean; existingId: string | null }> => {
    const params = excludeId ? `?excludeId=${excludeId}` : '';
    return http.get<{ available: boolean; existingId: string | null }>(
      `/v1/admin/couriers/check-login/${encodeURIComponent(login)}${params}`
    );
  },

  // Получить профиль курьера со статистикой
  getCourierProfile: async (id: string): Promise<CourierProfile> => {
    return http.get<CourierProfile>(`/v1/admin/couriers/${id}/profile`);
  },
};

// ==================== ЗОНЫ ДОСТАВКИ ====================

export const adminDeliveryZonesApi = {
  // Получить все зоны
  getZones: async (): Promise<DeliveryZone[]> => {
    const res = await http.get<{ data: DeliveryZone[] }>('/v1/admin/delivery-zones');
    return res.data;
  },

  // Создать зону
  createZone: async (data: { settlement: string; settlementTitle: string; deliveryFee: number; freeDeliveryFrom: number }): Promise<DeliveryZone> => {
    return http.post<DeliveryZone>('/v1/admin/delivery-zones', data);
  },

  // Обновить зону
  updateZone: async (id: string, data: Partial<{ deliveryFee: number; freeDeliveryFrom: number; isActive: boolean }>): Promise<DeliveryZone> => {
    return http.put<DeliveryZone>(`/v1/admin/delivery-zones/${id}`, data);
  },

  // Удалить зону
  deleteZone: async (id: string): Promise<{ success: boolean }> => {
    return http.delete<{ success: boolean }>(`/v1/admin/delivery-zones/${id}`);
  },
};

// ==================== СЕРВЕР ====================

export interface CronJobLog {
  name: string;
  description: string;
  schedule: string;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | 'never';
  lastMessage: string | null;
  lastDuration: number | null;
}

export interface UploadDirStats {
  name: string;
  files: number;
  sizeBytes: number;
}

export interface ServerInfo {
  disk: { total: number; used: number; available: number; usagePercent: number } | null;
  uploads: UploadDirStats[];
  cronJobs: CronJobLog[];
  process: {
    uptime: number;
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number };
    nodeVersion: string;
    platform: string;
  };
}

export const adminServerApi = {
  getInfo: async (): Promise<ServerInfo> => {
    return http.get<ServerInfo>('/v1/admin/server/info');
  },
};
