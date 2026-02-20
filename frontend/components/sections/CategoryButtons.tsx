"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "shared/api/media";
import { CategoryDto } from "features/catalog/types";

interface CategoryButtonsProps {
  categories: CategoryDto[];
}

const CategoryButtons: React.FC<CategoryButtonsProps> = ({ categories }) => {
  const categoriesToShow = categories.slice(0, 11);

  return (
    <div className="py-6 overflow-hidden">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-5">Категории!!!</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {categoriesToShow.map((category) => {
          const img = resolveMediaUrl(category.imageUrl);

          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="block"
            >
              <div className="relative h-52 rounded-2xl bg-gray-100 overflow-hidden transition hover:brightness-95">
                {/* Название */}
                <div className="relative z-10 p-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {category.name}
                  </span>
                </div>

                {/* Картинка категории */}
                {img && (
                  <Image
                    src={img}
                    alt={category.name}
                    fill
                    // Исправленная строка:
                    className="object-contain object-center"
                    sizes="(max-width: 768px) 50vw, 20vw"
                    priority
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryButtons;