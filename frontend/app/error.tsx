"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-purple-50/40 to-white">
      <div className="relative z-10 flex flex-col items-center text-center px-4 py-12">
        {/* Animated icon */}
        <div className="relative select-none mb-2">
          <span
            className="block text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent"
            aria-hidden
          >
            500
          </span>
          <span
            className="absolute inset-0 text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-purple-200/20 blur-sm -translate-x-1 translate-y-1"
            aria-hidden
          >
            500
          </span>
        </div>

        {/* Wrench emoji pulsing */}
        <div className="text-5xl mb-4 animate-bounce">🔧</div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Мы уже всё чиним!
        </h1>

        <p className="mt-3 text-base md:text-lg text-gray-500 max-w-md">
          Что-то пошло не так на нашей стороне. Команда уже работает над
          исправлением&nbsp;— скоро вернёмся в строй!
        </p>

        {/* Status card */}
        <div className="mt-8 flex items-center gap-3 bg-white rounded-2xl border border-purple-100 shadow-sm px-6 py-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>
          <span className="text-sm font-medium text-gray-700">
            Ведутся технические работы
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:-translate-y-0.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Попробовать снова
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 hover:-translate-y-0.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            На главную
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-400">
          Код ошибки: 500 · Внутренняя ошибка сервера
        </p>
      </div>
    </div>
  );
}
