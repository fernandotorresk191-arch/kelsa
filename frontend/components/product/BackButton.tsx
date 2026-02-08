"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center justify-center w-10 h-10 rounded-full
                 border border-gray-200 bg-white text-gray-700
                 shadow-sm hover:shadow-md hover:border-gray-300
                 active:scale-95 transition-all duration-200 ease-out
                 shrink-0"
      aria-label="Назад"
    >
      <FiArrowLeft size={20} strokeWidth={2} />
    </button>
  );
}
