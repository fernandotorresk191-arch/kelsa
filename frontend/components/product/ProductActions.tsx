"use client";

import React from "react";
import { FiCheck, FiHeart, FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { Button } from "../ui/button";
import { useCart } from "../cart/CartProvider";
import type { ProductDto } from "features/catalog/types";
import { useFavorites } from "../favorites/FavoritesProvider";

export function ProductActions({ product }: { product: ProductDto }) {
  const { addItem, updateItemQty, removeItem, cart, isCartLoading } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [qty, setQty] = React.useState(1);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const isInFavorites = isFavorite(product.id);

  // Найдём товар в корзине
  const cartItem = cart?.items.find((item) => item.productId === product.id);
  const quantityInCart = cartItem?.qty ?? 0;
  const isInCart = quantityInCart > 0;

  const isDisabled = isCartLoading || isUpdating;

  const handleAdd = async () => {
    setIsUpdating(true);
    try {
      await addItem(product.id, qty);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      setQty(1); // Сброс счётчика после добавления
    } catch {
      // Ошибку покажет компонент корзины
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrement = async () => {
    if (!cartItem) return;
    setIsUpdating(true);
    try {
      await updateItemQty(cartItem.id, quantityInCart + 1);
    } catch {
      // Ошибку покажет компонент корзины
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async () => {
    if (!cartItem) return;
    setIsUpdating(true);
    try {
      if (quantityInCart <= 1) {
        await removeItem(cartItem.id);
      } else {
        await updateItemQty(cartItem.id, quantityInCart - 1);
      }
    } catch {
      // Ошибку покажет компонент корзины
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Основные контролы */}
      <div className="flex items-center gap-3 flex-wrap">
        {isInCart ? (
          /* ── Товар уже в корзине: контролы количества ── */
          <div
            className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full p-1
                       transition-all duration-300 ease-out"
            style={{
              animation: "fadeSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <button
              type="button"
              onClick={handleDecrement}
              disabled={isDisabled}
              className="flex items-center justify-center w-10 h-10 rounded-full
                        text-gray-600 hover:bg-white hover:text-rose-500 hover:shadow-md
                        transition-all duration-200 ease-out
                        disabled:opacity-40 disabled:cursor-not-allowed
                        active:scale-90"
              aria-label={quantityInCart <= 1 ? "Удалить из корзины" : "Уменьшить количество"}
            >
              {quantityInCart <= 1 ? (
                <FiTrash2 size={17} strokeWidth={2} />
              ) : (
                <FiMinus size={17} strokeWidth={2.5} />
              )}
            </button>

            <span
              key={quantityInCart}
              className="mx-3 font-semibold text-lg min-w-[28px] text-center text-gray-900
                         inline-block"
              style={{
                animation: "countPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {quantityInCart}
            </span>

            <button
              type="button"
              onClick={handleIncrement}
              disabled={isDisabled}
              className="flex items-center justify-center w-10 h-10 rounded-full
                        text-gray-600 hover:bg-white hover:text-[#6206c7] hover:shadow-md
                        transition-all duration-200 ease-out
                        disabled:opacity-40 disabled:cursor-not-allowed
                        active:scale-90"
              aria-label="Увеличить количество"
            >
              <FiPlus size={17} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          /* ── Товара нет в корзине: выбор количества ── */
          <div
            className="flex items-center border border-gray-200 rounded-full bg-gray-50 p-1
                       transition-all duration-300 ease-out"
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-white hover:shadow-sm transition-all duration-200"
              onClick={() => setQty((prev) => Math.max(1, prev - 1))}
              disabled={qty <= 1}
            >
              <FiMinus size={17} />
            </Button>
            <span className="mx-3 font-semibold text-lg min-w-[28px] text-center">{qty}</span>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-white hover:shadow-sm transition-all duration-200"
              onClick={() => setQty((prev) => prev + 1)}
            >
              <FiPlus size={17} />
            </Button>
          </div>
        )}

        {/* Кнопка добавления / индикатор "в корзине" */}
        {isInCart ? (
          <div
            className="flex items-center gap-2 px-5 h-10 rounded-full
                       bg-[#6206c7]/10 text-[#6206c7] font-medium text-sm
                       transition-all duration-300 ease-out"
            style={{
              animation: "fadeSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
            }}
          >
            <FiCheck size={18} strokeWidth={2.5} className="shrink-0" />
            <span>В корзине</span>
          </div>
        ) : (
          <Button
            className={`px-6 h-10 rounded-full font-medium transition-all duration-300 ease-out
                       ${justAdded
                         ? "bg-emerald-500 hover:bg-emerald-600 scale-105"
                         : "bg-[#6206c7] hover:bg-[#5005a8] active:scale-95"
                       }`}
            onClick={handleAdd}
            disabled={isDisabled}
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Добавляем...
              </span>
            ) : justAdded ? (
              <span className="flex items-center gap-2">
                <FiCheck size={17} />
                Добавлено!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FiShoppingCart size={17} />
                В корзину
              </span>
            )}
          </Button>
        )}

        {/* Избранное */}
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-10 w-10 border transition-all duration-300 ease-out
                     ${isInFavorites
                       ? "text-rose-500 border-rose-400 bg-rose-50 hover:bg-rose-100 shadow-sm shadow-rose-100"
                       : "border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50"
                     }`}
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
          <FiHeart
            size={18}
            className={`transition-transform duration-200 ${isTogglingFavorite ? "scale-75" : ""}`}
            fill={isInFavorites ? "currentColor" : "none"}
          />
        </Button>
      </div>

      {/* Подсказка о количестве в корзине */}
      {isInCart && (
        <p
          className="text-sm text-muted-foreground pl-1"
          style={{
            animation: "fadeSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both",
          }}
        >
          Итого: <span className="font-semibold text-gray-900">{product.price * quantityInCart} ₽</span>
        </p>
      )}

    </div>
  );
}
