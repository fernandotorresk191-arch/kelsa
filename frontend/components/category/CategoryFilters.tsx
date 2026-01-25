"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { Button } from "../ui/button";
import ProductCard from "../product/ProductCard";
import type { CategoryDto, ProductDto } from "../../features/catalog/types";

type SortOrder = "none" | "asc" | "desc";

interface CategoryFiltersProps {
  initialProducts: ProductDto[];
  subcategories: CategoryDto[];
  categorySlug: string;
}

export default function CategoryFilters({
  initialProducts,
  subcategories,
  categorySlug,
}: CategoryFiltersProps) {
  const [products, setProducts] = useState<ProductDto[]>(initialProducts);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedSubcategory) {
        params.set("subcategorySlug", selectedSubcategory);
      } else if (categorySlug !== "sale") {
        params.set("categorySlug", categorySlug);
      }
      
      params.set("limit", "200");
      params.set("offset", "0");
      
      if (sortOrder !== "none") {
        params.set("sortBy", "price");
        params.set("sortOrder", sortOrder);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/v1/products?${params.toString()}`);
      let data: ProductDto[] = await response.json();

      // Для категории "sale" фильтруем товары со скидкой
      if (categorySlug === "sale" && !selectedSubcategory) {
        data = data.filter((p) => (p.oldPrice ?? 0) > p.price);
      }

      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, selectedSubcategory, sortOrder]);

  useEffect(() => {
    // Пропускаем первый рендер, т.к. у нас уже есть initialProducts
    if (sortOrder !== "none" || selectedSubcategory !== null) {
      fetchProducts();
    }
  }, [sortOrder, selectedSubcategory, fetchProducts]);

  // Сортировка на клиенте для начальных данных
  const sortedProducts = useMemo(() => {
    if (sortOrder === "none") return products;
    
    return [...products].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.price - b.price;
      }
      return b.price - a.price;
    });
  }, [products, sortOrder]);

  const handleSortToggle = () => {
    // Переключаем: none -> asc -> desc -> none
    if (sortOrder === "none") {
      setSortOrder("asc");
    } else if (sortOrder === "asc") {
      setSortOrder("desc");
    } else {
      setSortOrder("none");
    }
  };

  const handleSubcategoryChange = (subcategorySlug: string | null) => {
    setSelectedSubcategory(subcategorySlug);
  };

  const clearFilters = () => {
    setSortOrder("none");
    setSelectedSubcategory(null);
    setProducts(initialProducts);
  };

  const hasActiveFilters = sortOrder !== "none" || selectedSubcategory !== null;

  const getSortLabel = () => {
    if (sortOrder === "asc") return "Сначала дешёвые";
    if (sortOrder === "desc") return "Сначала дорогие";
    return "Сортировка";
  };

  return (
    <div>
      {/* Filters and Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {/* Sort Button */}
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-1 ${
            sortOrder !== "none" 
              ? "bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background" 
              : ""
          }`}
          onClick={handleSortToggle}
        >
          {sortOrder === "asc" ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          <span>{getSortLabel()}</span>
        </Button>

        {/* Subcategory Filters */}
        {subcategories.length > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className={
                selectedSubcategory === null 
                  ? "bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background" 
                  : ""
              }
              onClick={() => handleSubcategoryChange(null)}
            >
              Все
            </Button>
            {subcategories.map((sub) => (
              <Button
                key={sub.id}
                variant="outline"
                size="sm"
                className={
                  selectedSubcategory === sub.slug 
                    ? "bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background" 
                    : ""
                }
                onClick={() => handleSubcategoryChange(sub.slug)}
              >
                {sub.name}
              </Button>
            ))}
          </>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground flex items-center gap-1"
            onClick={clearFilters}
          >
            <FiX size={16} />
            <span>Сбросить</span>
          </Button>
        )}
      </div>

      {/* Products Count */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading ? "Загрузка..." : `${sortedProducts.length} товаров`}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="bg-muted/50 rounded-lg aspect-square animate-pulse"
            />
          ))}
        </div>
      ) : sortedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedProducts.map((product) => (
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
}
