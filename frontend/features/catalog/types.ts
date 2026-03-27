export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort: number;
  isActive?: boolean;
  imageUrl?: string | null;
  parentId?: string | null;
};

export type ProductDto = {
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
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  subcategoryId?: string | null;
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PromotionDto = {
  id: string;
  title: string;
  imageUrl: string;
  url?: string | null;
  sort: number;
  isActive: boolean;
};
