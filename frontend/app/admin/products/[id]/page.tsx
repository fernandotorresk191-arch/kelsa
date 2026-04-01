'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminProductsApi, adminCategoriesApi, adminUploadApi, adminPurchasesApi } from '@/features/admin/api';
import { Product, Category, Batch } from '@/features/admin/types';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useAdmin } from '@/components/admin/AdminProvider';

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
    subcategoryId: '',
    cellNumber: '',
    maxPerOrder: '10',
    weight: '',
    barcode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const { currentDarkstore } = useAdmin();

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
          subcategoryId: productData.subcategoryId || '',
          cellNumber: productData.cellNumber || '',
          maxPerOrder: productData.maxPerOrder !== undefined ? productData.maxPerOrder.toString() : '10',
          weight: productData.weight || '',
          barcode: productData.barcode || '',
        });
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchBatches = async () => {
      try {
        const data = await adminPurchasesApi.getProductBatches(productId);
        setBatches(data);
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      }
    };

    fetchProduct();
    fetchBatches();
  }, [productId, currentDarkstore?.id]);

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
        subcategoryId: formData.subcategoryId || undefined,
        cellNumber: formData.cellNumber || undefined,
        maxPerOrder: parseInt(formData.maxPerOrder) || 10,
        weight: formData.weight || undefined,
        barcode: formData.barcode || undefined,
      });
      
      // Возвращаемся с сохранением фильтров из URL
      const currentUrl = new URL(window.location.href);
      const params = new URLSearchParams(currentUrl.search);
      const returnUrl = params.toString() 
        ? `/admin/products?${params.toString()}` 
        : '/admin/products';
      router.push(returnUrl);
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
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  disabled={isSubmitting}
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Категория *
                  </label>
                  <select
                    id="edit-category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.filter(c => !c.parentId).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                    Подкатегория
                  </label>
                  <select
                    id="edit-subcategory"
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    disabled={!formData.categoryId || categories.filter(c => c.parentId === formData.categoryId).length === 0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Без подкатегории</option>
                    {categories.filter(c => c.parentId === formData.categoryId).map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <ImageUpload
                  label="Изображение товара"
                  currentImageUrl={formData.imageUrl || null}
                  onUpload={async (file) => {
                    if (!product) throw new Error('Product not found');
                    const result = await adminUploadApi.uploadProductImage(product.id, file);
                    setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
                    return result.imageUrl;
                  }}
                  onDelete={async () => {
                    if (!product) throw new Error('Product not found');
                    await adminUploadApi.deleteProductImage(product.id);
                    setFormData(prev => ({ ...prev, imageUrl: '' }));
                  }}
                  disabled={isSubmitting}
                />
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label htmlFor="edit-maxPerOrder" className="block text-sm font-medium text-gray-700 mb-1">
                    Макс. в одном заказе
                  </label>
                  <input
                    id="edit-maxPerOrder"
                    type="number"
                    min="0"
                    placeholder="0 = без лимита"
                    value={formData.maxPerOrder}
                    onChange={(e) => setFormData({ ...formData, maxPerOrder: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="mt-1 text-xs text-gray-400">0 — без ограничения</p>
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Вес / Объём
                  </label>
                  <input
                    id="edit-weight"
                    type="text"
                    placeholder="Например: 500 г, 1.5 л, 200 мл"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="edit-barcode" className="block text-sm font-medium text-gray-700 mb-1">
                    Штрихкод
                  </label>
                  <input
                    id="edit-barcode"
                    type="text"
                    placeholder="Например: 4607001234567"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
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

      {/* Блок «Поставки» — партии товара (FIFO) */}
      <ProductBatchesBlock batches={batches} />
    </div>
  );
}

/* ======================================================= */
/* Блок «Поставки» — визуализация партий товара (FIFO)     */
/* ======================================================= */

function ProductBatchesBlock({ batches }: { batches: Batch[] }) {
  // Фильтруем только релевантные партии (ACTIVE с остатком)
  const activeBatches = batches.filter(
    (b) => b.status === 'ACTIVE' && b.remainingQty > 0,
  );

  // Первая активная — это FIFO-активная (уже отсортированы по expiryDate ASC на бэкенде)
  const activeBatchId = activeBatches.length > 0 ? activeBatches[0].id : null;

  // Показываем ACTIVE + SOLD_OUT (последние 3), скрываем WRITTEN_OFF/EXPIRED
  const visibleBatches = batches.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'SOLD_OUT',
  );

  if (visibleBatches.length === 0) {
    return (
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <h3 className="admin-card-title flex items-center gap-2">
            <span>📦</span> Поставки
          </h3>
        </div>
        <div className="admin-card-body">
          <p className="text-sm text-gray-400 text-center py-6">
            У этого товара нет партий. Создайте закупку, чтобы добавить партии.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header flex items-center justify-between">
        <h3 className="admin-card-title flex items-center gap-2">
          <span>📦</span> Поставки
        </h3>
        <Link
          href="/admin/purchases"
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--admin-primary)' }}
        >
          Все →
        </Link>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {visibleBatches.map((batch) => (
          <BatchRow
            key={batch.id}
            batch={batch}
            isActive={batch.id === activeBatchId}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ Строка одной партии ============ */

function BatchRow({ batch, isActive }: { batch: Batch; isActive: boolean }) {
  const percent = batch.quantity > 0
    ? Math.round((batch.remainingQty / batch.quantity) * 100)
    : 0;

  // Цвет прогресс-бара: зелёный > 50%, жёлтый 20-50%, красный < 20%
  const barColor =
    percent > 50
      ? 'var(--admin-success)'
      : percent > 20
        ? 'var(--admin-warning)'
        : 'var(--admin-danger)';

  // Проверяем срок годности < 7 дней
  const daysUntilExpiry = batch.expiryDate
    ? Math.ceil(
        (new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  // Форматирование даты
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const statusLabel = batch.status === 'SOLD_OUT' ? 'РАСПРОДАНА' : isActive ? 'АКТИВНАЯ' : 'ОЖИДАЕТ';
  const statusBadgeClass =
    batch.status === 'SOLD_OUT'
      ? 'admin-badge admin-badge-gray'
      : isActive
        ? 'admin-badge admin-badge-success'
        : 'admin-badge admin-badge-warning';

  return (
    <div
      className="px-6 py-4"
      style={isActive ? { backgroundColor: 'rgba(16, 185, 129, 0.03)' } : undefined}
    >
      {/* Заголовок партии */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isActive && (
            <span style={{ color: 'var(--admin-success)', fontSize: 14 }}>▶</span>
          )}
          <Link
            href={`/admin/purchases`}
            className="font-mono text-sm font-semibold hover:underline"
            style={{ color: 'var(--admin-text-primary)' }}
          >
            Партия {batch.batchCode}
          </Link>
          <span className={statusBadgeClass}>{statusLabel}</span>
          {isExpiringSoon && (
            <span className="admin-badge admin-badge-danger">
              ⚠ Годен {daysUntilExpiry} дн.
            </span>
          )}
          {isExpired && (
            <span className="admin-badge admin-badge-danger">
              Просрочен
            </span>
          )}
        </div>
      </div>

      {/* Информация о закупке */}
      {batch.purchase && (
        <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
          Закупка #{batch.purchase.purchaseNumber} · {formatDate(batch.purchase.createdAt)}
        </p>
      )}

      {/* Цены */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Закупочная:{' '}
          <span className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
            {batch.purchasePrice} ₽
          </span>
        </span>
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Наценка:{' '}
          <span className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
            {batch.markupPercent}%
          </span>
        </span>
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Продажа:{' '}
          <span className="font-semibold" style={{ color: 'var(--admin-primary)' }}>
            {batch.sellingPrice} ₽
          </span>
        </span>
        {batch.discountPercent > 0 && (
          <span style={{ color: 'var(--admin-danger)' }}>
            Скидка: {batch.discountPercent}%
          </span>
        )}
      </div>

      {/* Остаток + Срок годности */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Остаток:{' '}
          <span className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
            {batch.remainingQty} из {batch.quantity}
          </span>
        </span>
        {batch.expiryDate && (
          <span style={{ color: 'var(--admin-text-secondary)' }}>
            Годен до:{' '}
            <span
              className="font-semibold"
              style={{
                color: isExpired
                  ? 'var(--admin-danger)'
                  : isExpiringSoon
                    ? 'var(--admin-warning)'
                    : 'var(--admin-text-primary)',
              }}
            >
              {formatDate(batch.expiryDate)}
            </span>
          </span>
        )}
      </div>

      {/* Прогресс-бар */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'var(--admin-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
        {percent}%
      </p>
    </div>
  );
}
