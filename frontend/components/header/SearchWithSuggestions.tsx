'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiSearch, FiX, FiClock, FiTrendingUp } from 'react-icons/fi';
import { Input } from '../ui/input';
import { catalogApi } from '@/features/catalog/api';
import type { ProductDto } from '@/features/catalog/types';
import { resolveMediaUrl } from '@/shared/api/media';

// Debounce hook для оптимизации запросов
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

// Локальное хранилище для истории поиска
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

// Форматирование цены (цена уже в рублях)
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function SearchWithSuggestions() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Загрузка истории при монтировании
  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  // Поиск подсказок при изменении запроса
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
          limit: 8,
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

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Сброс выбранного индекса при изменении подсказок
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleSubmit = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    addToSearchHistory(trimmed);
    setHistory(getSearchHistory());
    setIsOpen(false);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = query.trim().length >= 2 ? suggestions.length : history.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (query.trim().length >= 2 && suggestions[selectedIndex]) {
            router.push(`/product/${suggestions[selectedIndex].id}`);
            setIsOpen(false);
            setQuery('');
          } else if (history[selectedIndex]) {
            handleSubmit(history[selectedIndex]);
          }
        } else {
          handleSubmit(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const showDropdown = isOpen && (query.trim().length >= 2 || history.length > 0);

  return (
    <div ref={containerRef} className="relative flex-grow mx-6">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(query);
        }}
      >
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Поиск товаров..."
            className="pl-10 pr-10 rounded-full bg-accent/50 transition-all duration-200 focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-primary/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            aria-label="Поиск товаров"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Найти"
          >
            <FiSearch size={18} />
          </button>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Очистить"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Выпадающее меню */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Результаты поиска */}
          {query.trim().length >= 2 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-muted-foreground">Поиск...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Найдено товаров: {suggestions.length}
                    </span>
                  </div>
                  <ul aria-label="Результаты поиска" className="py-1">
                    {suggestions.map((product, index) => (
                      <li key={product.id}>
                        <Link
                          href={`/product/${product.id}`}
                          onClick={() => {
                            addToSearchHistory(query);
                            setHistory(getSearchHistory());
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            selectedIndex === index
                              ? 'bg-primary/5 border-l-2 border-primary'
                              : 'hover:bg-slate-50 border-l-2 border-transparent'
                          }`}
                        >
                          {/* Изображение товара */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            {product.imageUrl ? (
                              <Image
                                src={resolveMediaUrl(product.imageUrl) || ''}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <FiSearch size={20} />
                              </div>
                            )}
                          </div>
                          
                          {/* Информация о товаре */}
                          <div className="flex-grow min-w-0">
                            <div className="font-medium text-sm text-slate-800 truncate">
                              {product.title}
                            </div>
                            {product.category && (
                              <div className="text-xs text-muted-foreground truncate">
                                {product.category.name}
                                {product.subcategory && ` → ${product.subcategory.name}`}
                              </div>
                            )}
                          </div>
                          
                          {/* Цена */}
                          <div className="flex-shrink-0 text-right">
                            <div className="font-semibold text-sm text-primary">
                              {formatPrice(product.price)}
                            </div>
                            {product.oldPrice && product.oldPrice > product.price && (
                              <div className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.oldPrice)}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Ссылка на все результаты */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSubmit(query)}
                      className="w-full text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Показать все результаты →
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-2">🔍</div>
                  <div className="text-sm font-medium text-slate-600">Ничего не найдено</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Попробуйте изменить запрос
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* История поиска */
            history.length > 0 && (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <FiClock size={12} />
                    Недавние запросы
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
                <ul aria-label="История поиска">
                  {history.map((item, index) => (
                    <li 
                      key={item}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        selectedIndex === index
                          ? 'bg-primary/5 border-l-2 border-primary'
                          : 'hover:bg-slate-50 border-l-2 border-transparent'
                      }`}
                      onClick={() => handleSubmit(item)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(item)}
                    >
                      <FiTrendingUp size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
