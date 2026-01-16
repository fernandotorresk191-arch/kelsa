"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { categories } from "../../lib/data";
import {
  FiHeart,
  FiMapPin,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
} from "react-icons/fi";

type MobileMenuProps = {
  onClose: () => void;
};

const MobileMenu = ({ onClose }: MobileMenuProps) => {
  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto md:hidden">
      <div className="samokat-container py-4 space-y-6">
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

        <div className="relative">
          <Input
            placeholder="Поиск товаров"
            className="pl-10 rounded-full bg-accent/50"
          />
          <FiSearch
            className="absolute translate-y-1/2 left-3 bottom-1/2"
            size={18}
          />
        </div>

        <button
          type="button"
          className="flex items-center gap-2 text-sm"
          aria-label="Указать адрес доставки"
        >
          <FiMapPin className="text-primary" />
          <span>Укажите адрес доставки</span>
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
          <button
            type="button"
            className="flex items-center gap-2 text-sm"
            aria-label="Избранное"
          >
            <FiHeart size={18} />
            <span>Избранное</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 text-sm"
            aria-label="Корзина"
          >
            <FiShoppingBag size={18} />
            <span>Корзина</span>
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full justify-center"
          aria-label="Войти"
        >
          <FiUser className="mr-2" size={18} />
          <span>Войти</span>
        </Button>
      </div>
    </div>
  );
};

export default MobileMenu;
