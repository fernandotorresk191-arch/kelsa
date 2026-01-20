import ProductCard from "../../components/product/ProductCard";
import { catalogApi } from "../../features/catalog/api";

export const dynamic = "force-dynamic";

function normalizeQuery(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = normalizeQuery(params?.q);

  const products = query
    ? await catalogApi.products({ q: query, limit: 200, offset: 0 })
    : [];

  return (
    <div className="kelsa-container py-8">
      <h1 className="text-2xl font-semibold mb-2">Поиск</h1>
      {query ? (
        <div className="text-sm text-muted-foreground mb-6">
          По запросу "{query}" найдено: {products.length}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-6">
          Введите запрос в поиске, чтобы найти товары.
        </div>
      )}

      {query && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-16">
          <h2 className="text-xl mb-2">Ничего не найдено</h2>
          <p className="text-muted-foreground">
            Попробуйте изменить запрос или проверьте написание.
          </p>
        </div>
      ) : null}
    </div>
  );
}
