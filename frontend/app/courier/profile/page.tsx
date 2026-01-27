'use client';

import { useCourier } from '@/components/courier/CourierProvider';
import { CourierStatusLabels } from '@/features/courier/types';

export default function CourierProfilePage() {
  const { courier, logout } = useCourier();

  if (!courier) {
    return (
      <div className="courier-empty">
        <div className="courier-spinner courier-center" />
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="courier-page-title">
        Профиль
      </h2>

      <div className="courier-card">
        <div className="courier-card-body">
          <div className="courier-profile-avatar-wrapper">
            <div className="courier-profile-avatar">
              {courier.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="courier-profile-name">
              {courier.fullName}
            </div>
            <div className="courier-profile-login">
              @{courier.login}
            </div>
          </div>

          <div className="courier-order-info">
            <div className="courier-order-row">
              <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <div className="courier-order-label">Телефон</div>
                <a href={`tel:${courier.phone}`} className="courier-phone-link">
                  {courier.phone}
                </a>
              </div>
            </div>

            {courier.carBrand && (
              <div className="courier-order-row">
                <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-4-4v8m-4 4H5a1 1 0 01-1-1V6a1 1 0 011-1h14a1 1 0 011 1v8a1 1 0 01-1 1h-3m-8 4l4-4 4 4" />
                </svg>
                <div>
                  <div className="courier-order-label">Автомобиль</div>
                  <div className="courier-order-value">
                    {courier.carBrand} {courier.carNumber && `(${courier.carNumber})`}
                  </div>
                </div>
              </div>
            )}

            <div className="courier-order-row">
              <svg className="courier-order-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="courier-order-label">Статус</div>
                <div className="courier-order-value">
                  {CourierStatusLabels[courier.status]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="courier-btn-logout"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}
