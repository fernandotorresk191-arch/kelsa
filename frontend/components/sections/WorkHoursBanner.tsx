"use client";

import { useEffect, useState } from "react";

const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;

type BannerState = "open" | "closing-soon" | "opening-soon" | "closed";

function getBannerState(): BannerState {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hour * 60 + minutes;

  const openAt = OPEN_HOUR * 60; // 540
  const closeAt = CLOSE_HOUR * 60; // 1260

  // За час до открытия (08:00–09:00)
  if (timeInMinutes >= openAt - 60 && timeInMinutes < openAt) {
    return "opening-soon";
  }

  // За час до закрытия (20:00–21:00)
  if (timeInMinutes >= closeAt - 60 && timeInMinutes < closeAt) {
    return "closing-soon";
  }

  // Рабочее время (09:00–20:00, исключая последний час)
  if (timeInMinutes >= openAt && timeInMinutes < closeAt - 60) {
    return "open";
  }

  // Закрыты
  return "closed";
}

export function WorkHoursBanner() {
  const [state, setState] = useState<BannerState | null>(null);

  useEffect(() => {
    setState(getBannerState());

    // Обновляем каждую минуту
    const interval = setInterval(() => setState(getBannerState()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Не рендерим на сервере, показываем после гидрации
  if (state === null) return null;

  if (state === "open") {
    // Рабочее время — не показываем баннер
    return null;
  }

  if (state === "opening-soon" || state === "closing-soon") {
    return (
      <div className="kelsa-container mt-1">
        <div
          className="rounded-xl border px-5 py-3 text-center text-sm font-medium"
          style={{
            backgroundColor: "hsl(270 96% 40% / 0.12)",
            borderColor: "hsl(270 96% 40%)",
            color: "hsl(270 96% 40%)",
          }}
        >
          🕘 Работаем с 09:00 до 21:00
        </div>
      </div>
    );
  }

  // closed
  return (
    <div className="kelsa-container mt-1">
      <div
        className="rounded-xl border px-5 py-3 text-center text-sm font-medium"
        style={{
          backgroundColor: "hsl(45 100% 51% / 0.12)",
          borderColor: "hsl(45 100% 40%)",
          color: "hsl(30 80% 30%)",
        }}
      >
        🌙 Сейчас мы закрыты. Работаем с 09:00 до 21:00
      </div>
    </div>
  );
}
