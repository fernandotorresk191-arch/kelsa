'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminCouriersApi } from '@/features/admin/api';
import { CourierProfile, CourierDelivery } from '@/features/admin/types';
import { useAdmin } from '@/components/admin/AdminProvider';

// Функция форматирования телефона
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

// Функция форматирования денег (значение уже в рублях)
const formatMoney = (rubles: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
};

// Функция форматирования даты
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Статус карточка
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'blue' | 'purple' | 'amber' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-600/20',
    green: 'bg-green-50 text-green-600 ring-green-600/20',
    blue: 'bg-blue-50 text-blue-600 ring-blue-600/20',
    purple: 'bg-purple-50 text-purple-600 ring-purple-600/20',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/20',
    rose: 'bg-rose-50 text-rose-600 ring-rose-600/20',
  };

  const bgColorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <div className="admin-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className={`inline-flex p-3 rounded-xl ring-1 ring-inset ${colorClasses[color]}`}>
            {icon}
          </div>
          {subtitle && (
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {subtitle}
            </span>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      <div className={`h-1 bg-gradient-to-r ${bgColorClasses[color]}`} />
    </div>
  );
};

export default function CourierProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAdmin();
  
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'active'>('deliveries');

  const courierId = params.id as string;

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated || !courierId) return;
    
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await adminCouriersApi.getCourierProfile(courierId);
      setProfile(data);
    } catch (error) {
      const err = error as { message?: string };
      console.error('Failed to fetch courier profile:', err.message);
      setFetchError(err.message || 'Ошибка загрузки профиля курьера');
    } finally {
      setIsLoading(false);
    }
  }, [courierId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchProfile();
    }
  }, [fetchProfile, isAuthLoading, isAuthenticated]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-red-600 mb-2">Ошибка загрузки</h2>
        <p className="text-slate-500 mb-4">{fetchError}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="admin-btn admin-btn-secondary"
          >
            Назад
          </button>
          <button
            onClick={() => fetchProfile()}
            className="admin-btn admin-btn-primary"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">🚚</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Курьер не найден</h2>
        <button
          onClick={() => router.push('/admin/couriers')}
          className="admin-btn admin-btn-primary"
        >
          К списку курьеров
        </button>
      </div>
    );
  }

  const { courier, stats, activeOrders, recentDeliveries } = profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Назад"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="admin-page-title">{courier.fullName}</h1>
            <p className="admin-page-subtitle">Профиль курьера</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`admin-badge ${courier.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
            {courier.isActive ? 'Активен' : 'Неактивен'}
          </span>
          {courier.status && (
            <span className="admin-badge admin-badge-gray">
              {courier.status === 'AVAILABLE' ? 'Свободен' : 
               courier.status === 'ACCEPTED' ? 'Принял заказ' : 
               courier.status === 'DELIVERING' ? 'Доставляет' : courier.status}
            </span>
          )}
        </div>
      </div>

      {/* Courier Info Card */}
      <div className="admin-card">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {courier.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Логин</p>
                <p className="font-mono text-indigo-600">{courier.login}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Телефон</p>
                <p className="text-slate-700">{formatPhoneNumber(courier.phone)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Автомобиль</p>
                <p className="text-slate-700">
                  {courier.carBrand || courier.carNumber 
                    ? `${courier.carBrand || ''} ${courier.carNumber || ''}`.trim() 
                    : 'Не указан'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Дата регистрации</p>
                <p className="text-slate-700">{formatDate(courier.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Всего доставок"
          value={stats.totalDeliveries}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
          color="indigo"
        />
        <StatCard
          title="Доставок сегодня"
          value={stats.deliveriesToday}
          subtitle="За день"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          color="blue"
        />
        <StatCard
          title="Доставок за неделю"
          value={stats.deliveriesThisWeek}
          subtitle="7 дней"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          color="purple"
        />
        <StatCard
          title="Доставок за месяц"
          value={stats.deliveriesThisMonth}
          subtitle="30 дней"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          color="amber"
        />
      </div>

      {/* Earnings Stats */}
      <div className="admin-card overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Заработок курьера
          </h2>
          <p className="text-green-100 text-sm">Начисления за доставленные заказы</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Сегодня</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(stats.earningsToday)}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.deliveriesToday} доставок</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">За неделю</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(stats.earningsThisWeek)}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.deliveriesThisWeek} доставок</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">За месяц</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(stats.earningsThisMonth)}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.deliveriesThisMonth} доставок</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-2">Всего заработано</p>
              <p className="text-2xl font-bold text-green-700">{formatMoney(stats.totalEarnings)}</p>
              <p className="text-xs text-green-600 mt-1">{stats.totalDeliveries} доставок</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-card">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 px-4">
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'deliveries'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              История доставок ({recentDeliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Активные заказы
              {activeOrders.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div>
            {recentDeliveries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-slate-700 mb-1">Доставок пока нет</h3>
                <p className="text-sm text-slate-500">История появится после выполнения первой доставки</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>№ Заказа</th>
                      <th>Клиент</th>
                      <th>Адрес</th>
                      <th>Сумма заказа</th>
                      <th>Начислено</th>
                      <th>Дата доставки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDeliveries.map((delivery: CourierDelivery) => (
                      <tr key={delivery.id}>
                        <td>
                          <span className="font-mono text-indigo-600 font-medium">
                            #{delivery.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div>
                            <p className="font-medium text-slate-800">{delivery.customerName}</p>
                            <p className="text-xs text-slate-500">{formatPhoneNumber(delivery.phone)}</p>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">{delivery.addressLine}</span>
                        </td>
                        <td>
                          <span className="font-medium text-slate-700">{formatMoney(delivery.totalAmount)}</span>
                        </td>
                        <td>
                          <span className="font-semibold text-green-600">{formatMoney(delivery.courierCost ?? 0)}</span>
                        </td>
                        <td>
                          <span className="text-slate-500 text-sm">{formatDateTime(delivery.updatedAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Active Orders Tab */}
        {activeTab === 'active' && (
          <div>
            {activeOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-slate-700 mb-1">Нет активных заказов</h3>
                <p className="text-sm text-slate-500">Курьер свободен и готов к новым доставкам</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>№ Заказа</th>
                      <th>Статус</th>
                      <th>Клиент</th>
                      <th>Адрес</th>
                      <th>Сумма</th>
                      <th>Создан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map((order: CourierDelivery) => (
                      <tr key={order.id}>
                        <td>
                          <span className="font-mono text-indigo-600 font-medium">
                            #{order.orderNumber}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-warning">
                            {order.status === 'ASSIGNED_TO_COURIER' ? 'Назначен' :
                             order.status === 'ACCEPTED_BY_COURIER' ? 'Принял' :
                             order.status === 'ON_THE_WAY' ? 'В пути' :
                             order.status}
                          </span>
                        </td>
                        <td>
                          <div>
                            <p className="font-medium text-slate-800">{order.customerName}</p>
                            <p className="text-xs text-slate-500">{formatPhoneNumber(order.phone)}</p>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">{order.addressLine}</span>
                        </td>
                        <td>
                          <span className="font-medium text-slate-700">{formatMoney(order.totalAmount)}</span>
                        </td>
                        <td>
                          <span className="text-slate-500 text-sm">{formatDateTime(order.createdAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
