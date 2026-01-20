import { apiDelete, apiGet, apiPost } from "shared/api/http";
import type { ProductDto } from "features/catalog/types";

export const favoritesApi = {
  list: () => apiGet<ProductDto[]>("/v1/me/favorites"),
  add: (productId: string) =>
    apiPost<ProductDto, { productId: string }>("/v1/me/favorites", {
      productId,
    }),
  remove: (productId: string) =>
    apiDelete<{ ok: true }>(`/v1/me/favorites/${productId}`),
};
