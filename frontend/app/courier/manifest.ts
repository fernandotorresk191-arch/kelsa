import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kelsa Курьер",
    short_name: "Курьер",
    description: "Приложение курьера для доставки заказов",
    start_url: "/courier",
    scope: "/courier",
    display: "standalone",
    background_color: "#1e293b",
    theme_color: "#3b82f6",
    icons: [
      { src: "/cur192.png", sizes: "192x192", type: "image/png" },
      { src: "/cur512.png", sizes: "512x512", type: "image/png" },
      { src: "/cur512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
