'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminProductsApi, adminCategoriesApi } from '@/features/admin/api';
import { Product, Category } from '@/features/admin/types';

type CategoryWithCount = Category & { _count: { products: number } };

export default function AdminProductDetailPage() {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    oldPrice: '',
    stock: '',
    imageUrl: '',
    isActive: true,
    categoryId: '',
    cellNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    setProductId(id);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await adminCategoriesApi.getCategories(1, 100);
        setCategories(response.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const data = await adminProductsApi.getProduct(productId);
        setProduct(data as Product);
        const productData = data as Product;
        setFormData({
          title: productData.title,
          description: productData.description || '',
          price: productData.price.toString(),
          oldPrice: productData.oldPrice ? productData.oldPrice.toString() : '',
          stock: productData.stock.toString(),
          imageUrl: productData.imageUrl || '',
          isActive: productData.isActive,
          categoryId: productData.categoryId || '',
          cellNumber: productData.cellNumber || '',
        });
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    try {
      setIsSubmitting(true);
      await adminProductsApi.updateProduct(product.id, {
        title: formData.title,
        description: formData.description,
        price: Math.round(parseFloat(formData.price)),
        oldPrice: formData.oldPrice ? Math.round(parseFloat(formData.oldPrice)) : undefined,
        stock: parseInt(formData.stock) || 0,
        imageUrl: formData.imageUrl,
        isActive: formData.isActive,
        categoryId: formData.categoryId || undefined,
        cellNumber: formData.cellNumber || undefined,
      });
      router.push('/admin/products');
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  if (!product) {
    return <div className="p-6 text-center text-red-600">Товар не найден</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Редактирование товара</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Назад
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Форма */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                />
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Категория
                </label>
                <select
                  id="edit-category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Без категории</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-image" className="block text-sm font-medium text-gray-700 mb-1">
                  URL изображения
                </label>
                <input
                  id="edit-image"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {formData.imageUrl && (
                  <div className="mt-3">
                    <Image
                      src={formData.imageUrl}
                      alt="preview"
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
                    Цена (руб.)
                  </label>
                  <input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="edit-oldprice" className="block text-sm font-medium text-gray-700 mb-1">
                    Старая цена (руб.)
                  </label>
                  <input
                    id="edit-oldprice"
                    type="number"
                    step="0.01"
                    value={formData.oldPrice}
                    onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Остаток (шт.)
                </label>
                <input
                  id="edit-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="edit-cell" className="block text-sm font-medium text-gray-700 mb-1">
                  Номер ячейки на складе
                </label>
                <input
                  id="edit-cell"
                  type="text"
                  placeholder="Например: A1-12"
                  value={formData.cellNumber}
                  onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is-active" className="ml-2 text-sm text-gray-700">Товар активен</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Сайдбар */}
        <div className="space-y-6">
          {/* Информация */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">Информация</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">SKU</p>
                <p className="font-mono text-gray-900">{product.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Slug</p>
                <p className="font-mono text-gray-900">{product.slug}</p>
              </div>
              <div>
                <p className="text-gray-600">Создан</p>
                <p className="text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Обновлен</p>
                <p className="text-gray-900">
                  {new Date(product.updatedAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          </div>

          {/* Быстрые действия */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">Остаток</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{formData.stock}</p>
              <p className="text-sm text-gray-600 mt-1">единиц в наличии</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
