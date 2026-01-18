import PromoCarousel from "../components/promotions/PromoCarousel";
import ProductSection from "../components/sections/ProductSection";
import CategoryButtons from "../components/sections/CategoryButtons";

import { catalogApi } from "../features/catalog/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1) Грузим данные для главной
  const [categories, milkProducts, drinksProducts, discountProducts] =
    await Promise.all([
      catalogApi.categories(),
      catalogApi.products({ categorySlug: "molochnoe-i-syr", limit: 6, offset: 0 }),
      catalogApi.products({ categorySlug: "voda-i-napitki-1", limit: 6, offset: 0 }),
      // “Выгодно сейчас”: берём побольше и фильтруем по oldPrice > price
      catalogApi
        .products({ limit: 60, offset: 0 })
        .then((items) => items.filter((p) => (p.oldPrice ?? 0) > p.price).slice(0, 6)),
    ]);

  return (
    <div className="pb-10">
      {/* Promo section */}
      <section className="bg-accent/30 py-6">
        <div className="kelsa-container">
          {/* Вариант 1 (правильно): прокинуть промо в карусель */}
          <PromoCarousel />
        </div>
      </section>

      {/* Main content */}
      <div className="kelsa-container">
        {/* Categories section */}
        <CategoryButtons
          categories={categories
            .filter((c) => c.isActive)
            .map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              imageUrl: c.imageUrl ?? null,
            }))}
        />

        {/* Products with discounts */}
        <ProductSection
          title="Выгодно сейчас"
          products={discountProducts}
          viewAllLink="/category/sale"
        />

        {/* Milk and cheese */}
        <ProductSection
          title="Молочное и сыр"
          products={milkProducts}
          viewAllLink="/category/molochnoe-i-syr"
        />

        {/* Drinks */}
        <ProductSection
          title="Вода и напитки"
          products={drinksProducts}
          viewAllLink="/category/voda-i-napitki-1"
        />

        {/* Info blocks */}
        <section className="mt-10 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">Доставка продуктов и товаров</h3>
              <p className="text-muted-foreground">
                Быстрая доставка продуктов, готовой еды и товаров для дома. Работаем каждый день с
                8:00 до 23:00.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">Всегда свежие продукты</h3>
              <p className="text-muted-foreground">
                Мы тщательно следим за сроками годности и условиями хранения. Только свежие и
                качественные продукты.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
