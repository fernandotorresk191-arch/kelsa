"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { products } from '../../../lib/data';
import { FiArrowLeft, FiPlus, FiMinus, FiHeart } from 'react-icons/fi';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const ProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  // Find the product by id
  const product = products.find(p => p.id === id);

  // If product not found, show message
  if (!product) {
    return (
      <div className="kelsa-container py-10 text-center">
        <h1 className="text-2xl font-semibold mb-4">Товар не найден</h1>
        <Button onClick={() => router.back()}>Вернуться назад</Button>
      </div>
    );
  }

  return (
    <div className="kelsa-container py-6">
      {/* Breadcrumbs */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.back()}
        >
          <FiArrowLeft className="mr-2" />
          Назад
        </Button>
      </div>

      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product image */}
        <div className="relative aspect-square rounded-lg overflow-hidden bg-white border p-4">
          {product.discountPercent && (
            <Badge className="absolute top-4 left-4 z-10 bg-primary text-white font-medium px-2">
              {product.discountPercent}%
            </Badge>
          )}
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            style={{ objectFit: 'contain' }}
            className="p-4"
          />
        </div>

        {/* Product info */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">{product.title}</h1>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">{product.weight}</span>
            {product.rating && (
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground">★ {product.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="flex items-end gap-3 mb-6">
            {product.discountPrice ? (
              <>
                <span className="text-3xl font-semibold">{product.discountPrice}₽</span>
                <span className="text-xl text-muted-foreground line-through">{product.price}₽</span>
              </>
            ) : (
              <span className="text-3xl font-semibold">{product.price}₽</span>
            )}
          </div>

          <div className="flex gap-4 mb-8">
            <div className="flex items-center border rounded-full">
              <Button variant="ghost" size="icon" className="rounded-full">
                <FiMinus size={18} />
              </Button>
              <span className="mx-2 font-medium">1</span>
              <Button variant="ghost" size="icon" className="rounded-full">
                <FiPlus size={18} />
              </Button>
            </div>

            <Button className="px-8">В корзину</Button>
            <Button variant="outline" size="icon" className="rounded-full">
              <FiHeart size={18} />
            </Button>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-2">Описание</h3>
            <p className="text-muted-foreground">
              Подробное описание товара: {product.title}. Вес/объем: {product.weight}.
            </p>
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="mt-16">
        <h2 className="text-xl font-semibold mb-6">Похожие товары</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4)
            .map(relatedProduct => (
              <Link
                key={relatedProduct.id}
                href={`/product/${relatedProduct.id}`}
                className="block p-4 border rounded-lg transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square mb-3">
                  <Image
                    src={relatedProduct.imageUrl}
                    alt={relatedProduct.title}
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <h3 className="text-sm line-clamp-2 mb-2">{relatedProduct.title}</h3>
                <div className="flex justify-between items-end">
                  <span className="font-semibold">
                    {relatedProduct.discountPrice || relatedProduct.price}₽
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
