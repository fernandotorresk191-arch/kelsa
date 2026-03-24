"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiMapPin, FiTruck, FiClock, FiPhone } from "react-icons/fi";
import { http } from "@/shared/api/http";

export default function CoveragePage() {
  const [areas, setAreas] = useState<Array<{ settlement: string; settlementTitle: string }>>([]);

  useEffect(() => {
    http.get<{ zones?: Array<{ settlement: string; settlementTitle: string }> }>('/v1/delivery-settings')
      .then(data => {
        setAreas(data.zones || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="kelsa-container py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#6206c7]/10 text-[#6206c7] mb-6">
          <FiMapPin className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#6206c7] to-[#9333ea] bg-clip-text text-transparent">
          Зона доставки
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Мы доставляем свежие продукты по <span className="font-semibold text-foreground">Наурскому району</span> Чеченской Республики 
          и постоянно расширяем географию нашего сервиса.
        </p>
      </section>

      {/* Current Coverage */}
      <section className="mb-16">
        <div className="bg-gradient-to-br from-[#6206c7]/5 to-[#9333ea]/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center">
            Наурский район
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
            Чеченская Республика
          </p>
          
          {areas.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {areas.map((area) => (
                <div
                  key={area.settlement}
                  className="bg-white rounded-xl p-5 border transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#6206c7]/10 text-[#6206c7]">
                      <FiMapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{area.settlementTitle}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Зоны доставки ещё не настроены. Скоро здесь появится информация.
            </p>
          )}
        </div>
      </section>

      {/* Delivery Info */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
          Условия доставки
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <InfoCard
            icon={<FiTruck className="w-8 h-8" />}
            title="Бесплатная доставка"
            description="Доставка бесплатна при заказе от 1000 ₽. Для меньших заказов стоимость доставки — 100 ₽."
          />
          <InfoCard
            icon={<FiClock className="w-8 h-8" />}
            title="Время доставки"
            description="Доставляем ежедневно с 9:00 до 21:00. Среднее время доставки — 30-60 минут."
          />
          <InfoCard
            icon={<FiPhone className="w-8 h-8" />}
            title="Связь с курьером"
            description="Курьер позвонит вам перед доставкой. Вы всегда можете уточнить статус заказа."
          />
        </div>
      </section>

      {/* Expansion Plans */}
      <section className="mb-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">
            Расширяем географию
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Мы постоянно работаем над расширением зоны доставки. Наша цель — 
              сделать качественные продукты доступными для жителей всего 
              Наурского района и соседних территорий.
            </p>
            <p>
              Если вашего населённого пункта пока нет в списке — напишите нам! 
              Мы учитываем все запросы и формируем план расширения на их основе.
            </p>
          </div>
        </div>
      </section>

      {/* Main CTA */}
      <section className="text-center">
        <div className="bg-gradient-to-r from-[#6206c7] to-[#9333ea] rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Готовы сделать заказ?
          </h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">
            Выбирайте свежие продукты в каталоге, а мы позаботимся о быстрой 
            и аккуратной доставке до вашей двери.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#6206c7] 
                       font-semibold rounded-full hover:bg-white/90 transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
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
