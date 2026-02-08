"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiHeart, FiPlus, FiMinus } from 'react-icons/fi';
import { Badge } from '../ui/badge';
import { resolveMediaUrl } from 'shared/api/media';
import { ProductDto } from 'features/catalog/types';
import { useCart } from '../cart/CartProvider';
import { useFavorites } from '../favorites/FavoritesProvider';

interface ProductCardProps {
  product: ProductDto;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, updateItemQty, removeItem, cart, isCartLoading } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);

  const imageUrl = resolveMediaUrl(product.imageUrl);
  const isInFavorites = isFavorite(product.id);
  
  // Найдем товар в корзине
  const cartItem = cart?.items.find(item => item.productId === product.id);
  const quantityInCart = cartItem?.qty ?? 0;
  
  // Logic: Check if there is a discount (oldPrice exists and is greater than current price)
  const hasDiscount = (product.oldPrice ?? 0) > product.price;
  
  // Calculate discount percentage dynamically if needed
  const discountPercent = hasDiscount && product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    setIsUpdating(true);
    try {
      await addItem(product.id, 1);
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

  const isDisabled = isCartLoading || isUpdating;

  return (
    <div className="product-card relative flex flex-col h-full bg-white rounded-2xl overflow-hidden group 
                    shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]
                    transition-all duration-300 ease-out">
      
      {/* Quantity badge - показываем только если товар в корзине */}
      {quantityInCart > 0 && (
        <div className="absolute top-3 left-3 z-20 flex items-center justify-center 
                        min-w-[28px] h-7 px-2 rounded-full bg-[#6206c7] text-white 
                        text-sm font-semibold shadow-lg
                        animate-in zoom-in-75 duration-200">
          {quantityInCart}
        </div>
      )}

      {/* Favorite button */}
      <button
        type="button"
        className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center 
                    rounded-full shadow-md transition-all duration-200 ease-out
                    ${isInFavorites
                      ? "bg-rose-500 text-white scale-110"
                      : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-rose-500 hover:scale-110"
                    }`}
        aria-label={isInFavorites ? "Убрать из избранного" : "Добавить в избранное"}
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
          className={`transition-transform duration-200 ${isTogglingFavorite ? 'scale-75' : ''}`}
          fill={isInFavorites ? "currentColor" : "none"}
        />
      </button>
      
      {/* Image container */}
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100/50">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-300">
              <span className="text-sm">Нет фото</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-grow p-3 pt-2">
        {/* Discount badge */}
        {hasDiscount && (
          <Badge className="self-start mb-2 bg-rose-500 hover:bg-rose-500 text-white text-xs font-medium 
                           px-2.5 py-0.5 rounded-full shadow-sm">
            Скидка {discountPercent}%
          </Badge>
        )}

        {/* Title */}
        <Link href={`/product/${product.id}`} className="flex-grow">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1.5 
                         hover:text-[#6206c7] transition-colors duration-200 leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Weight / Volume info */}
        {product.weightGr && (
          <div className="text-xs text-gray-400 mb-3">
            {product.weightGr >= 1000 
              ? `${(product.weightGr / 1000).toFixed(product.weightGr % 1000 === 0 ? 0 : 1)} кг` 
              : `${product.weightGr} г`}
          </div>
        )}

        {/* Price and cart controls */}
        <div className="mt-auto">
          {quantityInCart > 0 ? (
            /* Контролы количества когда товар в корзине */
            <div className="flex items-center justify-between bg-gray-50 rounded-full p-1 
                           border border-gray-100">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={isDisabled}
                className="flex items-center justify-center w-9 h-9 rounded-full
                          text-gray-600 hover:bg-white hover:text-rose-500 hover:shadow-md
                          transition-all duration-200 ease-out
                          disabled:opacity-40 disabled:cursor-not-allowed
                          active:scale-90"
                aria-label="Уменьшить количество"
              >
                <FiMinus size={16} strokeWidth={2.5} />
              </button>
              
              <div className="flex flex-col items-center px-2 min-w-[60px]">
                <span className="font-bold text-base text-gray-900">
                  {product.price} ₽
                </span>
                {hasDiscount && (
                  <span className="text-[10px] text-gray-400 line-through leading-none">
                    {product.oldPrice} ₽
                  </span>
                )}
              </div>
              
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isDisabled}
                className="flex items-center justify-center w-9 h-9 rounded-full
                          bg-[#6206c7] text-white hover:bg-[#7a1fe0] hover:shadow-lg
                          transition-all duration-200 ease-out
                          disabled:opacity-40 disabled:cursor-not-allowed
                          active:scale-90"
                aria-label="Увеличить количество"
              >
                <FiPlus size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            /* Кнопка добавления когда товара нет в корзине */
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-lg text-gray-900">{product.price} ₽</span>
                {hasDiscount && (
                  <span className="text-xs text-gray-400 line-through">
                    {product.oldPrice} ₽
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isDisabled}
                className="flex items-center justify-center w-10 h-10 rounded-full
                          border-2 border-[#6206c7]/30 text-[#6206c7] bg-white
                          hover:border-[#6206c7]/50 hover:bg-[#6206c7]/5 hover:scale-105
                          active:scale-95
                          transition-all duration-200 ease-out
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Добавить в корзину"
              >
                <FiPlus 
                  size={20} 
                  strokeWidth={2.5}
                  className={`transition-transform duration-200 ${isUpdating ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
