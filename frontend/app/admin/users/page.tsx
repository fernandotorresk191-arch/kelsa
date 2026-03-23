'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminAuthApi } from '@/features/admin/api';
import { AdminUser } from '@/features/admin/types';
import { ApiError } from '@/shared/api/http';
import { useAdmin } from '@/components/admin/AdminProvider';
import { ALL_SECTIONS } from '../layout';

export default function UsersPage() {
  const { admin } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'manager'>('manager');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAuthApi.listUsers();
      setUsers(data);
    } catch {
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Restrict page to admin role only
  if (admin?.role !== 'admin') {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-slate-500">Доступ запрещён. Только администратор может управлять пользователями.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('manager');
    setFormPermissions([]);
    setError('');
  };

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormPhone(user.phone || '');
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormPermissions(user.permissions || []);
    setError('');
    setShowModal(true);
  };

  const togglePermission = (key: string) => {
    setFormPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editingUser) {
        const data: Parameters<typeof adminAuthApi.updateUser>[1] = {
          email: formEmail,
          role: formRole,
          name: formName,
          phone: formPhone,
          permissions: formRole === 'manager' ? formPermissions : [],
        };
        if (formPassword) data.password = formPassword;
        await adminAuthApi.updateUser(editingUser.id, data);
      } else {
        if (!formPassword || formPassword.length < 6) {
          setError('Пароль должен быть минимум 6 символов');
          setSaving(false);
          return;
        }
        await adminAuthApi.createUser({
          email: formEmail,
          password: formPassword,
          role: formRole,
          name: formName,
          phone: formPhone,
          permissions: formRole === 'manager' ? formPermissions : [],
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.details || e?.message || 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminAuthApi.deleteUser(id);
      setDeleteConfirm(null);
      loadUsers();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.details || e?.message || 'Ошибка при удалении');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await adminAuthApi.updateUser(user.id, { isActive: !user.isActive });
      loadUsers();
    } catch {
      // ignore
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 1) return digits.length === 1 ? `+7` : '';
    const rest = digits.slice(1);
    let formatted = '+7';
    if (rest.length > 0) formatted += ` (${rest.slice(0, 3)}`;
    if (rest.length >= 3) formatted += `)`;
    if (rest.length > 3) formatted += ` ${rest.slice(3, 6)}`;
    if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;
    if (rest.length > 8) formatted += `-${rest.slice(8, 10)}`;
    return formatted;
  };

  const handlePhoneChange = (val: string) => {
    setFormPhone(formatPhone(val));
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
          <h1 className="text-2xl font-bold text-slate-800">Пользователи</h1>
          <p className="text-sm text-slate-500 mt-1">
            Управление доступами менеджеров и администраторов
          </p>
        </div>
        <button
          onClick={openCreate}
          className="admin-btn admin-btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить пользователя
        </button>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email (логин)</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Доступы</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="font-medium">{user.name || '—'}</td>
                <td>{user.email}</td>
                <td>{user.phone || '—'}</td>
                <td>
                  <span className={`admin-badge ${user.role === 'admin' ? 'admin-status-completed' : 'admin-status-confirmed'}`}>
                    {user.role === 'admin' ? 'Админ' : 'Менеджер'}
                  </span>
                </td>
                <td>
                  {user.role === 'admin' ? (
                    <span className="text-xs text-slate-400">Все разделы</span>
                  ) : user.permissions && user.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map(p => {
                        const section = ALL_SECTIONS.find(s => s.key === p);
                        return (
                          <span key={p} className="admin-badge admin-status-new text-xs">
                            {section?.label || p}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-red-400">Нет доступов</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={user.id === admin?.id}
                    className={`admin-badge cursor-pointer ${user.isActive ? 'admin-status-completed' : 'admin-status-cancelled'}`}
                  >
                    {user.isActive ? 'Активен' : 'Заблокирован'}
                  </button>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="admin-btn admin-btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      Изменить
                    </button>
                    {user.id !== admin?.id && (
                      deleteConfirm === user.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(user.id)}
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
                          onClick={() => setDeleteConfirm(user.id)}
                          className="admin-btn !py-1.5 !px-3 text-xs text-red-500 hover:bg-red-50"
                        >
                          Удалить
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Нет пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ФИО</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="admin-input w-full"
                  placeholder="Иванов Иван Иванович"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="admin-input w-full"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (логин)</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="admin-input w-full"
                  placeholder="manager@kelsa.store"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Пароль {editingUser && <span className="text-slate-400 font-normal">(оставьте пустым, если не меняете)</span>}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="admin-input w-full"
                  placeholder={editingUser ? '••••••' : 'Минимум 6 символов'}
                  minLength={editingUser ? 0 : 6}
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'admin' | 'manager')}
                  className="admin-input w-full"
                >
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              {formRole === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Доступ к разделам
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SECTIONS.map(section => (
                      <label
                        key={section.key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          formPermissions.includes(section.key)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formPermissions.includes(section.key)}
                          onChange={() => togglePermission(section.key)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">{section.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                  {saving ? 'Сохранение...' : editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
