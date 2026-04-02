'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { adminClientsApi } from '@/features/admin/api';
import { ClientListItem } from '@/features/admin/types';
import { useAdmin } from '@/components/admin/AdminProvider';

type SortBy = 'lastOrder' | 'totalSpent' | 'totalOrders' | 'createdAt';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(id: string) {
  const palette = [
    'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-teal-500', 'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatMoney(v: number) {
  return v.toLocaleString('ru-RU') + ' ₽';
}

function getRecencyLabel(lastOrderAt: string | null) {
  if (!lastOrderAt) return null;
  const days = Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86_400_000);
  if (days <= 7) return { label: '≤ 7 дней', cls: 'bg-green-100 text-green-700' };
  if (days <= 30) return { label: '≤ 30 дней', cls: 'bg-sky-100 text-sky-700' };
  if (days <= 90) return { label: '≤ 90 дней', cls: 'bg-amber-100 text-amber-700' };
  return { label: `${days} дн.`, cls: 'bg-slate-100 text-slate-500' };
}

export default function ClientsPage() {
  const { currentDarkstore } = useAdmin();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('lastOrder');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 25;

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminClientsApi.getClients(page, limit, search || undefined, sortBy);
      setClients(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, sortBy, currentDarkstore?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  const totalSpent = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrdersSum = clients.reduce((s, c) => s + c.totalOrders, 0);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Клиенты</h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentDarkstore
              ? `Покупатели даркстора «${currentDarkstore.shortName ?? currentDarkstore.name}»`
              : 'Все покупатели сети'}
          </p>
        </div>
      </div>

      {/* Сводная плашка */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="admin-card p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Всего клиентов</div>
          <div className="text-2xl font-bold text-slate-900">{total.toLocaleString('ru-RU')}</div>
        </div>
        <div className="admin-card p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Заказов на экране</div>
          <div className="text-2xl font-bold text-indigo-600">{totalOrdersSum.toLocaleString('ru-RU')}</div>
        </div>
        <div className="admin-card p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Выручка (экран)</div>
          <div className="text-2xl font-bold text-emerald-600">{formatMoney(totalSpent)}</div>
        </div>
        <div className="admin-card p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ср. чек (экран)</div>
          <div className="text-2xl font-bold text-violet-600">
            {totalOrdersSum > 0 ? formatMoney(Math.round(totalSpent / totalOrdersSum)) : '—'}
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="admin-card">
        <div className="admin-card-body flex flex-col sm:flex-row gap-3">
          {/* Поиск */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по имени, телефону, email..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Сортировка */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">Сортировка:</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="lastOrder">Последний заказ</option>
              <option value="totalSpent">По выручке</option>
              <option value="totalOrders">По числу заказов</option>
              <option value="createdAt">Дата регистрации</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="admin-spinner" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Клиенты не найдены</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Телефон</th>
                  <th>Н.П.</th>
                  <th className="text-right">Заказов</th>
                  <th className="text-right">Доставлено</th>
                  <th className="text-right">Выручка</th>
                  <th>Последний заказ</th>
                  <th>Активность</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const recency = getRecencyLabel(c.lastOrderAt);
                  const conversionRate = c.totalOrders > 0
                    ? Math.round((c.deliveredOrders / c.totalOrders) * 100)
                    : 0;
                  return (
                    <tr key={c.id}>
                      {/* Аватар + имя */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(c.id)}`}>
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate max-w-[160px]">{c.name}</div>
                            <div className="text-xs text-slate-400 truncate">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-slate-600 font-mono">{c.phone}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {c.settlement}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-semibold text-slate-900">{c.totalOrders}</span>
                      </td>
                      <td className="text-right">
                        <div>
                          <span className="font-semibold text-emerald-600">{c.deliveredOrders}</span>
                          {c.totalOrders > 0 && (
                            <div className="text-xs text-slate-400">{conversionRate}%</div>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="font-semibold text-slate-900">{formatMoney(c.totalSpent)}</span>
                      </td>
                      <td className="text-sm text-slate-500">{formatDate(c.lastOrderAt)}</td>
                      <td>
                        {recency ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${recency.cls}`}>
                            {recency.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/clients/${c.id}`}
                          className="admin-btn admin-btn-secondary py-1.5 px-3 text-xs"
                        >
                          Профиль →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-btn admin-btn-secondary py-1.5 px-3 text-sm"
              >
                ← Назад
              </button>
              <span className="flex items-center px-3 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="admin-btn admin-btn-secondary py-1.5 px-3 text-sm"
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
