import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Kelsa Курьер - Вход',
  description: 'Приложение курьера для доставки заказов',
  manifest: '/courier/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kelsa Курьер',
  },
  icons: {
    apple: '/cur192.png',
  },
};

export default function CourierLoginLayout({ children }: { children: ReactNode }) {
  return children;
}
