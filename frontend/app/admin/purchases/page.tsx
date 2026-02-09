'use client';

import { useEffect, useState, useRef } from 'react';
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
  markupPercent: number;
  sellingPrice: number;
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Выбранный товар для добавления
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [cellNumber, setCellNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const limit = 20;

  // Закрытие dropdown при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    // Автозаполнение наценки из категории/подкатегории
    const cat = categories.find(c => c.id === product.categoryId);
    const sub = cat?.subcategories?.find(s => s.id === product.subcategoryId);
    const defaultMarkup = sub?.markupPercent ?? cat?.markupPercent ?? 0;
    setMarkupPercent(defaultMarkup);
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

    const sellingPrice = Math.round(purchasePrice * (1 + markupPercent / 100));

    const newItem: BatchItem = {
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      quantity,
      purchasePrice,
      markupPercent,
      sellingPrice,
      cellNumber,
      expiryDate,
    };

    setItems([...items, newItem]);

    // Сброс полей
    setSelectedProduct(null);
    setProductSearch('');
    setQuantity(1);
    setPurchasePrice(0);
    setMarkupPercent(0);
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
          markupPercent: item.markupPercent,
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

  const formatPrice = (rubles: number) => {
    return rubles.toLocaleString('ru-RU') + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Закупки</h1>
          <p className="admin-page-subtitle">Управление закупками и партиями товаров</p>
        </div>
        <button 
          className={`admin-btn ${showForm ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Отмена' : '+ Новая закупка'}
        </button>
      </div>

      {/* Форма создания закупки */}
      {showForm && (
        <div className="admin-card admin-card-overflow-visible admin-fade-in">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Новая закупка</h2>
          </div>
          <div className="admin-card-body space-y-6">

          {/* Информация о закупке */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Поставщик
              </label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Название поставщика"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
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

              <div ref={dropdownRef} className="relative" style={{ overflow: 'visible' }}>
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
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
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

                <div className="grid grid-cols-5 gap-4">
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
                      step="1"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Наценка (%)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                    />
                    {purchasePrice > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Цена продажи: {Math.round(purchasePrice * (1 + markupPercent / 100))} ₽
                      </div>
                    )}
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
                    <th className="px-4 py-2 text-right">Закуп.</th>
                    <th className="px-4 py-2 text-center">Наценка</th>
                    <th className="px-4 py-2 text-right">Продажа</th>
                    <th className="px-4 py-2 text-right">Сумма закуп.</th>
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
                      <td className="px-4 py-2 text-center">
                        <span className="admin-badge admin-badge-gray">{item.markupPercent}%</span>
                      </td>
                      <td className="px-4 py-2 text-right text-green-700 font-medium">
                        {formatPrice(item.sellingPrice)}
                      </td>
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
                    <td colSpan={6} className="px-4 py-2 text-right font-medium">
                      Итого закуп.:
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
          </div>
      )}

      {/* Список закупок */}
      <div className="admin-card">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📥</div>
            <div className="admin-empty-title">Закупок пока нет</div>
            <div className="admin-empty-text">Создайте первую закупку</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>№ Закупки</th>
                    <th>Дата</th>
                    <th>Поставщик</th>
                    <th className="text-center">Позиций</th>
                    <th className="text-right">Сумма</th>
                    <th className="admin-th-actions">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <span className="font-mono font-semibold text-indigo-600">
                          #{String(purchase.purchaseNumber).padStart(5, '0')}
                        </span>
                      </td>
                      <td className="text-slate-600">{formatDate(purchase.createdAt)}</td>
                      <td className="font-medium">{purchase.supplierName || '—'}</td>
                      <td className="text-center">
                        <span className="admin-badge admin-badge-gray">{purchase.batches.length}</span>
                      </td>
                      <td className="text-right font-semibold text-slate-800">
                        {formatPrice(purchase.totalAmount)}
                      </td>
                      <td>
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                        >
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="admin-card-body border-t border-slate-200 flex items-center justify-between">
                <div className="admin-pagination-info">
                  Показано {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} из {total}
                </div>
                <div className="admin-pagination">
                  <button
                    className="admin-pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Назад
                  </button>
                  <span className="admin-pagination-info">
                    {page} / {totalPages}
                  </span>
                  <button
                    className="admin-pagination-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
