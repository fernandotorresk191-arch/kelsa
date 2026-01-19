import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { CartProvider } from "../components/cart/CartProvider";

export const metadata: Metadata = {
  title: "kelsa — Доставка продуктов и товаров",
  description: "kelsa — онлайн-магазин с доставкой продуктов на дом",
  applicationName: "kelsa",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
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

export const viewport: Viewport = {
  themeColor: "#d14b57",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <CartProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
