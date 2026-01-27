import type { Metadata, Viewport } from "next";
import { ReactNode } from 'react';
import CourierClientLayout from './CourierClientLayout';

export const metadata: Metadata = {
  title: "Kelsa Курьер",
  description: "Приложение курьера для доставки заказов",
  applicationName: "Kelsa Курьер",
  manifest: "/courier-manifest.json",
  icons: {
    icon: "/icons/courier-192.png",
    apple: "/icons/courier-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Курьер",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function CourierLayout({ children }: { children: ReactNode }) {
  return <CourierClientLayout>{children}</CourierClientLayout>;
}
