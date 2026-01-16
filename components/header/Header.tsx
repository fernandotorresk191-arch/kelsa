"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FiMapPin, FiHeart, FiShoppingBag, FiUser, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import CategoryMenu from './CategoryMenu';
import MobileMenu from './MobileMenu';
import { useState } from 'react';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="samokat-container">
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
            <div className="relative w-32 h-8">
              <Image
                src="/samokat-logo.svg"
                alt="Самокат"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </Link>

          {/* Address selection */}
          <button type="button" className="items-center hidden ml-6 text-sm md:flex">
            <FiMapPin className="mr-1 text-primary" />
            <span>Укажите адрес доставки</span>
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
            <button type="button" className="p-2" aria-label="Корзина">
              <FiShoppingBag size={22} />
            </button>
            <Button type="button" variant="outline" className="hidden md:flex">
              <FiUser className="mr-2" size={18} />
              <span>Войти</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Categories menu */}
      <div className="hidden border-t md:block">
        <div className="samokat-container">
          <CategoryMenu />
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}
    </header>
  );
};

export default Header;
