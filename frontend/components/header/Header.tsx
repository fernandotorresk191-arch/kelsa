"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FiMapPin, FiHeart, FiShoppingBag, FiUser, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import CategoryMenu from './CategoryMenu';
import MobileMenu from './MobileMenu';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [searchValue, setSearchValue] = useState("");
  const { itemCount, lastOrder, resetLastOrder } = useCart();
  const { selectedSettlement, setDialogOpen } = useSettlement();
  const { user } = useAuth();

  useEffect(() => {
    if (lastOrder) {
      setCartOpen(false);
    }
  }, [lastOrder, setCartOpen]);

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
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </Link>

          {/* Address selection */}
          <button
            type="button"
            className="items-center hidden ml-6 text-sm md:flex"
            onClick={() => setDialogOpen(true)}
          >
            <FiMapPin className="mr-1 text-primary" />
            <span>{selectedSettlement ? selectedSettlement.title : "Укажите адрес доставки"}</span>
          </button>

          {/* Search */}
          <form
            className="relative flex-grow hidden mx-6 md:block"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchValue.trim();
              if (!query) return;
              router.push(`/search?q=${encodeURIComponent(query)}`);
            }}
          >
            <Input
              placeholder="Поиск товаров"
              className="pl-10 rounded-full bg-accent/50"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              aria-label="Поиск товаров"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Найти"
            >
              <FiSearch size={18} />
            </button>
          </form>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
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
                <span>Мои заказы</span>
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

      {/* Categories menu */}
      <div className="hidden border-t md:block">
        <div className="kelsa-container">
          <CategoryMenu />
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
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
