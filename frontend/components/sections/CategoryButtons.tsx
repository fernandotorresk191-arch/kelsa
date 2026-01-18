"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "shared/api/media";


type CategoryVm = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

export default function CategoryButtons({
  categories,
}: {
  categories: CategoryVm[];
}) {
  const categoriesToShow = categories.slice(0, 11);

  return (
    <div className="py-6 overflow-hidden">
      <h2 className="text-xl font-semibold mb-4">Категории</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {categoriesToShow.map((category) => {
          const img = resolveMediaUrl(category.imageUrl);

          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="block"
            >
              <div className="relative h-52 rounded-2xl bg-gray-200 overflow-hidden transition hover:brightness-95">
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
                    className="object-cover"
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
}
