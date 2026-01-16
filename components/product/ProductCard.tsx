"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '../../lib/data';
import { FiPlus } from 'react-icons/fi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="product-card flex flex-col h-full p-2 rounded-md overflow-hidden group">
      <div className="relative">
        {product.discountPercent && (
          <Badge className="absolute top-2 left-2 z-10 bg-primary text-white font-medium px-2">
            {product.discountPercent}%
          </Badge>
        )}
        <Link href={`/product/${product.id}`}>
          <div className="relative aspect-square mb-2 rounded-md overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              style={{ objectFit: 'contain' }}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>
      </div>

      <div className="flex flex-col flex-grow mt-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <span>{product.weight}</span>
        </div>

        <Link href={`/product/${product.id}`} className="flex-grow">
          <h3 className="text-sm line-clamp-2 mb-2 hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {product.discountPrice ? (
              <>
                <span className="font-semibold">{product.discountPrice}₽</span>
                <span className="text-xs text-muted-foreground line-through">{product.price}₽</span>
              </>
            ) : (
              <span className="font-semibold">{product.price}₽</span>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <FiPlus size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
