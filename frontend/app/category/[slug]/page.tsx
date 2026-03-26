import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import CategoryFilters from "../../../components/category/CategoryFilters";
import { catalogApi } from "../../../features/catalog/api";
import { BackButton } from "../../../components/product/BackButton";

export const dynamic = "force-dynamic";

function getSettlementCode(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(raw))?.code;
  } catch {
    return undefined;
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const cookieStore = await cookies();
  const settlement = getSettlementCode(cookieStore.get("kelsa_settlement")?.value);

  const categories = await catalogApi.categories(settlement);
  const category = categories.find((c) => c.slug === decodedSlug);

  // Загружаем подкатегории для текущей категории
  const subcategories = category 
    ? await catalogApi.subcategories(decodedSlug, settlement)
    : [];

  // Load products for the category; special-case "sale" to show discounted items across all categories.
  const categoryProducts =
    decodedSlug === "sale"
      ? (await catalogApi.products({ limit: 200, offset: 0, settlement })).filter(
          (p) => (p.oldPrice ?? 0) > p.price,
        )
      : category
      ? await catalogApi.products({ categorySlug: decodedSlug, limit: 200, offset: 0, settlement })
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

      {category?.description && (
        <div
          className="prose prose-sm max-w-none mb-6 text-gray-700"
          dangerouslySetInnerHTML={{ __html: category.description }}
        />
      )}

      <CategoryFilters 
        initialProducts={categoryProducts}
        subcategories={subcategories}
        categorySlug={decodedSlug}
      />
    </div>
  );
}
