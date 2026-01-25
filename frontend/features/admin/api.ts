import { http } from '@/shared/api/http';
import { AdminUser, DashboardStats, Order, Product, Category, Promotion } from './types';

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

  createAdmin: async (
    email: string,
    password: string,
    role: 'admin' | 'manager'
  ): Promise<AdminUser> => {
    return http.post<AdminUser>('/v1/admin-auth/create', {
      email,
      password,
      role,
    });
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
