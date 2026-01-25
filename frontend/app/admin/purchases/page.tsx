'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminPurchasesApi, adminProductsApi, adminCategoriesApi } from '@/features/admin/api';
import { Purchase, Product, Category } from '@/features/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CategoryWithCount = Category & { _count: { products: number } };

interface BatchItem {
  productId: string;
  productTitle: string;
  quantity: number;
  purchasePrice: number;
  cellNumber: string;
  expiryDate: string;
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Форма создания закупки
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BatchItem[]>([]);

  // Поиск товара
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [subcategories, setSubcategories] = useState<CategoryWithCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Выбранный товар для добавления
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [cellNumber, setCellNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const limit = 20;

  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const response = await adminPurchasesApi.getPurchases(page, limit);
      setPurchases(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await adminCategoriesApi.getCategories(1, 100);
      // Фильтруем только родительские категории
      const parentCategories = response.data.filter(c => !c.parentId);
      setCategories(parentCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await adminProductsApi.getProducts(1, 500);
      setProducts(response.data as unknown as Product[]);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchCategories();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Фильтрация подкатегорий при выборе категории
  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      // Приводим к типу CategoryWithCount
      const subs = (category?.subcategories || []).map(sub => ({
        ...sub,
        _count: { products: 0 }
      })) as CategoryWithCount[];
      setSubcategories(subs);
      setSelectedSubcategory('');
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory, categories]);

  // Фильтрация товаров
  useEffect(() => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(p => p.subcategoryId === selectedSubcategory);
    }

    if (productSearch) {
      const search = productSearch.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(search));
    }

    setFilteredProducts(filtered.slice(0, 20));
  }, [selectedCategory, selectedSubcategory, productSearch, products]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.title);
    setCellNumber(product.cellNumber || '');
    setShowProductDropdown(false);
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (!cellNumber) {
      alert('Укажите номер ячейки хранения');
      return;
    }
    if (quantity <= 0) {
      alert('Укажите количество');
      return;
    }
    if (purchasePrice <= 0) {
      alert('Укажите закупочную цену');
      return;
    }

    const newItem: BatchItem = {
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      quantity,
      purchasePrice: Math.round(purchasePrice * 100), // Конвертируем в копейки
      cellNumber,
      expiryDate,
    };

    setItems([...items, newItem]);

    // Сброс полей
    setSelectedProduct(null);
    setProductSearch('');
    setQuantity(1);
    setPurchasePrice(0);
    setCellNumber('');
    setExpiryDate('');
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreatePurchase = async () => {
    if (items.length === 0) {
      alert('Добавьте хотя бы одну позицию');
      return;
    }

    try {
      await adminPurchasesApi.createPurchase({
        supplierName: supplierName || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          cellNumber: item.cellNumber,
          expiryDate: item.expiryDate || undefined,
        })),
      });

      // Сброс формы
      setSupplierName('');
      setNotes('');
      setItems([]);
      setShowForm(false);
      fetchPurchases();
    } catch (error) {
      console.error('Failed to create purchase:', error);
      alert('Ошибка при создании закупки');
    }
  };

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Закупки</h1>
          <p className="text-gray-500">Управление закупками и партиями товаров</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Новая закупка'}
        </Button>
      </div>

      {/* Форма создания закупки */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold">Новая закупка</h2>

          {/* Информация о закупке */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Поставщик
              </label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Название поставщика"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Примечания
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Примечания к закупке"
              />
            </div>
          </div>

          {/* Добавление позиции */}
          <div className="border-t pt-4">
            <h3 className="text-md font-medium mb-4">Добавить позицию</h3>

            {/* Поиск товара */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория
                </label>
                <select
                  title="Выберите категорию"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Все категории</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Подкатегория
                  </label>
                  <select
                    title="Выберите подкатегорию"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                  >
                    <option value="">Все подкатегории</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Товар
                </label>
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                    setSelectedProduct(null);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Начните вводить название..."
                />
                {showProductDropdown && filteredProducts.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="font-medium">{product.title}</div>
                        <div className="text-sm text-gray-500">
                          Ячейка: {product.cellNumber || '—'} | Цена: {formatPrice(product.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Детали позиции */}
            {selectedProduct && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-4">
                  <div className="font-medium">{selectedProduct.title}</div>
                  <div className="text-sm text-gray-500">
                    Текущая цена: {formatPrice(selectedProduct.price)}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ячейка хранения *
                    </label>
                    <Input
                      value={cellNumber}
                      onChange={(e) => setCellNumber(e.target.value)}
                      placeholder="Например: A1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Закупочная цена (₽) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Срок годности
                    </label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleAddItem}>
                  Добавить позицию
                </Button>
              </div>
            )}
          </div>

          {/* Список добавленных позиций */}
          {items.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-4">Позиции закупки ({items.length})</h3>
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Товар</th>
                    <th className="px-4 py-2 text-center">Ячейка</th>
                    <th className="px-4 py-2 text-center">Кол-во</th>
                    <th className="px-4 py-2 text-right">Цена</th>
                    <th className="px-4 py-2 text-right">Сумма</th>
                    <th className="px-4 py-2 text-center">Срок годности</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{item.productTitle}</td>
                      <td className="px-4 py-2 text-center font-mono">{item.cellNumber}</td>
                      <td className="px-4 py-2 text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatPrice(item.purchasePrice)}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatPrice(item.purchasePrice * item.quantity)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {item.expiryDate ? formatDate(item.expiryDate) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-medium">
                      Итого:
                    </td>
                    <td className="px-4 py-2 text-right font-bold">
                      {formatPrice(items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleCreatePurchase}>
                  Создать закупку
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Список закупок */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">№ Закупки</th>
              <th className="px-4 py-3 text-left">Дата</th>
              <th className="px-4 py-3 text-left">Поставщик</th>
              <th className="px-4 py-3 text-center">Позиций</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Загрузка...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Закупок пока нет
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">
                      #{String(purchase.purchaseNumber).padStart(5, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(purchase.createdAt)}</td>
                  <td className="px-4 py-3">{purchase.supplierName || '—'}</td>
                  <td className="px-4 py-3 text-center">{purchase.batches.length}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(purchase.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/purchases/${purchase.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Просмотреть
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex justify-between items-center border-t">
            <div className="text-sm text-gray-500">
              Показано {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} из {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ←
              </Button>
              <span className="px-3 py-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
