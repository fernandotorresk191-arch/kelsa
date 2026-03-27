"use client";

import { useState, useEffect, use } from "react";
import { kopilkaApi } from "@/features/kopilka/api";
import type { Kopilka } from "@/features/kopilka/types";
import KopilkaView from "@/components/kopilka/KopilkaView";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export default function KopilkaSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [kopilka, setKopilka] = useState<Kopilka | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const k = await kopilkaApi.get(id);
        setKopilka(k);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="kelsa-container py-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6206c7]/10 mb-4 animate-pulse">
          <span className="text-2xl">🐷</span>
        </div>
        <p className="text-gray-400">Загрузка копилки...</p>
      </div>
    );
  }

  if (error || !kopilka) {
    return (
      <div className="kelsa-container py-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
          <span className="text-2xl">😔</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Копилка не найдена
        </h2>
        <p className="text-gray-500 mb-6">
          Возможно, ссылка устарела или копилка была удалена
        </p>
        <Link
          href="/kopilka"
          className="inline-flex items-center gap-2 text-[#6206c7] hover:text-[#5205A8] font-medium"
        >
          <FiArrowLeft size={16} /> Перейти к копилкам
        </Link>
      </div>
    );
  }

  // Check if this is the owner (has it in localStorage)
  let isOwner = false;
  if (typeof window !== "undefined") {
    try {
      const ids: string[] = JSON.parse(
        localStorage.getItem("kelsa_kopilka_ids") || "[]"
      );
      isOwner = ids.includes(kopilka.shareId);
    } catch {
      // ignore
    }
  }

  return (
    <div className="kelsa-container py-6 pb-16">
      <Link
        href="/kopilka"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6206c7] transition-colors mb-4"
      >
        <FiArrowLeft size={14} /> Все копилки
      </Link>
      <KopilkaView kopilka={kopilka} isReadonly={!isOwner} />
    </div>
  );
}
