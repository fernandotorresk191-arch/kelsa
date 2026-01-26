"use client";

import Link from "next/link";
import { Button } from "../ui/button";

import {
  FiHeart,
  FiMapPin,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
} from "react-icons/fi";
import { CategoryDto } from "features/catalog/types";
import { useEffect, useState } from "react";
import { catalogApi } from "features/catalog/api";
import { useSettlement } from "../settlement/SettlementProvider";
import { useAuth } from "../auth/AuthProvider";
import { AuthDialog } from "../auth/AuthDialog";
import MobileSearch from "./MobileSearch";

type MobileMenuProps = {
  onClose: () => void;
};

const MobileMenu = ({ onClose }: MobileMenuProps) => {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { selectedSettlement, setDialogOpen } = useSettlement();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    catalogApi
      .categories()
      .then((data) => {
        if (mounted) {
          setCategories(data);
        }
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!categories.length) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto md:hidden">
      <div className="kelsa-container py-4 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Меню</span>
          <button
            type="button"
            className="p-2"
            aria-label="Закрыть меню"
            onClick={onClose}
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Поиск - открывает полноэкранный поиск */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 text-slate-500 text-left transition-colors active:bg-slate-200"
        >
          <FiSearch size={18} />
          <span>Поиск товаров...</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 text-sm"
          aria-label="Указать адрес доставки"
          onClick={() => {
            setDialogOpen(true);
            onClose();
          }}
        >
          <FiMapPin className="text-primary" />
          <span>
            {selectedSettlement ? selectedSettlement.title : "Укажите адрес доставки"}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="text-sm px-3 py-2 rounded-md bg-accent/60 hover:bg-accent/80 transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account?tab=favorites"
            className="flex items-center gap-2 text-sm"
            aria-label="Избранное"
            onClick={onClose}
          >
            <FiHeart size={18} />
            <span>Избранное</span>
          </Link>
          <button
            type="button"
            className="flex items-center gap-2 text-sm"
            aria-label="Корзина"
          >
            <FiShoppingBag size={18} />
            <span>Корзина</span>
          </button>
        </div>

        {user ? (
          <Link
            href="/account"
            className="w-full justify-center inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={onClose}
          >
            <FiUser className="mr-2" size={18} />
            <span>Личный кабинет</span>
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            aria-label="Войти"
            onClick={() => setAuthOpen(true)}
          >
            <FiUser className="mr-2" size={18} />
            <span>Войти</span>
          </Button>
        )}
      </div>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode="login"
        onAuthenticated={() => {
          setAuthOpen(false);
          onClose();
        }}
      />

      {/* Полноэкранный поиск */}
      <MobileSearch 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)}
        onNavigate={onClose}
      />
    </div>
  );
};

export default MobileMenu;
