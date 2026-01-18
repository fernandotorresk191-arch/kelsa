
import { apiGet } from "shared/api/http";
import type { CategoryDto, ProductDto, PromotionDto } from "./types";

export const catalogApi = {
  categories: () => apiGet<CategoryDto[]>("/v1/categories"),
  promotions: () => apiGet<PromotionDto[]>("/v1/promotions"),

  products: (params?: {
    categorySlug?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.categorySlug) sp.set("categorySlug", params.categorySlug);
    if (params?.q) sp.set("q", params.q);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));

    const qs = sp.toString();
    return apiGet<ProductDto[]>(`/v1/products${qs ? `?${qs}` : ""}`);
  },
};
