

import { products } from '../lib/data';
import PromoCarousel from '../components/promotions/PromoCarousel';
import ProductSection from '../components/sections/ProductSection';
import CategoryButtons from '../components/sections/CategoryButtons';

export default function Home() {
  // Get products for each category
  const milkProducts = products.filter(p => p.category === 'molochnoe-i-syr').slice(0, 6);
  const drinksProducts = products.filter(p => p.category === 'voda-i-napitki-1').slice(0, 6);
  const discountProducts = products.filter(p => p.discountPercent !== undefined).slice(0, 6);

  return (
    <div className="pb-10">
      {/* Promo section */}
      <section className="bg-accent/30 py-6">
        <div className="samokat-container">
          <PromoCarousel />
        </div>
      </section>

      {/* Main content */}
      <div className="samokat-container">
        {/* Categories section */}
        <CategoryButtons />

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
              <h3 className="text-lg font-semibold mb-3">Доставка за 15 минут</h3>
              <p className="text-muted-foreground">
                Быстрая доставка продуктов, готовой еды и товаров для дома.
                Работаем каждый день с 8:00 до 23:00.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">Всегда свежие продукты</h3>
              <p className="text-muted-foreground">
                Мы тщательно следим за сроками годности и условиями хранения.
                Только свежие и качественные продукты.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}