import { cookies } from "next/headers";
import PromoCarousel from "../components/promotions/PromoCarousel";
import ProductSection from "../components/sections/ProductSection";
import CategoryButtons from "../components/sections/CategoryButtons";
import { WorkHoursBanner } from "../components/sections/WorkHoursBanner";

import { catalogApi } from "../features/catalog/api";

export const dynamic = "force-dynamic";

function getSettlementCode(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(raw))?.code;
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const cookieStore = await cookies();
  const settlement = getSettlementCode(cookieStore.get("kelsa_settlement")?.value);

  // 1) Грузим данные для главной
  const [categories, milkProducts, drinksProducts, discountProducts] =
    await Promise.all([
      catalogApi.categories(settlement),
      catalogApi.products({ categorySlug: "molochnoe-i-yaytsa-i-sir", limit: 6, offset: 0, settlement }),
      catalogApi.products({ categorySlug: "voda-i-napitki", limit: 6, offset: 0, settlement }),
      // "Выгодно сейчас": берём побольше и фильтруем по oldPrice > price
      catalogApi
        .products({ limit: 60, offset: 0, settlement })
        .then((items) => items.filter((p) => (p.oldPrice ?? 0) > p.price).slice(0, 6)),
    ]);


  return (
    <div className="pb-10">
      {/* Promo section */}
      <section className="py-6">
        <div className="kelsa-container">
          {/* Вариант 1 (правильно): прокинуть промо в карусель */}
          <PromoCarousel />
        </div>
      </section>

      <WorkHoursBanner />



      {/* Main content */}
      <div className="kelsa-container">
        {/* Categories section */}
        <CategoryButtons
          categories={categories}
        />

        {/* Products with discounts */}
        <ProductSection
          title="Выгодно сейчас"
          products={discountProducts}
          viewAllLink="/category/sale"
        />

        {/* Milk and cheese */}
        <ProductSection
          title="Молочное, яйца и сыр"
          products={milkProducts}
          viewAllLink="/category/molochnoe-i-yaytsa-i-sir"
        />

        {/* Drinks */}
        <ProductSection
          title="Вода и напитки"
          products={drinksProducts}
          viewAllLink="/category/voda-i-napitki"
        />

        {/* Info blocks */}
        <section className="mt-10 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">Доставка продуктов и товаров</h3>
              <p className="text-muted-foreground">
                Быстрая доставка продуктов, готовой еды и товаров для дома. Работаем каждый день с
                9:00 до 21:00.
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
