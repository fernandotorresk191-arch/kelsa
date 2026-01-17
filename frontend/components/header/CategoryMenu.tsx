"use client";

import React from 'react';
import Link from 'next/link';
import { categories } from '../../lib/data';

const CategoryMenu = () => {
  return (
    <nav className="flex items-center py-3 overflow-x-auto hide-scrollbar gap-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="nav-link whitespace-nowrap flex-shrink-0 text-sm"
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
};

export default CategoryMenu;
