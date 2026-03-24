'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/shared/api/config';
import { getStoredAccessToken } from '@/shared/auth/token';

interface ClientPushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useClientPush() {
  const [state, setState] = useState<ClientPushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
  });

  useEffect(() => {
    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState({ isSupported: false, isSubscribed: false, isLoading: false });
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState({ isSupported: true, isSubscribed: !!sub, isLoading: false });
      } catch {
        setState({ isSupported: false, isSubscribed: false, isLoading: false });
      }
    };
    check();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const token = getStoredAccessToken();
    if (!token) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const vapidRes = await fetch(`${API_URL}/v1/push/vapid-key`);
      const { key } = await vapidRes.json();
      if (!key) throw new Error('No VAPID key');

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const res = await fetch(`${API_URL}/v1/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error('Subscribe failed');

      setState({ isSupported: true, isSubscribed: true, isLoading: false });
      return true;
    } catch (err) {
      console.error('[Push] subscribe error:', err);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  return { ...state, subscribe };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}
