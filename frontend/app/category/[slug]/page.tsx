import { notFound } from "next/navigation";

import CategoryFilters from "../../../components/category/CategoryFilters";
import { catalogApi } from "../../../features/catalog/api";
import { BackButton } from "../../../components/product/BackButton";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const categories = await catalogApi.categories();
  const category = categories.find((c) => c.slug === decodedSlug);

  // Загружаем подкатегории для текущей категории
  const subcategories = category 
    ? await catalogApi.subcategories(decodedSlug)
    : [];

  // Load products for the category; special-case "sale" to show discounted items across all categories.
  const categoryProducts =
    decodedSlug === "sale"
      ? (await catalogApi.products({ limit: 200, offset: 0 })).filter(
          (p) => (p.oldPrice ?? 0) > p.price,
        )
      : category
      ? await catalogApi.products({ categorySlug: decodedSlug, limit: 200, offset: 0 })
      : null;

  if (!categoryProducts) {
    notFound();
  }

  const title = category ? category.name : "Выгодно сейчас";

  return (
    <div className="kelsa-container py-8">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
      </div>

      <CategoryFilters 
        initialProducts={categoryProducts}
        subcategories={subcategories}
        categorySlug={decodedSlug}
      />
    </div>
  );
}
