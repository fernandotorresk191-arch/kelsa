"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { categories, products } from '../../../lib/data';
import ProductCard from '../../../components/product/ProductCard';
import { FiFilter, FiChevronDown } from 'react-icons/fi';
import { Button } from '../../../components/ui/button';

const CategoryPage = () => {
  const params = useParams();
  const { slug } = params;

  // Find category by slug
  const category = categories.find(c => c.slug === slug);

  // Get products for this category
  let categoryProducts = [];
  if (slug === 'sale') {
    categoryProducts = products.filter(p => p.discountPercent !== undefined);
  } else {
    categoryProducts = products.filter(p => p.category === slug);
  }

  return (
    <div className="kelsa-container py-8">
      <h1 className="text-2xl font-semibold mb-6">
        {category ? category.name : slug === 'sale' ? 'Выгодно сейчас' : 'Товары'}
      </h1>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <FiFilter size={16} />
            <span>Фильтры</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            Сортировка
            <FiChevronDown size={16} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {categoryProducts.length} товаров
        </div>
      </div>

      {/* Products grid */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categoryProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-xl mb-2">Товары не найдены</h2>
          <p className="text-muted-foreground">
            Попробуйте изменить параметры поиска или выбрать другую категорию
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
