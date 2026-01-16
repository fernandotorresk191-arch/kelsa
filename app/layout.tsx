import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

export const metadata: Metadata = {
  title: "Nevre — Доставка продуктов и товаров",
  description: "Nevre — онлайн-магазин с доставкой продуктов и товаров для дома от 15 минут. Заказывайте бесплатную экспресс-доставку продуктов, готовой еды и других товаров.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
