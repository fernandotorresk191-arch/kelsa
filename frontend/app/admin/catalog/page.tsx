'use client';

import { useEffect, useState } from 'react';
import { adminCategoriesApi } from '@/features/admin/api';
import { Category } from '@/features/admin/types';

type CategoryWithCount = Category & { _count: { products: number } };

export default function AdminCatalogPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await adminCategoriesApi.getCategories(1, 100);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены? Товары из этой категории останутся без категории.')) return;

    try {
      await adminCategoriesApi.deleteCategory(id);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Управление каталогом</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '✕ Отмена' : '+ Добавить категорию'}
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <CategoryForm
          category={editingCategory}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Таблица категорий */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Загрузка...</div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Категории не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Порядок
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                    Товаров
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
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">
                      {category.sort}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {category.imageUrl && (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {category.slug}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {category._count.products}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {category.isActive ? (
                        <span className="text-xs font-medium text-green-600">✓ Активна</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">○ Отключена</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: {
  category: CategoryWithCount | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    sort: category?.sort?.toString() || '0',
    imageUrl: category?.imageUrl || '',
    isActive: category?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Проверка уникальности slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugError(null);
      return;
    }
    try {
      const result = await adminCategoriesApi.checkSlug(slug, category?.id);
      if (!result.available) {
        setSlugError(`Категория с таким slug уже существует. Измените slug.`);
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
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        name: formData.name,
        slug: formData.slug,
        sort: parseInt(formData.sort) || 0,
        imageUrl: formData.imageUrl || undefined,
        isActive: formData.isActive,
      };

      if (category) {
        await adminCategoriesApi.updateCategory(category.id, data);
      } else {
        await adminCategoriesApi.createCategory(data as Omit<Category, 'id'>);
      }
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при сохранении категории';
      if (errorMessage.includes('slug')) {
        setSlugError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">
        {category ? 'Редактировать категорию' : 'Добавить новую категорию'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              id="category-name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const newSlug = category ? formData.slug : generateSlug(name);
                setFormData({
                  ...formData,
                  name,
                  slug: newSlug,
                });
                if (!category) {
                  checkSlugAvailability(newSlug);
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="category-slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              id="category-slug"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category-sort" className="block text-sm font-medium text-gray-700 mb-1">
              Порядок сортировки
            </label>
            <input
              id="category-sort"
              type="number"
              value={formData.sort}
              onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="category-image" className="block text-sm font-medium text-gray-700 mb-1">
              URL изображения
            </label>
            <input
              id="category-image"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Активна</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Сохранение...' : category ? 'Сохранить' : 'Добавить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
