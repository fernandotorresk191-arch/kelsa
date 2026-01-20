"use client";

import React from "react";
import { FiHeart, FiMinus, FiPlus } from "react-icons/fi";
import { Button } from "../ui/button";
import { useCart } from "../cart/CartProvider";
import type { ProductDto } from "features/catalog/types";
import { useFavorites } from "../favorites/FavoritesProvider";

export function ProductActions({ product }: { product: ProductDto }) {
  const { addItem, isCartLoading } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [qty, setQty] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);
  const isInFavorites = isFavorite(product.id);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addItem(product.id, qty);
    } catch {
      // Ошибку покажет компонент корзины
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex gap-4 mb-8">
      <div className="flex items-center border rounded-full">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setQty((prev) => Math.max(1, prev - 1))}
          disabled={qty <= 1}
        >
          <FiMinus size={18} />
        </Button>
        <span className="mx-2 font-medium min-w-[24px] text-center">{qty}</span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setQty((prev) => prev + 1)}
        >
          <FiPlus size={18} />
        </Button>
      </div>

      <Button
        className="px-8"
        onClick={handleAdd}
        disabled={isCartLoading || isAdding}
      >
        {isAdding ? "Добавляем..." : "В корзину"}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${isInFavorites ? "text-primary border-primary" : ""}`}
        aria-label={isInFavorites ? "Убрать из избранного" : "Добавить в избранное"}
        aria-pressed={isInFavorites}
        disabled={isTogglingFavorite}
        onClick={async () => {
          setIsTogglingFavorite(true);
          try {
            await toggleFavorite(product);
          } catch {
            // Ошибку покажем через глобальное состояние избранного
          } finally {
            setIsTogglingFavorite(false);
          }
        }}
      >
        <FiHeart size={18} />
      </Button>
    </div>
  );
}
