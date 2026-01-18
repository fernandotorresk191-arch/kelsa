"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { categories } from '../../lib/data';

const categoryIcons = [
  'https://ext.same-assets.com/2507829798/192582301.jpeg',
  'https://ext.same-assets.com/2507829798/2418261418.jpeg',
  'https://ext.same-assets.com/2507829798/3214456715.jpeg',
  'https://ext.same-assets.com/2507829798/4043090091.jpeg',
  'https://ext.same-assets.com/2507829798/445066372.jpeg',
  'https://ext.same-assets.com/2507829798/1003540328.jpeg',
  'https://ext.same-assets.com/2507829798/2478942248.jpeg',
  'https://ext.same-assets.com/2507829798/2528223841.jpeg',
  'https://ext.same-assets.com/2507829798/969403362.jpeg',
  'https://ext.same-assets.com/2507829798/4031264593.jpeg',
  'https://ext.same-assets.com/2507829798/3711830028.jpeg',
];

const CategoryButtons = () => {
  const categoriesToShow = categories.slice(0, 11);

  return (
    <div className="py-6 overflow-hidden">
      <h2 className="text-xl font-semibold mb-4">Категории</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {categoriesToShow.map((category, index) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="block"
          >
            <div
              className="
      relative
      h-52
      rounded-2xl
      bg-gray-200
      overflow-hidden
      transition
      hover:brightness-95
    "
            >
              {/* Текст сверху */}
              <div className="relative z-10 p-4">
                <span className="text-sm font-semibold text-gray-900">
                  {category.name}
                </span>
              </div>

              {/* Картинка на весь блок */}
              <Image
                src={categoryIcons[index] || categoryIcons[0]}
                alt={category.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 20vw"
                priority={index < 2}
              />
            </div>
          </Link>

        ))}
      </div>
    </div>
  );
};

export default CategoryButtons;
