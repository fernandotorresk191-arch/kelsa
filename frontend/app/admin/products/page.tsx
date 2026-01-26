
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminProductsApi, adminCategoriesApi } from '@/features/admin/api';
import { Product, Category } from '@/features/admin/types';

type CategoryWithCount = Category & { _count: { products: number } };

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  
  // Состояние удаления
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const limit = 20;

  const fetchCategories = async () => {
    try {
      const response = await adminCategoriesApi.getCategories(1, 100);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      // Используем подкатегорию если выбрана, иначе основную категорию
      const categoryToFilter = selectedSubcategory || selectedCategory;
      const response = await adminProductsApi.getProducts(
        page,
        limit,
        categoryToFilter || undefined,
        searchQuery || undefined
      );
      setProducts(response.data as unknown as Product[]);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Отдельный useEffect для восстановления фильтров из URL и загрузки товаров
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    const searchParam = searchParams.get('search');
    
    const newCategory = categoryParam || '';
    const newSubcategory = subcategoryParam || '';
    const newSearch = searchParam || '';
    
    setSelectedCategory(newCategory);
    setSelectedSubcategory(newSubcategory);
    setSearchQuery(newSearch);
    setSearchInput(newSearch);
    
    // Загружаем товары с актуальными параметрами из URL
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const categoryToFilter = newSubcategory || newCategory;
        const response = await adminProductsApi.getProducts(
          page,
          limit,
          categoryToFilter || undefined,
          newSearch || undefined
        );
        setProducts(response.data as unknown as Product[]);
        setTotal(response.pagination.total);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, [searchParams, page]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
    updateURL(selectedCategory, selectedSubcategory, searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    updateURL(selectedCategory, selectedSubcategory, '');
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setDeletingId(productToDelete.id);
    try {
      await adminProductsApi.deleteProduct(productToDelete.id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(''); // Сбрасываем подкатегорию при смене категории
    setPage(1);
    updateURL(categoryId, '', searchQuery);
  };

  const handleSubcategoryFilter = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setPage(1);
    updateURL(selectedCategory, subcategoryId, searchQuery);
  };

  const updateURL = (category: string, subcategory: string, search: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (search) params.set('search', search);
    
    const newURL = params.toString() ? `/admin/products?${params.toString()}` : '/admin/products';
    router.push(newURL, { scroll: false });
  };

  // Получаем корневые категории и подкатегории
  const rootCategories = categories.filter(cat => !cat.parentId);
  const subcategories = selectedCategory 
    ? categories.filter(cat => cat.parentId === selectedCategory)
    : [];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Управление товарами</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '✕ Отмена' : '+ Добавить товар'}
        </button>
      </div>

      {/* Форма добавления */}
      {showForm && (
        <AddProductForm
          categories={categories}
          onSuccess={() => {
            setShowForm(false);
            fetchProducts();
          }}
        />
      )}

      {/* Поиск */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск по названию, slug или ячейке..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            🔍 Найти
          </button>
          {searchQuery && (
            <span className="text-sm text-gray-600">
              Найдено: {total}
            </span>
          )}
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="space-y-3">
          {/* Корневые категории */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Фильтр по категории:</span>
            <button
              onClick={() => handleCategoryFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            {rootCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({category._count.products})
              </button>
            ))}
          </div>

          {/* Подкатегории (теги) */}
          {selectedCategory && subcategories.length > 0 && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600 mt-1.5">Подкатегории:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSubcategoryFilter('')}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedSubcategory === ''
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  Все из категории
                </button>
                {subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => handleSubcategoryFilter(subcategory.id)}
                    className={`px-3 py-1 rounded-full text-sm transition flex items-center gap-1 ${
                      selectedSubcategory === subcategory.id
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    <span>{subcategory.name}</span>
                    <span className="text-xs opacity-75">({subcategory._count.products})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Таблица товаров */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Товары не найдены</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                      Остаток
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-xs text-gray-500">{product.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        {product.category ? (
                          <div className="space-y-1">
                            <div>
                              <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm">
                                {product.category.name}
                              </span>
                            </div>
                            {product.subcategory && (
                              <div className="pl-1">
                                <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-sm">
                                  ↳ {product.subcategory.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            product.stock > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.stock} шт.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.isActive ? (
                          <span className="text-xs font-medium text-green-600">✓ Активен</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">○ Отключен</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${product.id}${
                              selectedCategory || selectedSubcategory || searchQuery
                                ? `?${new URLSearchParams({
                                    ...(selectedCategory && { category: selectedCategory }),
                                    ...(selectedSubcategory && { subcategory: selectedSubcategory }),
                                    ...(searchQuery && { search: searchQuery }),
                                  }).toString()}`
                                : ''
                            }`}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            disabled={deletingId === product.id}
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Показано {(page - 1) * limit + 1}-{Math.min(page * limit, total)} из {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  ← Назад
                </button>
                <span className="px-4 py-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Далее →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddProductForm({ categories, onSuccess }: { categories: CategoryWithCount[]; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    stock: '',
    imageUrl: '',
    categoryId: '',
    subcategoryId: '',
    cellNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Получаем список подкатегорий для выбранной категории
  const subcategories = categories.filter(c => c.parentId === formData.categoryId);
  const rootCategories = categories.filter(c => !c.parentId);

  // Автогенерация slug из названия
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Проверка уникальности slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugError(null);
      return;
    }
    try {
      const result = await adminProductsApi.checkSlug(slug);
      if (!result.available) {
        setSlugError(`Товар с таким slug уже существует. Измените slug.`);
      } else {
        setSlugError(null);
      }
    } catch {
      // Игнорируем ошибки при проверке
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) {
      setError('Исправьте ошибки в форме перед сохранением.');
      return;
    }

    // Проверяем, что выбрана категория
    if (!formData.categoryId) {
      setError('Категория обязательна для заполнения');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await adminProductsApi.createProduct({
        ...formData,
        price: Math.round(parseFloat(formData.price)),
        stock: parseInt(formData.stock) || 0,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || undefined,
        cellNumber: formData.cellNumber || undefined,
        isActive: true,
      } as unknown as Parameters<typeof adminProductsApi.createProduct>[0]);
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при создании товара';
      if (errorMessage.includes('slug')) {
        setSlugError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">Добавить новый товар</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-title" className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              id="product-title"
              type="text"
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value;
                const newSlug = generateSlug(title);
                setFormData({
                  ...formData,
                  title,
                  slug: newSlug,
                });
                checkSlugAvailability(newSlug);
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="product-slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              id="product-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => {
                const newSlug = e.target.value;
                setFormData({ ...formData, slug: newSlug });
                checkSlugAvailability(newSlug);
              }}
              required
              className={`w-full px-3 py-2 border rounded-lg ${
                slugError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {slugError && (
              <p className="text-red-600 text-sm mt-1">{slugError}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
              Категория *
            </label>
            <select
              id="product-category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Выберите категорию</option>
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Обязательное поле</p>
          </div>

          <div>
            <label htmlFor="product-subcategory" className="block text-sm font-medium text-gray-700 mb-1">
              Подкатегория
            </label>
            <select
              id="product-subcategory"
              value={formData.subcategoryId}
              onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
              disabled={!formData.categoryId || subcategories.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Без подкатегории</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {!formData.categoryId 
                ? 'Сначала выберите категорию' 
                : subcategories.length === 0 
                ? 'Нет подкатегорий для выбранной категории'
                : 'Необязательное поле'}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            id="product-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
              Цена (руб.) *
            </label>
            <input
              id="product-price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 mb-1">
              Остаток (шт.)
            </label>
            <input
              id="product-stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="product-cell" className="block text-sm font-medium text-gray-700 mb-1">
              Номер ячейки
            </label>
            <input
              id="product-cell"
              type="text"
              placeholder="Например: A1-12"
              value={formData.cellNumber}
              onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="product-image" className="block text-sm font-medium text-gray-700 mb-1">
              URL изображения
            </label>
            <input
              id="product-image"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Добавьте через редактирование"
            />
            <p className="text-xs text-gray-500 mt-1">
              Загрузка файла доступна после создания товара
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Добавление...' : 'Добавить товар'}
          </button>
        </div>
      </form>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Удалить товар?</h3>
              <p className="text-slate-600 text-sm">
                Вы уверены, что хотите удалить товар <strong>{productToDelete.title}</strong>? Это действие нельзя отменить.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 admin-btn admin-btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === productToDelete.id}
                className="flex-1 admin-btn admin-btn-danger"
              >
                {deletingId === productToDelete.id ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
