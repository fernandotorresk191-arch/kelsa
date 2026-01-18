import { notFound } from "next/navigation";
import { FiChevronDown, FiFilter } from "react-icons/fi";

import ProductCard from "../../../components/product/ProductCard";
import { Button } from "../../../components/ui/button";
import { catalogApi } from "../../../features/catalog/api";

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
      <h1 className="text-2xl font-semibold mb-6">{title}</h1>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <FiFilter size={16} />
            <span>Фильтры</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            Сортировка
            <FiChevronDown size={16} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">{categoryProducts.length} товаров</div>
      </div>

      {/* Products grid */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categoryProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-xl mb-2">Товары не найдены</h2>
          <p className="text-muted-foreground">
            Попробуйте изменить параметры поиска или выбрать другую категорию
          </p>
        </div>
      )}
    </div>
  );
}
