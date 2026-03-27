"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { FiMapPin, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX } from 'react-icons/fi';
import CategoryMenu from './CategoryMenu';
import MobileMenu from './MobileMenu';
import SearchWithSuggestions from './SearchWithSuggestions';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { CartDialog } from '../cart/CartDialog';
import { FloatingCartButton } from '../cart/FloatingCartButton';
import { useCart } from '../cart/CartProvider';
import { useSettlement } from '../settlement/SettlementProvider';
import { AuthDialog } from '../auth/AuthDialog';
import { useAuth } from '../auth/AuthProvider';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { itemCount, lastOrder, resetLastOrder } = useCart();
  const { selectedSettlement, setDialogOpen } = useSettlement();
  const { user } = useAuth();

  useEffect(() => {
    if (lastOrder) {
      setCartOpen(false);
    }
  }, [lastOrder, setCartOpen]);

  // Не показывать header на страницах курьера и админа
  if (pathname.startsWith('/courier') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="kelsa-container">
        {/* Top header row */}
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button
            type="button"
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          {/* Logo - centered on mobile */}
          <Link href="/" className="flex items-center absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0">
            <div className="relative w-24 h-8">
              <Image
                src="/kelsa-logo.svg"
                alt="Kelsa"
                fill
                style={{ objectFit: 'contain', top:'-2px' }}
                priority
              />
            </div>
          </Link>

          {/* Categories dropdown */}
          <div className="hidden md:flex items-center ml-4">
            <CategoryMenu />
          </div>

          {/* Search with suggestions */}
          <div className="hidden md:block flex-grow">
            <SearchWithSuggestions />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {/* Address selection */}
            <button
              type="button"
              className="items-center hidden p-2 text-sm md:flex hover:text-primary transition-colors"
              onClick={() => setDialogOpen(true)}
              title="Выбрать населённый пункт"
            >
              <FiMapPin className="mr-1 text-primary" size={20} />
              <span className="max-w-[120px] truncate">{selectedSettlement ? selectedSettlement.title : "Укажите адрес"}</span>
            </button>
            <button
              type="button"
              className="items-center hidden p-2 md:flex"
              aria-label="Избранное"
              onClick={() => router.push("/account?tab=favorites")}
            >
              <FiHeart size={22} />
            </button>
            <Dialog open={cartOpen} onOpenChange={setCartOpen}>
              <DialogTrigger asChild>
                <button type="button" className="relative p-2" aria-label="Корзина">
                  <FiShoppingBag size={22} />
                  {itemCount > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                      {itemCount}
                    </span>
                  )}
                </button>
              </DialogTrigger>
              <CartDialog />
            </Dialog>
            {user ? (
              <Link
                href="/account"
                className="hidden md:inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <FiUser className="mr-2" size={18} />
                <span>{user.name}</span>
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="hidden md:flex"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                <FiUser className="mr-2" size={18} />
                <span>Войти</span>
              </Button>
            )}
            <button
              type="button"
              className="md:hidden p-2"
              aria-label="Профиль"
              onClick={() => {
                if (user) {
                  router.push("/account");
                } else {
                  setAuthMode("login");
                  setAuthOpen(true);
                }
              }}
            >
              <FiUser size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <MobileMenu
          onClose={() => setMobileMenuOpen(false)}
          onOpenCart={() => {
            setMobileMenuOpen(false);
            setCartOpen(true);
          }}
        />
      )}

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        onAuthenticated={() => setAuthOpen(false)}
      />

      <Dialog
        open={Boolean(lastOrder)}
        onOpenChange={(open) => {
          if (!open) resetLastOrder();
        }}
      >
        {lastOrder && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg p-6 sm:p-8">
            <DialogHeader className="text-left">
              <DialogTitle>
                Заказ №{lastOrder.orderNumber} успешно оформлен
              </DialogTitle>
              <DialogDescription>
                Состояние заказа вы можете отслеживать в личном кабинете.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  resetLastOrder();
                  router.push("/");
                }}
              >
                Вернуться к покупкам
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  resetLastOrder();
                  router.push("/account?tab=orders");
                }}
              >
                Мои заказы
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Плавающая кнопка корзины */}
      <FloatingCartButton onClick={() => setCartOpen(true)} />
    </header>
  );
};

export default Header;
