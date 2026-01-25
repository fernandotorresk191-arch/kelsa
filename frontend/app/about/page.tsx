import { Metadata } from "next";
import Link from "next/link";
import { FiHeart, FiShield, FiClock, FiTruck, FiCheckCircle, FiStar } from "react-icons/fi";

export const metadata: Metadata = {
  title: "О нас | Kelsa — Новый взгляд на доставку продуктов",
  description: "Kelsa — сервис доставки продуктов с контролем качества и сроков годности. Узнайте о нашей миссии и ценностях.",
};

export default function AboutPage() {
  return (
    <div className="kelsa-container py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#6206c7] to-[#9333ea] bg-clip-text text-transparent">
          Kelsa — новый взгляд
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          В переводе с чеченского языка <span className="font-semibold text-foreground">«Kelsa»</span> означает 
          <span className="font-semibold text-[#6206c7]"> «новый взгляд»</span> или 
          <span className="font-semibold text-[#6206c7]"> «новая душа»</span>. 
          И это не просто название — это наша философия.
        </p>
      </section>

      {/* Mission Section */}
      <section className="mb-16">
        <div className="bg-gradient-to-br from-[#6206c7]/5 to-[#9333ea]/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">
            Наша миссия
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto text-center">
            Мы по-новому посмотрели на местный рынок доставки продуктов и увидели, 
            что можно сделать лучше. Не просто доставлять товары, а заботиться о каждом 
            аспекте вашего опыта — от качества продуктов до скорости доставки.
          </p>
        </div>
      </section>

      {/* Values Grid */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
          Что делает нас особенными
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ValueCard
            icon={<FiShield className="w-8 h-8" />}
            title="Контроль качества"
            description="Наша система тщательно отслеживает качество каждого товара. Мы проверяем продукты перед отправкой, чтобы вы получали только лучшее."
          />
          <ValueCard
            icon={<FiClock className="w-8 h-8" />}
            title="Свежесть гарантирована"
            description="Мы контролируем сроки годности всех продуктов. Вы никогда не получите товар с истекающим сроком — это наше обещание."
          />
          <ValueCard
            icon={<FiTruck className="w-8 h-8" />}
            title="Быстрая доставка"
            description="Понимаем, что ваше время ценно. Доставляем заказы максимально быстро, сохраняя при этом качество и заботу."
          />
          <ValueCard
            icon={<FiHeart className="w-8 h-8" />}
            title="Забота о клиентах"
            description="Каждый клиент для нас важен. Мы слушаем ваши отзывы и постоянно улучшаем сервис, чтобы превзойти ожидания."
          />
          <ValueCard
            icon={<FiCheckCircle className="w-8 h-8" />}
            title="Прозрачность"
            description="Честные цены, понятные условия, никаких скрытых платежей. Мы верим, что доверие — основа долгосрочных отношений."
          />
          <ValueCard
            icon={<FiStar className="w-8 h-8" />}
            title="Местные продукты"
            description="Поддерживаем местных производителей и фермеров. Свежие продукты от проверенных поставщиков прямо к вашему столу."
          />
        </div>
      </section>

      {/* Story Section */}
      <section className="mb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">
            Наша история
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Kelsa родилась из простой идеи: люди заслуживают качественных продуктов 
              с удобной доставкой. Мы заметили, что на местном рынке не хватает сервиса, 
              который бы действительно заботился о клиентах — от выбора товаров до момента 
              доставки.
            </p>
            <p>
              Мы создали систему, которая автоматически отслеживает качество и сроки годности 
              каждого продукта. Наши сборщики проходят обучение и знают, как выбирать 
              лучшие фрукты, овощи и другие товары. А наши курьеры понимают важность 
              бережной доставки.
            </p>
            <p>
              Название <span className="font-semibold text-foreground">Kelsa</span> отражает 
              наш подход — мы смотрим на привычные вещи по-новому, находим способы сделать 
              лучше и не боимся менять устоявшиеся практики ради качества.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center">
        <div className="bg-gradient-to-r from-[#6206c7] to-[#9333ea] rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Попробуйте новый подход к покупкам
          </h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">
            Присоединяйтесь к тысячам довольных клиентов, которые уже оценили 
            качество и удобство Kelsa.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#6206c7] 
                       font-semibold rounded-full hover:bg-white/90 transition-colors"
          >
            Начать покупки
          </Link>
        </div>
      </section>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="w-14 h-14 rounded-full bg-[#6206c7]/10 flex items-center justify-center text-[#6206c7] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
