import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

export const metadata: Metadata = {
  title: "kelsa — Доставка продуктов и товаров",
  description: "kelsa — онлайн-магазин с доставкой продуктов и товаров для дома от 15 минут.",
  applicationName: "kelsa",
  manifest: "/manifest.webmanifest",
  themeColor: "#d14b57",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "kelsa",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
