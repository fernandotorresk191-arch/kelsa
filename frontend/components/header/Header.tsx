"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FiMapPin, FiHeart, FiShoppingBag, FiUser, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import CategoryMenu from './CategoryMenu';
import MobileMenu from './MobileMenu';
import { useState } from 'react';
import { Dialog, DialogTrigger } from '../ui/dialog';
import { CartDialog } from '../cart/CartDialog';
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
  const { itemCount } = useCart();
  const { selectedSettlement, setDialogOpen } = useSettlement();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="kelsa-container">
        {/* Top header row */}
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button
            type="button"
            className="p-2 mr-2 md:hidden"
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center">
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
          <div className="relative flex-grow hidden mx-6 md:block">
            <Input
              placeholder="Поиск товаров"
              className="pl-10 rounded-full bg-accent/50"
            />
            <FiSearch className="absolute translate-y-1/2 left-3 bottom-1/2" size={18} />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="items-center hidden p-2 md:flex"
              aria-label="Избранное"
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
    </header>
  );
};

export default Header;
