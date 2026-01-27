'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/shared/api/config';

const COURIER_TOKEN_KEY = 'courier_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(COURIER_TOKEN_KEY);
}

interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  debugInfo: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    debugInfo: null,
  });

  // Проверяем поддержку и текущее состояние
  useEffect(() => {
    const checkSupport = async () => {
      const debugParts: string[] = [];
      
      // Проверяем базовые API
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      const hasNotification = 'Notification' in window;
      
      debugParts.push(`SW: ${hasServiceWorker}, Push: ${hasPushManager}, Notif: ${hasNotification}`);
      
      // Проверяем standalone mode (iOS PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      debugParts.push(`Standalone: ${isStandalone}`);

      // Проверяем поддержку Push API
      if (!hasServiceWorker || !hasPushManager) {
        setState({
          isSupported: false,
          isSubscribed: false,
          isLoading: false,
          error: 'Push-уведомления не поддерживаются браузером',
          debugInfo: debugParts.join(' | '),
        });
        return;
      }

      try {
        // Регистрируем Service Worker (в корне для iOS совместимости)
        const registration = await navigator.serviceWorker.register('/courier-sw.js', {
          scope: '/',
        });
        debugParts.push(`SW registered: ${registration.scope}`);
        
        // Ждём активации
        await navigator.serviceWorker.ready;
        debugParts.push('SW ready');
        
        // Проверяем текущую подписку
        const subscription = await registration.pushManager.getSubscription();
        debugParts.push(`Subscription: ${!!subscription}`);
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          error: null,
          debugInfo: debugParts.join(' | '),
        });
      } catch (err) {
        console.error('Push check error:', err);
        debugParts.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setState({
          isSupported: false,
          isSubscribed: false,
          isLoading: false,
          error: 'Ошибка регистрации Service Worker',
          debugInfo: debugParts.join(' | '),
        });
      }
    };

    checkSupport();
  }, []);

  // Подписаться на уведомления
  const subscribe = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token) {
      setState(prev => ({ ...prev, error: 'Требуется авторизация' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Запрашиваем разрешение
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Уведомления отклонены пользователем',
        }));
        return false;
      }

      // Получаем VAPID ключ с сервера
      const vapidResponse = await fetch(`${API_URL}/v1/courier/push/vapid-key`);
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error('VAPID key not configured');
      }

      // Получаем регистрацию SW
      const registration = await navigator.serviceWorker.ready;

      // Подписываемся
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Отправляем подписку на сервер
      const response = await fetch(`${API_URL}/v1/courier/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (err) {
      console.error('Subscribe error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Ошибка подписки на уведомления',
      }));
      return false;
    }
  }, []);

  // Отписаться
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Уведомляем сервер
      await fetch(`${API_URL}/v1/courier/push/subscribe`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Ошибка отписки',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Конвертация VAPID ключа
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
