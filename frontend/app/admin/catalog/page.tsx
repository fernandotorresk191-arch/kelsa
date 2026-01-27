'use client';

import { useEffect, useState, Fragment } from 'react';
import { adminCategoriesApi, adminUploadApi } from '@/features/admin/api';
import { Category } from '@/features/admin/types';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { resolveMediaUrl } from '@/shared/api/media';

type CategoryWithCount = Category & { _count: { products: number; subcategories: number } };

export default function AdminCatalogPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [parentCategory, setParentCategory] = useState<CategoryWithCount | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Состояние удаления
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await adminCategoriesApi.getCategories(1, 100);
      setCategories(response.data);
      setAllCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteClick = (category: CategoryWithCount) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingId(categoryToDelete.id);
    try {
      await adminCategoriesApi.deleteCategory(categoryToDelete.id);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setParentCategory(null);
    setShowForm(true);
  };

  const handleAddSubcategory = (category: CategoryWithCount) => {
    setEditingCategory(null);
    setParentCategory(category);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCategory(null);
    setParentCategory(null);
    fetchCategories();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Группируем категории по родителям
  const rootCategories = categories.filter(cat => !cat.parentId);
  const getCategorySubcategories = (parentId: string) => 
    categories.filter(cat => cat.parentId === parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Управление каталогом</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setParentCategory(null);
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
          parentCategory={parentCategory}
          allCategories={allCategories}
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
                    Подкатегорий
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
                {rootCategories.map((category) => {
                  const subcategories = getCategorySubcategories(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const hasSubcategories = subcategories.length > 0;
                  
                  return (
                    <Fragment key={category.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            {hasSubcategories ? (
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className={`flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 transition-all duration-200 ${
                                  isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}
                                title={isExpanded ? 'Скрыть подкатегории' : 'Показать подкатегории'}
                              >
                                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                  ▶
                                </span>
                              </button>
                            ) : (
                              <span className="w-8"></span>
                            )}
                            <span>{category.sort}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {category.imageUrl && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={resolveMediaUrl(category.imageUrl) || ''}
                                alt={category.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <span className="font-medium text-gray-900">{category.name}</span>
                              {hasSubcategories && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({subcategories.length} {subcategories.length === 1 ? 'подкатегория' : 'подкатегорий'})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                          {category.slug}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {category._count.products}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasSubcategories ? (
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition cursor-pointer"
                              title={isExpanded ? 'Скрыть подкатегории' : 'Показать подкатегории'}
                            >
                              {category._count.subcategories} {isExpanded ? '▼' : '▶'}
                            </button>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-400">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {category.isActive ? (
                            <span className="text-xs font-medium text-green-600">✓ Активна</span>
                          ) : (
                            <span className="text-xs font-medium text-gray-400">○ Отключена</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              title="Редактировать"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddSubcategory(category)}
                              className="admin-btn admin-btn-success admin-btn-sm"
                              title="Добавить подкатегорию"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(category)}
                              disabled={deletingId === category.id}
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
                      {/* Подкатегории */}
                      {isExpanded && subcategories.map((subcategory) => (
                        <tr 
                          key={subcategory.id} 
                          className="hover:bg-blue-100/50 bg-blue-50/40 border-l-4 border-blue-400 animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                          <td className="px-6 py-4 text-gray-600">
                            <div className="flex items-center gap-2 pl-8">
                              <span className="text-blue-500 font-bold">↳</span>
                              <span>{subcategory.sort}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 pl-8">
                            <div className="flex items-center gap-3">
                              {subcategory.imageUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={resolveMediaUrl(subcategory.imageUrl) || ''}
                                  alt={subcategory.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              )}
                              <span className="font-medium text-gray-700">{subcategory.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                            <span className="text-blue-600">{subcategory.slug}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              {subcategory._count.products}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            -
                          </td>
                          <td className="px-6 py-4 text-center">
                            {subcategory.isActive ? (
                              <span className="text-xs font-medium text-green-600">✓ Активна</span>
                            ) : (
                              <span className="text-xs font-medium text-gray-400">○ Отключена</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(subcategory)}
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                title="Редактировать"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(subcategory)}
                                disabled={deletingId === subcategory.id}
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Удалить категорию?</h3>
              <p className="text-slate-600 text-sm">
                Вы уверены, что хотите удалить категорию <strong>{categoryToDelete.name}</strong>? Товары из этой категории останутся без категории.
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
                disabled={deletingId === categoryToDelete.id}
                className="flex-1 admin-btn admin-btn-danger"
              >
                {deletingId === categoryToDelete.id ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  parentCategory,
  allCategories,
  onSuccess,
  onCancel,
}: {
  category: CategoryWithCount | null;
  parentCategory: CategoryWithCount | null;
  allCategories: CategoryWithCount[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  // Для подкатегорий извлекаем базовый slug без префикса родителя
  const getBaseSlug = (fullSlug: string, parentSlug?: string) => {
    if (parentSlug && fullSlug.startsWith(parentSlug + '/')) {
      return fullSlug.substring(parentSlug.length + 1);
    }
    return fullSlug;
  };

  const initialSlug = category 
    ? (category.parentId 
        ? getBaseSlug(category.slug, allCategories.find(c => c.id === category.parentId)?.slug)
        : category.slug)
    : '';

  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: initialSlug,
    sort: category?.sort?.toString() || '0',
    imageUrl: category?.imageUrl || '',
    isActive: category?.isActive ?? true,
    parentId: category?.parentId || parentCategory?.id || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Получаем полный slug с учетом родителя
  const getFullSlug = () => {
    if (!formData.parentId) {
      return formData.slug;
    }
    const parent = allCategories.find(c => c.id === formData.parentId);
    if (parent) {
      return `${parent.slug}/${formData.slug}`;
    }
    return formData.slug;
  };

  // Проверка уникальности slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugError(null);
      return;
    }
    try {
      const fullSlug = getFullSlug();
      const result = await adminCategoriesApi.checkSlug(fullSlug, category?.id);
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
        parentId: formData.parentId || undefined,
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

  // Фильтруем список категорий для выбора родителя (только корневые категории)
  const rootCategories = allCategories.filter(cat => !cat.parentId && cat.id !== category?.id);

  const formTitle = category 
    ? 'Редактировать категорию' 
    : parentCategory 
    ? `Добавить подкатегорию для "${parentCategory.name}"` 
    : 'Добавить новую категорию';

  // Получаем родительскую категорию для отображения префикса
  const selectedParent = formData.parentId 
    ? allCategories.find(c => c.id === formData.parentId) 
    : parentCategory;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">{formTitle}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Выбор родительской категории */}
        {!parentCategory && (
          <div>
            <label htmlFor="parent-category" className="block text-sm font-medium text-gray-700 mb-1">
              Родительская категория (опционально)
            </label>
            <select
              id="parent-category"
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Корневая категория</option>
              {rootCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Если выбрана родительская категория, это будет подкатегория
            </p>
          </div>
        )}

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
              Slug * {selectedParent && <span className="text-gray-500">({selectedParent.slug}/)</span>}
            </label>
            {selectedParent && (
              <div className="mb-1 text-sm text-blue-600 font-mono">
                Полный slug: {selectedParent.slug}/{formData.slug || '...'}
              </div>
            )}
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
              placeholder={selectedParent ? "moloko (без префикса родителя)" : "molochnoe-i-yaytsa"}
              className={`w-full px-3 py-2 border rounded-lg ${
                slugError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {slugError && (
              <p className="text-red-600 text-sm mt-1">{slugError}</p>
            )}
            {selectedParent && (
              <p className="text-sm text-gray-500 mt-1">
                Префикс родительской категории будет добавлен автоматически
              </p>
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
            {category ? (
              <ImageUpload
                label="Изображение категории"
                currentImageUrl={formData.imageUrl || null}
                onUpload={async (file) => {
                  const result = await adminUploadApi.uploadCategoryImage(category.id, file);
                  setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
                  return result.imageUrl;
                }}
                onDelete={async () => {
                  await adminUploadApi.deleteCategoryImage(category.id);
                  setFormData(prev => ({ ...prev, imageUrl: '' }));
                }}
                disabled={isSubmitting}
              />
            ) : (
              <>
                <label htmlFor="category-image" className="block text-sm font-medium text-gray-700 mb-1">
                  URL изображения
                </label>
                <input
                  id="category-image"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Добавьте изображение после создания категории"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Загрузка изображения доступна после создания категории
                </p>
              </>
            )}
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
