"use client";

import React from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import ProductCard from "../product/ProductCard";
import { Button } from "../ui/button";
import { ProductDto } from "features/catalog/types";


interface ProductSectionProps {
  title: string;
  products: ProductDto[];
  viewAllLink?: string;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  products,
  viewAllLink,
}) => {
  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>

        {viewAllLink && (
          <Link href={viewAllLink}>
            <Button
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              Смотреть все
              <FiChevronRight className="ml-1" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default ProductSection;
