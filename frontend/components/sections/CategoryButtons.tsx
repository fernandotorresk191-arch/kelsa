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
            className="group"
          >
            <div className="bg-white border rounded-lg p-3 flex flex-col items-center text-center h-full transition-shadow hover:shadow-md">
              <div className="relative w-16 h-16 mb-2">
                <Image
                  src={categoryIcons[index] || categoryIcons[0]}
                  alt={category.name}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-sm">{category.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryButtons;
