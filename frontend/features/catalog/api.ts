
import { apiGet } from "shared/api/http";
import type { CategoryDto, ProductDto, PromotionDto } from "./types";

export const catalogApi = {
  categories: () => apiGet<CategoryDto[]>("/v1/categories"),
  subcategories: (categorySlug: string) => 
    apiGet<CategoryDto[]>(`/v1/categories/${categorySlug}/subcategories`),
  promotions: () => apiGet<PromotionDto[]>("/v1/promotions"),

  products: (params?: {
    categorySlug?: string;
    subcategorySlug?: string;
    q?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const sp = new URLSearchParams();
    if (params?.categorySlug) sp.set("categorySlug", params.categorySlug);
    if (params?.subcategorySlug) sp.set("subcategorySlug", params.subcategorySlug);
    if (params?.q) sp.set("q", params.q);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    if (params?.sortBy) sp.set("sortBy", params.sortBy);
    if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);

    const qs = sp.toString();
    return apiGet<ProductDto[]>(`/v1/products${qs ? `?${qs}` : ""}`);
  },
};
