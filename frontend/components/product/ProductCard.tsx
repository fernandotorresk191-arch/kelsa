"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiHeart, FiPlus } from 'react-icons/fi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { resolveMediaUrl } from 'shared/api/media';
import { ProductDto } from 'features/catalog/types';
import { useCart } from '../cart/CartProvider';
import { useFavorites } from '../favorites/FavoritesProvider';

interface ProductCardProps {
  product: ProductDto;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, isCartLoading } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isAdding, setIsAdding] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);

  const imageUrl = resolveMediaUrl(product.imageUrl);
  const isInFavorites = isFavorite(product.id);
  
  // Logic: Check if there is a discount (oldPrice exists and is greater than current price)
  const hasDiscount = (product.oldPrice ?? 0) > product.price;
  
  // Calculate discount percentage dynamically if needed
  const discountPercent = hasDiscount && product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="product-card flex flex-col h-full p-2 rounded-md overflow-hidden group border bg-card text-card-foreground">
      <div className="relative">
        {/* Badge */}
        {hasDiscount && (
          <Badge className="absolute top-2 left-2 z-10 bg-destructive text-white font-medium px-2">
            -{discountPercent}%
          </Badge>
        )}

        <button
          type="button"
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition-colors ${
            isInFavorites
              ? "border-rose-500 text-rose-500 bg-rose-50"
              : "border-border text-muted-foreground hover:text-rose-500 hover:border-rose-300"
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
          <FiHeart size={16} />
        </button>
        
        {/* Image */}
        <Link href={`/product/${product.id}`}>
          <div className="relative aspect-square mb-2 rounded-md overflow-hidden bg-gray-50">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.title}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            ) : (
              // Placeholder if no image
              <div className="flex items-center justify-center w-full h-full text-gray-300">
                <span className="text-xs">Нет фото</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="flex flex-col flex-grow mt-1">
        {/* Weight / Unit info - assuming 'weight' exists on DTO, otherwise remove or adapt */}
        {product.weightGr && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <span>{product.weightGr} г</span> 
          </div>
        )}

        <Link href={`/product/${product.id}`} className="flex-grow">
          <h3 className="text-sm font-medium line-clamp-2 mb-2 hover:text-primary transition-colors">
            {product.description}
          </h3>
        </Link>

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="font-bold text-lg">{product.price} ₽</span>
                <span className="text-xs text-muted-foreground line-through">
                  {product.oldPrice} ₽
                </span>
              </>
            ) : (
              <span className="font-bold text-lg">{product.price} ₽</span>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-[#6206c7]/30 bg-[#6206c7]/10 text-[#6206c7] 
                       hover:bg-[#6206c7] hover:text-white hover:border-[#6206c7] 
                       hover:shadow-lg transition-all"
            disabled={isCartLoading || isAdding}
            onClick={async () => {
              setIsAdding(true);
              try {
                await addItem(product.id, 1);
              } catch {
                // Ошибку покажет компонент корзины
              } finally {
                setIsAdding(false);
              }
            }}
          >
            <FiPlus size={18} className={isAdding ? "opacity-50" : undefined} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
