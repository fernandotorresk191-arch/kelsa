'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminCouriersApi } from '@/features/admin/api';
import { Courier } from '@/features/admin/types';
import { useAdmin } from '@/components/admin/AdminProvider';

interface CourierFormData {
  fullName: string;
  login: string;
  password: string;
  phone: string;
  carBrand: string;
  carNumber: string;
  isActive: boolean;
}

const initialFormData: CourierFormData = {
  fullName: '',
  login: '',
  password: '',
  phone: '',
  carBrand: '',
  carNumber: '',
  isActive: true,
};

// Функция форматирования телефона в российский формат
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
  const limited = normalized.slice(0, 11);
  
  if (limited.length === 0) return '';
  if (limited.length <= 1) return `+${limited}`;
  if (limited.length <= 4) return `+${limited.slice(0, 1)} (${limited.slice(1)}`;
  if (limited.length <= 7) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
  if (limited.length <= 9) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`;
  return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 9)}-${limited.slice(9, 11)}`;
};

// Функция валидации телефона
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'));
};

export default function AdminCouriersPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAdmin();
  const router = useRouter();
  
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Состояние формы
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CourierFormData>(initialFormData);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Состояние удаления
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  
  // Состояние ошибки загрузки
  const [fetchError, setFetchError] = useState<string | null>(null);

  const limit = 20;

  const fetchCouriers = useCallback(async () => {
    // Не загружаем данные пока не авторизованы
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setFetchError(null);
      const response = await adminCouriersApi.getCouriers(page, limit, searchQuery || undefined);
      setCouriers(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      const err = error as { message?: string; details?: string };
      const errorMessage = err.message || 'Неизвестная ошибка';
      console.error('Failed to fetch couriers:', errorMessage, err.details || '');
      setFetchError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, isAuthenticated]);

  useEffect(() => {
    // Загружаем только когда авторизация проверена и пользователь авторизован
    if (!isAuthLoading && isAuthenticated) {
      fetchCouriers();
    }
  }, [fetchCouriers, isAuthLoading, isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleOpenForm = (courier?: Courier) => {
    if (courier) {
      setEditingCourier(courier);
      setFormData({
        fullName: courier.fullName,
        login: courier.login,
        password: '',
        phone: courier.phone || '',
        carBrand: courier.carBrand || '',
        carNumber: courier.carNumber || '',
        isActive: courier.isActive,
      });
    } else {
      setEditingCourier(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCourier(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Введите ФИО курьера';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'ФИО должно содержать минимум 2 символа';
    }

    if (!formData.login.trim()) {
      errors.login = 'Введите логин';
    } else if (formData.login.trim().length < 3) {
      errors.login = 'Логин должен содержать минимум 3 символа';
    }

    if (!editingCourier && !formData.password) {
      errors.password = 'Введите пароль';
    } else if (formData.password && formData.password.length < 4) {
      errors.password = 'Пароль должен содержать минимум 4 символа';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Введите номер телефона';
    } else if (!isValidPhone(formData.phone)) {
      errors.phone = 'Введите корректный номер телефона';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const normalizedPhone = phoneDigits.startsWith('8') ? '7' + phoneDigits.slice(1) : phoneDigits;

      if (editingCourier) {
        const updateData: {
          fullName?: string;
          login?: string;
          password?: string;
          phone?: string;
          carBrand?: string;
          carNumber?: string;
          isActive?: boolean;
        } = {
          fullName: formData.fullName.trim(),
          login: formData.login.trim(),
          phone: normalizedPhone,
          carBrand: formData.carBrand.trim() || undefined,
          carNumber: formData.carNumber.trim() || undefined,
          isActive: formData.isActive,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await adminCouriersApi.updateCourier(editingCourier.id, updateData);
      } else {
        await adminCouriersApi.createCourier({
          fullName: formData.fullName.trim(),
          login: formData.login.trim(),
          password: formData.password,
          phone: normalizedPhone,
          carBrand: formData.carBrand.trim() || undefined,
          carNumber: formData.carNumber.trim() || undefined,
          isActive: formData.isActive,
        });
      }

      handleCloseForm();
      fetchCouriers();
    } catch (error: unknown) {
      const err = error as { message?: string; details?: string; status?: number };
      console.error('Failed to save courier:', err.message, err.details || '');
      
      if (err.message?.includes('логин') || err.details?.includes('логин')) {
        setFormErrors({ login: 'Курьер с таким логином уже существует' });
      } else if (err.status === 401 || err.message?.includes('Unauthorized') || err.message?.includes('token')) {
        setFormErrors({ general: 'Ошибка авторизации. Пожалуйста, перезайдите в систему.' });
      } else if (err.status === 0 || err.message?.includes('недоступен')) {
        setFormErrors({ general: 'Сервер недоступен. Проверьте подключение.' });
      } else {
        setFormErrors({ general: err.message || 'Ошибка при сохранении курьера' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (courier: Courier) => {
    setCourierToDelete(courier);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!courierToDelete) return;

    setDeletingId(courierToDelete.id);
    try {
      await adminCouriersApi.deleteCourier(courierToDelete.id);
      fetchCouriers();
    } catch (error) {
      console.error('Failed to delete courier:', error);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setCourierToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setCourierToDelete(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Курьеры</h1>
          <p className="admin-page-subtitle">Управление курьерами доставки</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="admin-btn admin-btn-success"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить курьера
        </button>
      </div>

      {/* Фильтры */}
      <div className="admin-card">
        <div className="admin-card-body">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Поиск по ФИО или логину..."
                className="admin-input pl-10"
              />
            </div>
            <button type="submit" className="admin-btn admin-btn-secondary">
              Найти
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="admin-btn admin-btn-secondary"
              >
                Сбросить
              </button>
            )}
            <div className="flex-1" />
            <span className="text-sm text-slate-500">
              Всего: <strong>{total}</strong> курьеров
            </span>
          </form>
        </div>
      </div>

      {/* Таблица курьеров */}
      <div className="admin-card">
        {fetchError ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">⚠️</div>
            <div className="admin-empty-title text-red-600">Ошибка загрузки</div>
            <div className="admin-empty-text text-red-500">{fetchError}</div>
            <button
              onClick={() => fetchCouriers()}
              className="admin-btn admin-btn-secondary mt-4"
            >
              Повторить
            </button>
          </div>
        ) : isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : couriers.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">🚚</div>
            <div className="admin-empty-title">
              {searchQuery ? 'Курьеры не найдены' : 'Список курьеров пуст'}
            </div>
            <div className="admin-empty-text">
              {searchQuery ? 'Попробуйте изменить параметры поиска' : 'Добавьте первого курьера'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Телефон</th>
                    <th>Автомобиль</th>
                    <th>Статус</th>
                    <th className="text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {couriers.map((courier) => (
                    <tr key={courier.id}>
                      <td>
                        <div className="font-medium text-slate-800">{courier.fullName}</div>
                      </td>
                      <td>
                        <span className="font-mono text-sm text-indigo-600">{courier.login}</span>
                      </td>
                      <td>
                        <span className="text-slate-600">{formatPhoneNumber(courier.phone)}</span>
                      </td>
                      <td>
                        {courier.carBrand || courier.carNumber ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700">{courier.carBrand || '—'}</span>
                            {courier.carNumber && (
                              <span className="admin-badge admin-badge-gray font-mono text-xs">
                                {courier.carNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Без автомобиля</span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${courier.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                          {courier.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/couriers/${courier.id}`)}
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            title="Открыть профиль"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Открыть
                          </button>
                          <button
                            onClick={() => handleOpenForm(courier)}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(courier)}
                            disabled={deletingId === courier.id}
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
            {totalPages > 1 && (
              <div className="admin-card-body border-t border-slate-200 flex items-center justify-between">
                <div className="admin-pagination-info">
                  Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
                </div>
                <div className="admin-pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="admin-pagination-btn"
                  >
                    ← Назад
                  </button>
                  <span className="admin-pagination-info">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="admin-pagination-btn"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно формы */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingCourier ? 'Редактирование курьера' : 'Новый курьер'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Закрыть"
                aria-label="Закрыть форму"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formErrors.general}
                </div>
              )}

              {/* ФИО */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ФИО курьера <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`admin-input ${formErrors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="Иванов Иван Иванович"
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.fullName}</p>
                )}
              </div>

              {/* Логин */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Логин <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  className={`admin-input ${formErrors.login ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="courier1"
                />
                {formErrors.login && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.login}</p>
                )}
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Пароль {!editingCourier && <span className="text-red-500">*</span>}
                  {editingCourier && <span className="text-slate-400 text-xs ml-1">(оставьте пустым, чтобы не менять)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`admin-input ${formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder={editingCourier ? '••••••••' : 'Введите пароль'}
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
                )}
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Номер телефона <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  className={`admin-input ${formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="+7 (999) 123-45-67"
                />
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>
                )}
              </div>

              {/* Автомобиль */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Марка автомобиля
                  </label>
                  <input
                    type="text"
                    value={formData.carBrand}
                    onChange={(e) => setFormData({ ...formData, carBrand: e.target.value })}
                    className="admin-input"
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Номер автомобиля
                  </label>
                  <input
                    type="text"
                    value={formData.carNumber}
                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                    className="admin-input"
                    placeholder="А123БВ95"
                  />
                </div>
              </div>

              {/* Статус */}
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                    aria-label="Статус активности курьера"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className="text-sm text-slate-600">
                  {formData.isActive ? 'Курьер активен' : 'Курьер неактивен'}
                </span>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 admin-btn admin-btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 admin-btn admin-btn-primary"
                >
                  {isSaving ? 'Сохранение...' : editingCourier ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && courierToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Удалить курьера?</h3>
              <p className="text-slate-600 text-sm">
                Вы уверены, что хотите удалить курьера <strong>{courierToDelete.fullName}</strong>? Это действие нельзя отменить.
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
                disabled={deletingId === courierToDelete.id}
                className="flex-1 admin-btn admin-btn-danger"
              >
                {deletingId === courierToDelete.id ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
