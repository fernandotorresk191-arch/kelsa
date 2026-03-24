'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminDeliveryZonesApi } from '@/features/admin/api';
import { DeliveryZone } from '@/features/admin/types';
import { useAdmin } from '@/components/admin/AdminProvider';

interface ZoneFormData {
  settlement: string;
  deliveryFee: string;
  freeDeliveryFrom: string;
}

const initialFormData: ZoneFormData = {
  settlement: '',
  deliveryFee: '',
  freeDeliveryFrom: '',
};

export default function AdminDeliveryZonesPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAdmin();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [availableSettlements, setAvailableSettlements] = useState<Array<{ code: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Форма
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ZoneFormData>(initialFormData);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Удаление
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchZones = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      setFetchError(null);
      const [zonesData, settlements] = await Promise.all([
        adminDeliveryZonesApi.getZones(),
        adminDeliveryZonesApi.getAvailableSettlements(),
      ]);
      setZones(zonesData);
      setAvailableSettlements(settlements);
    } catch (error) {
      const err = error as { message?: string };
      setFetchError(err.message || 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchZones();
    }
  }, [fetchZones, isAuthLoading, isAuthenticated]);

  const handleOpenForm = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        settlement: zone.settlement,
        deliveryFee: String(zone.deliveryFee),
        freeDeliveryFrom: String(zone.freeDeliveryFrom),
      });
    } else {
      setEditingZone(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingZone && !formData.settlement) {
      errors.settlement = 'Выберите населённый пункт';
    }

    const fee = parseInt(formData.deliveryFee);
    if (!formData.deliveryFee || isNaN(fee) || fee < 0) {
      errors.deliveryFee = 'Укажите стоимость доставки';
    }

    const freeFrom = parseInt(formData.freeDeliveryFrom);
    if (!formData.freeDeliveryFrom || isNaN(freeFrom) || freeFrom < 0) {
      errors.freeDeliveryFrom = 'Укажите сумму для бесплатной доставки';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editingZone) {
        await adminDeliveryZonesApi.updateZone(editingZone.id, {
          deliveryFee: parseInt(formData.deliveryFee),
          freeDeliveryFrom: parseInt(formData.freeDeliveryFrom),
        });
      } else {
        await adminDeliveryZonesApi.createZone({
          settlement: formData.settlement,
          deliveryFee: parseInt(formData.deliveryFee),
          freeDeliveryFrom: parseInt(formData.freeDeliveryFrom),
        });
      }
      handleCloseForm();
      fetchZones();
    } catch (error) {
      const err = error as { message?: string };
      setFormErrors({ general: err.message || 'Ошибка при сохранении' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      await adminDeliveryZonesApi.updateZone(zone.id, { isActive: !zone.isActive });
      fetchZones();
    } catch (error) {
      console.error('Failed to toggle zone:', error);
    }
  };

  const handleDeleteClick = (zone: DeliveryZone) => {
    setZoneToDelete(zone);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    try {
      await adminDeliveryZonesApi.deleteZone(zoneToDelete.id);
      fetchZones();
    } catch (error) {
      console.error('Failed to delete zone:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setZoneToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Зоны доставки</h1>
          <p className="admin-page-subtitle">Управление тарифами доставки по населённым пунктам</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="admin-btn admin-btn-success"
          disabled={availableSettlements.length === 0 && !editingZone}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить зону
        </button>
      </div>

      {/* Таблица */}
      <div className="admin-card">
        {fetchError ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">⚠️</div>
            <div className="admin-empty-title text-red-600">Ошибка загрузки</div>
            <div className="admin-empty-text text-red-500">{fetchError}</div>
            <button onClick={fetchZones} className="admin-btn admin-btn-secondary mt-4">
              Повторить
            </button>
          </div>
        ) : isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : zones.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📍</div>
            <div className="admin-empty-title">Зоны доставки не настроены</div>
            <div className="admin-empty-text">Добавьте населённые пункты с тарифами доставки</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Населённый пункт</th>
                  <th>Тариф доставки</th>
                  <th>Бесплатная от</th>
                  <th>Статус</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      <div className="font-medium text-slate-800">{zone.settlementTitle}</div>
                      <div className="text-xs text-slate-400 font-mono">{zone.settlement}</div>
                    </td>
                    <td>
                      <span className="text-lg font-semibold text-slate-800">{zone.deliveryFee} ₽</span>
                    </td>
                    <td>
                      <span className="text-slate-700">{zone.freeDeliveryFrom} ₽</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(zone)}
                        className={`admin-badge cursor-pointer ${zone.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}
                      >
                        {zone.isActive ? 'Активна' : 'Отключена'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenForm(zone)}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(zone)}
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
        )}
      </div>

      {/* Модал формы */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="admin-card w-full max-w-lg">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                {editingZone ? 'Редактировать зону' : 'Добавить зону доставки'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="admin-card-body space-y-4">
                {formErrors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {formErrors.general}
                  </div>
                )}

                {/* Населённый пункт */}
                {!editingZone ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Населённый пункт *
                    </label>
                    <select
                      value={formData.settlement}
                      onChange={(e) => setFormData({ ...formData, settlement: e.target.value })}
                      className="admin-input"
                    >
                      <option value="">Выберите...</option>
                      {availableSettlements.map((s) => (
                        <option key={s.code} value={s.code}>{s.title}</option>
                      ))}
                    </select>
                    {formErrors.settlement && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.settlement}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Населённый пункт
                    </label>
                    <div className="admin-input bg-slate-50 text-slate-600">
                      {editingZone.settlementTitle}
                    </div>
                  </div>
                )}

                {/* Тариф доставки */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Тариф доставки (₽) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deliveryFee}
                    onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                    className="admin-input"
                    placeholder="200"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Также является оплатой курьеру за доставку
                  </p>
                  {formErrors.deliveryFee && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.deliveryFee}</p>
                  )}
                </div>

                {/* Бесплатная доставка от */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Бесплатная доставка от (₽) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.freeDeliveryFrom}
                    onChange={(e) => setFormData({ ...formData, freeDeliveryFrom: e.target.value })}
                    className="admin-input"
                    placeholder="2000"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Минимальная сумма заказа для бесплатной доставки
                  </p>
                  {formErrors.freeDeliveryFrom && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.freeDeliveryFrom}</p>
                  )}
                </div>
              </div>

              <div className="admin-card-footer flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="admin-btn admin-btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Сохранение...' : editingZone ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модал подтверждения удаления */}
      {showDeleteConfirm && zoneToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="admin-card w-full max-w-md">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Удаление зоны</h2>
            </div>
            <div className="admin-card-body">
              <p className="text-slate-600">
                Вы уверены, что хотите удалить зону доставки <strong>{zoneToDelete.settlementTitle}</strong>?
              </p>
              <p className="mt-2 text-sm text-red-500">
                Это действие нельзя отменить.
              </p>
            </div>
            <div className="admin-card-footer flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setZoneToDelete(null);
                }}
                className="admin-btn admin-btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="admin-btn admin-btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
