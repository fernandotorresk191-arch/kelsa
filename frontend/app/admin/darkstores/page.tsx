'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminDarkstoresApi } from '@/features/admin/api';
import { Darkstore } from '@/features/admin/types';
import { ApiError } from '@/shared/api/http';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function DarkstoresPage() {
  const { admin, refreshDarkstores } = useAdmin();
  const [darkstores, setDarkstores] = useState<Darkstore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Darkstore | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminDarkstoresApi.list();
      setDarkstores(data);
    } catch {
      setError('Не удалось загрузить дарксторы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (admin?.role !== 'superadmin') {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-slate-500">Доступ запрещён. Только суперадмин может управлять дарксторами.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormName('');
    setFormAddress('');
    setError('');
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (ds: Darkstore) => {
    setEditing(ds);
    setFormName(ds.name);
    setFormAddress(ds.address || '');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editing) {
        await adminDarkstoresApi.update(editing.id, {
          name: formName,
          address: formAddress || undefined,
        });
      } else {
        await adminDarkstoresApi.create({
          name: formName,
          address: formAddress || undefined,
        });
      }
      setShowModal(false);
      load();
      refreshDarkstores();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.details || e?.message || 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDarkstoresApi.delete(id);
      setDeleteConfirm(null);
      load();
      refreshDarkstores();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.details || e?.message || 'Ошибка при удалении');
    }
  };

  const handleToggleActive = async (ds: Darkstore) => {
    try {
      await adminDarkstoresApi.update(ds.id, { isActive: !ds.isActive });
      load();
      refreshDarkstores();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Дарксторы</h1>
          <p className="text-sm text-slate-500 mt-1">
            Управление точками хранения и доставки
          </p>
        </div>
        <button
          onClick={openCreate}
          className="admin-btn admin-btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить даркстор
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Адрес</th>
              <th>Статус</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {darkstores.map(ds => (
              <tr key={ds.id}>
                <td className="font-medium">{ds.name}</td>
                <td>{ds.address || '—'}</td>
                <td>
                  <button
                    onClick={() => handleToggleActive(ds)}
                    className={`admin-badge cursor-pointer ${ds.isActive ? 'admin-status-completed' : 'admin-status-cancelled'}`}
                  >
                    {ds.isActive ? 'Активен' : 'Неактивен'}
                  </button>
                </td>
                <td className="text-sm text-slate-500">
                  {new Date(ds.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(ds)}
                      className="admin-btn admin-btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      Изменить
                    </button>
                    {deleteConfirm === ds.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(ds.id)}
                          className="admin-btn !py-1.5 !px-3 text-xs bg-red-500 text-white hover:bg-red-600"
                        >
                          Да
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="admin-btn admin-btn-secondary !py-1.5 !px-3 text-xs"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(ds.id)}
                        className="admin-btn !py-1.5 !px-3 text-xs text-red-500 hover:bg-red-50"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {darkstores.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">
                  Нет дарксторов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editing ? 'Редактировать даркстор' : 'Новый даркстор'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="admin-input w-full"
                  placeholder="Даркстор Центр"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Адрес</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="admin-input w-full"
                  placeholder="г. Грозный, ул. Ленина, 1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="admin-btn admin-btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn admin-btn-primary"
                >
                  {saving ? 'Сохранение...' : editing ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
