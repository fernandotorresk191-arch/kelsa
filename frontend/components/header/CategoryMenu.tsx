"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiGrid, FiChevronDown } from "react-icons/fi";

import { catalogApi } from "../../features/catalog/api";
import type { CategoryDto } from "../../features/catalog/types";
import { useSettlement } from "../settlement/SettlementProvider";

const CategoryMenu = () => {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedSettlement } = useSettlement();
  const settlement = selectedSettlement?.code;

  useEffect(() => {
    let mounted = true;

    catalogApi
      .categories(settlement)
      .then((data) => {
        if (mounted) setCategories(data);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });

    return () => {
      mounted = false;
    };
  }, [settlement]);

  const open = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  if (!categories.length) return null;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onMouseEnter={open}
        onMouseLeave={close}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          transition-all duration-200 select-none
          ${isOpen
            ? "bg-primary text-white shadow-md shadow-primary/25"
            : "bg-gray-100 text-gray-800 hover:bg-primary/10 hover:text-primary"
          }
        `}
      >
        <FiGrid className="w-4 h-4" />
        <span>Категории</span>
        <FiChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      <div
        onMouseEnter={open}
        onMouseLeave={close}
        className={`
          absolute left-0 top-full mt-2 z-50
          w-[640px] max-h-[70vh] overflow-y-auto
          bg-white rounded-2xl shadow-2xl shadow-black/10
          border border-gray-100
          grid grid-cols-3 gap-1 p-3
          origin-top-left
          transition-all duration-200 ease-out
          ${isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }
        `}
        style={{ willChange: "opacity, transform" }}
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            onClick={() => setIsOpen(false)}
            className="
              group flex items-center gap-3 p-3 rounded-xl
              transition-all duration-150
              hover:bg-primary/5 hover:shadow-sm
              active:scale-[0.98]
            "
          >
            {/* Category image */}
            <div className="
              relative w-12 h-12 flex-shrink-0
              rounded-xl overflow-hidden bg-gray-100
              ring-1 ring-gray-200/60
              group-hover:ring-primary/30
              transition-all duration-150
            ">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="48px"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <FiGrid className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Category name */}
            <span className="
              text-sm font-medium text-gray-700
              group-hover:text-primary
              transition-colors duration-150
              line-clamp-2 leading-tight
            ">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryMenu;
