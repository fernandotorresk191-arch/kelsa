'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCourier } from '@/components/courier/CourierProvider';
import { CourierStatusLabels, CourierProfileStats, CourierDeliveryHistory } from '@/features/courier/types';
import { courierOrdersApi } from '@/features/courier/api';
import { usePushNotifications } from '@/features/courier/usePushNotifications';

// Форматирование денег
const formatMoney = (rubles: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
};

// Форматирование даты
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isYesterday) {
    return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CourierProfilePage() {
  const { courier, checkAuth, logout } = useCourier();
  const { isSupported, isSubscribed, isLoading: isPushLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications();

  const [stats, setStats] = useState<CourierProfileStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<CourierDeliveryHistory[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const response = await courierOrdersApi.getProfileStats();
      setStats(response.stats);
      setRecentDeliveries(response.recentDeliveries);
    } catch (error) {
      console.error('Failed to fetch profile stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleAvailability = async () => {
    if (!courier) return;

    // Проверяем, можно ли переключить статус
    if (courier.status === 'ACCEPTED' || courier.status === 'DELIVERING') {
      setStatusError('Завершите все активные доставки перед выключением');
      setTimeout(() => setStatusError(null), 3000);
      return;
    }

    try {
      setIsTogglingStatus(true);
      setStatusError(null);
      const response = await courierOrdersApi.toggleAvailability();
      setStatusMessage(response.message);
      await checkAuth();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      const err = error as { message?: string };
      setStatusError(err.message || 'Ошибка при изменении статуса');
      setTimeout(() => setStatusError(null), 3000);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (!courier) {
    return (
      <div className="courier-empty">
        <div className="courier-spinner courier-center" />
        <p>Загрузка...</p>
      </div>
    );
  }

  const isWorking = courier.status !== 'OFF_DUTY';
  const canToggle = courier.status === 'OFF_DUTY' || courier.status === 'AVAILABLE';

  return (
    <div className="courier-profile">
      {/* Profile Header Card */}
      <div className="courier-profile-header">
        <div className="courier-profile-avatar-large">
          {courier.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <h1 className="courier-profile-name-large">{courier.fullName}</h1>
        <p className="courier-profile-login-badge">@{courier.login}</p>
        
        {/* Work Status Toggle */}
        <div className="courier-status-toggle-wrapper">
          <button
            onClick={handleToggleAvailability}
            disabled={isTogglingStatus || !canToggle}
            className={`courier-status-toggle ${isWorking ? 'active' : 'inactive'}`}
          >
            <span className="courier-status-toggle-indicator" />
            <span className="courier-status-toggle-label">
              {isTogglingStatus ? 'Загрузка...' : isWorking ? 'На работе' : 'Не работаю'}
            </span>
          </button>
          {!canToggle && (
            <p className="courier-status-toggle-hint">
              Завершите доставки чтобы выйти
            </p>
          )}
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="courier-status-message success">
            <svg className="courier-status-message-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {statusMessage}
          </div>
        )}
        {statusError && (
          <div className="courier-status-message error">
            <svg className="courier-status-message-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {statusError}
          </div>
        )}

        {/* Current Status Badge */}
        <div className={`courier-current-status ${courier.status.toLowerCase()}`}>
          {CourierStatusLabels[courier.status]}
        </div>
      </div>

      {/* Earnings Stats */}
      {isLoadingStats ? (
        <div className="courier-card">
          <div className="courier-card-body courier-center">
            <div className="courier-spinner" />
          </div>
        </div>
      ) : stats && (
        <>
          {/* Earnings Grid */}
          <div className="courier-earnings-grid">
            <div className="courier-earnings-card today">
              <div className="courier-earnings-period">Сегодня</div>
              <div className="courier-earnings-amount">{formatMoney(stats.earningsToday)}</div>
              <div className="courier-earnings-deliveries">{stats.deliveriesToday} доставок</div>
            </div>
            <div className="courier-earnings-card week">
              <div className="courier-earnings-period">За неделю</div>
              <div className="courier-earnings-amount">{formatMoney(stats.earningsThisWeek)}</div>
              <div className="courier-earnings-deliveries">{stats.deliveriesThisWeek} доставок</div>
            </div>
            <div className="courier-earnings-card month">
              <div className="courier-earnings-period">За месяц</div>
              <div className="courier-earnings-amount">{formatMoney(stats.earningsThisMonth)}</div>
              <div className="courier-earnings-deliveries">{stats.deliveriesThisMonth} доставок</div>
            </div>
            <div className="courier-earnings-card total">
              <div className="courier-earnings-period">Всего</div>
              <div className="courier-earnings-amount">{formatMoney(stats.totalEarnings)}</div>
              <div className="courier-earnings-deliveries">{stats.totalDeliveries} доставок</div>
            </div>
          </div>

          {/* Delivery History */}
          <div className="courier-history-section">
            <h3 className="courier-history-title">
              <svg className="courier-history-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Последние доставки
            </h3>
            
            {recentDeliveries.length === 0 ? (
              <div className="courier-history-empty">
                <div className="courier-history-empty-icon">📦</div>
                <p>Пока нет завершённых доставок</p>
              </div>
            ) : (
              <div className="courier-history-list">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="courier-history-item">
                    <div className="courier-history-item-left">
                      <div className="courier-history-item-number">#{delivery.orderNumber}</div>
                      <div className="courier-history-item-address">{delivery.addressLine}</div>
                      <div className="courier-history-item-date">{formatDate(delivery.deliveredAt)}</div>
                    </div>
                    <div className="courier-history-item-right">
                      <div className="courier-history-item-earnings">+{formatMoney(delivery.earnings)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Contact Info */}
      <div className="courier-card">
        <div className="courier-card-body">
          <h3 className="courier-section-title">Контактная информация</h3>
          
          <div className="courier-info-row">
            <svg className="courier-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <div>
              <div className="courier-info-label">Телефон</div>
              <a href={`tel:${courier.phone}`} className="courier-info-value courier-link">
                {courier.phone}
              </a>
            </div>
          </div>

          {(courier.carBrand || courier.carNumber) && (
            <div className="courier-info-row">
              <svg className="courier-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-4-4v8m-4 4H5a1 1 0 01-1-1V6a1 1 0 011-1h14a1 1 0 011 1v8a1 1 0 01-1 1h-3m-8 4l4-4 4 4" />
              </svg>
              <div>
                <div className="courier-info-label">Автомобиль</div>
                <div className="courier-info-value">
                  {courier.carBrand} {courier.carNumber && `(${courier.carNumber})`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Settings */}
      <div className="courier-card">
        <div className="courier-card-body">
          <h3 className="courier-section-title">🔔 Уведомления</h3>
          
          {!isSupported ? (
            <p className="courier-info-label">
              Push-уведомления не поддерживаются на этом устройстве.
            </p>
          ) : isSubscribed ? (
            <div className="courier-notification-status active">
              <span className="courier-notification-indicator" />
              <span>Уведомления включены</span>
              <button
                onClick={unsubscribe}
                disabled={isPushLoading}
                className="courier-notification-toggle"
              >
                {isPushLoading ? '...' : 'Выкл'}
              </button>
            </div>
          ) : (
            <div className="courier-notification-status inactive">
              <span className="courier-notification-indicator" />
              <span>Уведомления выключены</span>
              <button
                onClick={subscribe}
                disabled={isPushLoading}
                className="courier-notification-toggle primary"
              >
                {isPushLoading ? '...' : 'Вкл'}
              </button>
            </div>
          )}
          
          {pushError && (
            <p className="courier-notification-error">{pushError}</p>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <button onClick={logout} className="courier-logout-button">
        <svg className="courier-logout-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Выйти из аккаунта
      </button>
    </div>
  );
}
