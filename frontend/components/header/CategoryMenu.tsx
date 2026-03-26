"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import { catalogApi } from "../../features/catalog/api";
import type { CategoryDto } from "../../features/catalog/types";
import { useSettlement } from "../settlement/SettlementProvider";

const CategoryMenu = () => {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const { selectedSettlement } = useSettlement();
  const settlement = selectedSettlement?.code;

  useEffect(() => {
    let mounted = true;

    catalogApi
      .categories(settlement)
      .then((data) => {
        if (mounted) {
          setCategories(data);
        }
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });

    return () => {
      mounted = false;
    };
  }, [settlement]);

  if (!categories.length) return null;

  return (
    <nav className="flex items-center py-3 overflow-x-auto hide-scrollbar gap-4 px-1">
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
