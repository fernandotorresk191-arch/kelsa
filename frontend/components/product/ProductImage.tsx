"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { CartQuantityBadge } from "./CartQuantityBadge";

interface ProductImageProps {
  productId: string;
  imageUrl: string | null;
  title: string;
  discountPercent: number | null;
}

/**
 * Клиентская обёртка для изображения товара на ProductPage.
 * Показывает бейдж количества товара в корзине поверх картинки.
 */
export function ProductImage({ productId, imageUrl, title, discountPercent }: ProductImageProps) {
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-gray-100 p-4
                    shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {discountPercent && (
        <Badge className="absolute top-4 left-4 z-10 bg-rose-500 hover:bg-rose-500 text-white font-medium px-2.5 py-1 rounded-full shadow-sm">
          -{discountPercent}%
        </Badge>
      )}
      <CartQuantityBadge productId={productId} />
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          style={{ objectFit: "contain" }}
          className="p-4"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-gray-300">
          <span className="text-xs">Нет фото</span>
        </div>
      )}
    </div>
  );
}
