'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiSearch, FiX, FiClock, FiArrowLeft, FiTrendingUp } from 'react-icons/fi';
import { catalogApi } from '@/features/catalog/api';
import type { ProductDto } from '@/features/catalog/types';
import { resolveMediaUrl } from '@/shared/api/media';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// История поиска
const HISTORY_KEY = 'kelsa_search_history';
const MAX_HISTORY = 5;

function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((item) => item.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

// Форматирование цены
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void; // Вызывается при навигации для закрытия родительского меню
}

export default function MobileSearch({ isOpen, onClose, onNavigate }: MobileSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Загрузка истории и фокус при открытии
  useEffect(() => {
    if (isOpen) {
      setHistory(getSearchHistory());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // Поиск подсказок
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const products = await catalogApi.products({
          q: debouncedQuery,
          limit: 10,
          offset: 0,
        });
        setSuggestions(products);
      } catch (error) {
        console.error('Ошибка поиска:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSubmit = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    addToSearchHistory(trimmed);
    setHistory(getSearchHistory());
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onClose();
    onNavigate?.();
  }, [router, onClose, onNavigate]);

  const handleProductClick = useCallback((productId: string) => {
    if (query.trim()) {
      addToSearchHistory(query);
    }
    router.push(`/product/${productId}`);
    onClose();
    onNavigate?.();
  }, [query, router, onClose, onNavigate]);

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white sticky top-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Назад"
        >
          <FiArrowLeft size={22} />
        </button>
        
        <form
          className="flex-grow relative"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(query);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Что вы ищете?"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <FiSearch 
            size={18} 
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Очистить"
            >
              <FiX size={18} />
            </button>
          )}
        </form>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        {query.trim().length >= 2 ? (
          // Результаты поиска
          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="mt-3 text-sm text-slate-500">Ищем товары...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 sticky top-0">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Найдено: {suggestions.length}
                  </span>
                </div>
                <ul>
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => handleProductClick(product.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 active:bg-slate-50 transition-colors text-left"
                      >
                        {/* Изображение */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {product.imageUrl ? (
                            <Image
                              src={resolveMediaUrl(product.imageUrl) || ''}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <FiSearch size={20} />
                            </div>
                          )}
                        </div>
                        
                        {/* Информация */}
                        <div className="flex-grow min-w-0">
                          <div className="font-medium text-sm text-slate-800 line-clamp-2 leading-snug">
                            {product.title}
                          </div>
                          {product.category && (
                            <div className="text-xs text-slate-500 mt-0.5 truncate">
                              {product.category.name}
                              {product.subcategory && ` → ${product.subcategory.name}`}
                            </div>
                          )}
                        </div>
                        
                        {/* Цена */}
                        <div className="flex-shrink-0 text-right">
                          <div className="font-bold text-base text-primary">
                            {formatPrice(product.price)}
                          </div>
                          {product.oldPrice && product.oldPrice > product.price && (
                            <div className="text-xs text-slate-400 line-through">
                              {formatPrice(product.oldPrice)}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                
                {/* Показать все */}
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => handleSubmit(query)}
                    className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm active:bg-primary/90 transition-colors"
                  >
                    Показать все результаты
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FiSearch size={28} className="text-slate-400" />
                </div>
                <div className="text-lg font-medium text-slate-700 mb-1">Ничего не найдено</div>
                <div className="text-sm text-slate-500 text-center">
                  Попробуйте изменить запрос или проверьте написание
                </div>
              </div>
            )}
          </div>
        ) : (
          // История и подсказки
          <div>
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <FiClock size={14} />
                    Недавние запросы
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
                <ul>
                  {history.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => handleSubmit(item)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 active:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FiTrendingUp size={14} className="text-slate-500" />
                        </div>
                        <span className="text-sm text-slate-700">{item}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Популярные категории */}
            <div className="px-4 py-4">
              <div className="text-sm font-medium text-slate-600 mb-3">
                Попробуйте поискать
              </div>
              <div className="flex flex-wrap gap-2">
                {['Молоко', 'Хлеб', 'Яйца', 'Сыр', 'Масло', 'Йогурт'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSubmit(term)}
                    className="px-4 py-2 rounded-full bg-slate-100 text-sm text-slate-700 active:bg-slate-200 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
