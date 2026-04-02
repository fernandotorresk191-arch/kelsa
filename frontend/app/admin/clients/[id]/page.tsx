'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminClientsApi } from '@/features/admin/api';
import { ClientDetail, OrderStatus, OrderStatusLabels } from '@/features/admin/types';

function formatMoney(v: number) {
  return v.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(d: string | null, time = false) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const statusStyles: Record<string, string> = {
  NEW: 'admin-status-new',
  CONFIRMED: 'admin-status-confirmed',
  ASSEMBLING: 'admin-status-assembling',
  ASSIGNED_TO_COURIER: 'admin-status-assigned',
  ACCEPTED_BY_COURIER: 'admin-status-accepted',
  ON_THE_WAY: 'admin-status-delivering',
  DELIVERED: 'admin-status-completed',
  CANCELED: 'admin-status-cancelled',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый', CONFIRMED: 'Подтверждён', ASSEMBLING: 'Собирается',
  ASSIGNED_TO_COURIER: 'Передан', ACCEPTED_BY_COURIER: 'Принят',
  ON_THE_WAY: 'В пути', DELIVERED: 'Доставлен', CANCELED: 'Отменён',
};

function StatCard({
  label, value, sub, color = 'text-slate-900',
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="admin-card p-5">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminClientsApi.getClient(id).then(setData).catch(() => {}).finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-card p-12 text-center">
        <p className="text-slate-500 mb-4">Клиент не найден</p>
        <button onClick={() => router.back()} className="admin-btn admin-btn-secondary">
          Назад
        </button>
      </div>
    );
  }

  const { user, stats, topProducts, recentOrders } = data;
  const conversionRate = stats.totalOrders > 0
    ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100)
    : 0;

  // Сегмент клиента
  let segment = { label: 'Новичок', cls: 'bg-slate-100 text-slate-500' };
  if (stats.deliveredOrders >= 10 && stats.totalSpent >= 10000) {
    segment = { label: 'VIP', cls: 'bg-amber-100 text-amber-700' };
  } else if (stats.deliveredOrders >= 5) {
    segment = { label: 'Постоянный', cls: 'bg-indigo-100 text-indigo-700' };
  } else if (stats.deliveredOrders >= 2) {
    segment = { label: 'Returning', cls: 'bg-sky-100 text-sky-700' };
  }

  // Recency
  let recencyLabel = { label: 'Нет заказов', cls: 'bg-slate-100 text-slate-400' };
  if (stats.daysSinceLastOrder !== null) {
    if (stats.daysSinceLastOrder <= 7) recencyLabel = { label: 'Активен (≤7д)', cls: 'bg-green-100 text-green-700' };
    else if (stats.daysSinceLastOrder <= 30) recencyLabel = { label: 'Недавно (≤30д)', cls: 'bg-sky-100 text-sky-700' };
    else if (stats.daysSinceLastOrder <= 90) recencyLabel = { label: 'Засыпает (≤90д)', cls: 'bg-amber-100 text-amber-700' };
    else recencyLabel = { label: `Неактивен (${stats.daysSinceLastOrder}д)`, cls: 'bg-red-100 text-red-600' };
  }

  return (
    <div className="space-y-6">
      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/admin/clients" className="hover:text-indigo-600 transition-colors">Клиенты</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{user.name}</span>
      </div>

      {/* Hero-профиль */}
      <div className="admin-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Аватар */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {getInitials(user.name)}
            </div>
          </div>

          {/* Основная инфо */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${segment.cls}`}>
                {segment.label}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${recencyLabel.cls}`}>
                {recencyLabel.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-mono">{user.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{user.settlement}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="truncate">{user.addressLine}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Зарегистрирован {formatDate(user.createdAt)}</span>
              </div>
              {stats.daysSinceRegistration !== null && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{stats.daysSinceRegistration} дн. в базе</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Всего заказов" value={stats.totalOrders} />
        <StatCard
          label="Доставлено"
          value={`${stats.deliveredOrders} (${conversionRate}%)`}
          color="text-emerald-600"
          sub={`Отменено: ${stats.canceledOrders}`}
        />
        <StatCard
          label="Суммарные траты"
          value={formatMoney(stats.totalSpent)}
          color="text-indigo-600"
          sub={`Доставка: ${formatMoney(stats.totalDeliveryFee)}`}
        />
        <StatCard
          label="Средний чек"
          value={stats.avgOrderValue > 0 ? formatMoney(stats.avgOrderValue) : '—'}
          color="text-violet-600"
          sub={stats.firstOrderAt ? `С ${formatDate(stats.firstOrderAt)}` : undefined}
        />
      </div>

      {/* Разбивка по статусам + Top товары */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* По статусам */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Статусы заказов</h2>
          </div>
          <div className="admin-card-body space-y-2">
            {stats.statusBreakdown.length === 0 ? (
              <p className="text-slate-400 text-sm">Нет данных</p>
            ) : (
              stats.statusBreakdown
                .sort((a, b) => b.count - a.count)
                .map(({ status, count }) => {
                  const pct = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-indigo-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-8 text-right">{count}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Топ товаров */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Любимые товары</h2>
            <p className="text-xs text-slate-400 mt-0.5">Топ по количеству из доставленных заказов</p>
          </div>
          <div className="admin-card-body space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-slate-400 text-sm">Нет данных</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-500 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{p.title}</div>
                    <div className="text-xs text-slate-400">
                      {p.ordersCount} {p.ordersCount === 1 ? 'заказ' : 'заказов'} · {p.totalQty} шт.
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                    {formatMoney(p.totalAmount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* История заказов */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <div>
            <h2 className="admin-card-title">История заказов</h2>
            <p className="text-xs text-slate-400 mt-0.5">Последние 30 заказов</p>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-card-body text-slate-400 text-sm">Заказов нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>№ заказа</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Н.П.</th>
                  {/* показываем даркстор только суперадмину — просто всегда показываем */}
                  <th>Даркстор</th>
                  <th>Состав (топ)</th>
                  <th className="text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono font-semibold text-indigo-600 hover:underline"
                      >
                        #{String(o.orderNumber).padStart(5, '0')}
                      </Link>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="text-sm text-slate-500">{formatDate(o.createdAt, true)}</td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {o.settlement ?? '—'}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {o.darkstore?.shortName ?? o.darkstore?.name ?? '—'}
                    </td>
                    <td className="text-xs text-slate-500">
                      {o.items.slice(0, 2).map((item) => item.title).join(', ')}
                      {o.items.length > 2 && <span className="text-slate-400"> +{o.items.length - 2}</span>}
                    </td>
                    <td className="text-right font-semibold text-slate-900">
                      {formatMoney(o.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
