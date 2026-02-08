"use client";

import React from "react";
import { useCart } from "../cart/CartProvider";

interface CartQuantityBadgeProps {
  productId: string;
  className?: string;
}

/**
 * Бейдж количества товара в корзине — абсолютно позиционируется внутри relative-контейнера.
 * Стиль повторяет ProductCard для единообразия.
 */
export function CartQuantityBadge({ productId, className = "" }: CartQuantityBadgeProps) {
  const { cart } = useCart();
  const cartItem = cart?.items.find((item) => item.productId === productId);
  const qty = cartItem?.qty ?? 0;

  if (qty === 0) return null;

  return (
    <div
      className={`absolute top-4 right-4 z-20 flex items-center justify-center
                  min-w-[32px] h-8 px-2.5 rounded-full
                  bg-[#6206c7] text-white text-sm font-semibold
                  shadow-[0_4px_12px_rgba(98,6,199,0.35)]
                  transition-all duration-300 ease-out
                  ${className}`}
      style={{
        animation: "cartBadgeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <span
        key={qty}
        className="inline-block"
        style={{
          animation: "cartBadgeCount 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {qty}
      </span>
    </div>
  );
}
