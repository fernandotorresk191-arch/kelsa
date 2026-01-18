export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  sort: number;
  isActive: boolean;
  imageUrl?: string | null;
};

export type ProductDto = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  weightGr?: number | null;
  isActive: boolean;
  price: number; // kopeks
  oldPrice?: number | null;
  categoryId?: string | null;
  category?: {
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
