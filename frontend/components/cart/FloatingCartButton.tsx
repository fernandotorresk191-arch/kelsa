'use client';

import React from 'react';
import { useCart } from './CartProvider';
import { FiShoppingBag } from 'react-icons/fi';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { cart, itemCount } = useCart();

  // Не показываем кнопку если корзина пуста
  if (!cart || itemCount === 0) {
    return null;
  }

  // Вычисляем общую сумму из товаров корзины
  const totalAmount = cart.items.reduce((sum, item) => {
    return sum + (item.product.price * item.qty);
  }, 0);
  
  const formattedTotal = new Intl.NumberFormat('ru-RU').format(totalAmount);

  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-6 z-50 flex items-center gap-2 px-5 py-3 
                 bg-primary text-primary-foreground rounded-full shadow-lg
                 hover:bg-primary/90 active:scale-95 transition-all duration-150
                 md:right-6 md:bottom-8"
      aria-label={`Корзина: ${formattedTotal} ₽`}
    >
      <FiShoppingBag className="w-5 h-5" />
      <span className="font-semibold text-base whitespace-nowrap">
        {formattedTotal}&nbsp;₽
      </span>
    </button>
  );
}
