"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ─── Анимированные продукты, «падающие» по фону ─── */
const EMOJIS = ["🥑", "🍎", "🧀", "🥖", "🍕", "🥛", "🍇", "🥕", "🍋", "🧁", "🍩", "🍫", "🥚", "🍌", "🫐", "🍒"];

interface Particle {
  id: number;
  emoji: string;
  left: number;   // %
  delay: number;   // s
  duration: number; // s
  size: number;     // rem
  rotate: number;   // deg
}

function FallingProducts() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 1.2 + Math.random() * 1.6,
      rotate: Math.random() * 360,
    }));
    setParticles(items);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-fall opacity-0"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

/* ─── Animated "404" with glitch effect ─── */
function Glitch404() {
  return (
    <div className="relative select-none">
      <span
        className="block text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent"
        aria-hidden
      >
        404
      </span>
      {/* Shadow layers for depth */}
      <span
        className="absolute inset-0 text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-purple-200/20 blur-sm -translate-x-1 translate-y-1"
        aria-hidden
      >
        404
      </span>
    </div>
  );
}

/* ─── Search bar on 404 page ─── */
function QuickSearch() {
  const [query, setQuery] = useState("");

  return (
    <form
      action="/search"
      method="GET"
      className="flex items-center w-full max-w-md mx-auto mt-2 rounded-full border-2 border-purple-200 bg-white/80 backdrop-blur-sm overflow-hidden transition-all focus-within:border-purple-500 focus-within:shadow-lg focus-within:shadow-purple-100"
    >
      <input
        type="text"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Найти товар..."
        className="flex-1 px-5 py-3 text-sm bg-transparent outline-none placeholder:text-gray-400"
      />
      <button
        type="submit"
        className="px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 transition-all"
      >
        Найти
      </button>
    </form>
  );
}

/* ─── Main 404 page ─── */
export default function NotFound() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-purple-50/40 to-white">
      <FallingProducts />

      <div className="relative z-10 flex flex-col items-center text-center px-4 py-12">
        <Glitch404 />

        <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">
          Упс! Страница потерялась
        </h1>

        <p className="mt-3 text-base md:text-lg text-gray-500 max-w-md">
          Похоже, эта страница убежала с полки. Но не переживайте — у нас ещё
          много вкусного!
        </p>

        {/* Search */}
        <div className="w-full mt-8">
          <QuickSearch />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:-translate-y-0.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            На главную
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 hover:-translate-y-0.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Каталог
          </Link>
        </div>

        {/* Fun suggestion */}
        <p className="mt-10 text-xs text-gray-400">
          Код ошибки: 404 · Товар не найден · Попробуйте поискать на главной
        </p>
      </div>

      {/* CSS for falling animation */}
      <style jsx global>{`
        @keyframes fall {
          0% {
            opacity: 0;
            transform: translateY(-60px) rotate(0deg);
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: translateY(calc(80vh + 60px)) rotate(360deg);
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
}
