'use client';

import { useEffect, useRef, useCallback } from 'react';
import { API_URL } from '@/shared/api/config';

const ADMIN_TOKEN_KEY = 'admin_token';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface OrderEventData {
  type: 'NEW_ORDER' | 'ORDER_UPDATED';
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    phone: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  };
}

export interface ChatEventData {
  type: 'NEW_MESSAGE' | 'MESSAGES_READ';
  message?: {
    id: string;
    orderId: string;
    orderNumber: number;
    sender: 'MANAGER' | 'CLIENT';
    text?: string | null;
    imageUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isRead?: boolean;
    createdAt: string;
  };
  orderId?: string;
  readBy?: 'MANAGER' | 'CLIENT';
}

interface UseOrdersSSEOptions {
  onNewOrder?: (order: OrderEventData['order']) => void;
  onOrderUpdated?: (order: OrderEventData['order']) => void;
  onChatEvent?: (event: ChatEventData) => void;
  enabled?: boolean;
  playSound?: boolean;
}

// Функция для воспроизведения звука уведомления
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    
    // Плавное затухание
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Игнорируем ошибки воспроизведения звука
  }
}

export function useOrdersSSE({
  onNewOrder,
  onOrderUpdated,
  onChatEvent,
  enabled = true,
  playSound = true,
}: UseOrdersSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = getAdminToken();
    if (!token || !enabled) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // SSE doesn't support custom headers, so we pass token as query param
    const url = `${API_URL}/v1/events/orders?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE] Connected to orders stream');
    };

    eventSource.addEventListener('order', (event) => {
      try {
        const data = JSON.parse(event.data) as OrderEventData;
        
        if (data.type === 'NEW_ORDER') {
          if (playSound) {
            playNotificationSound();
          }
          if (onNewOrder) {
            onNewOrder(data.order);
          }
        } else if (data.type === 'ORDER_UPDATED' && onOrderUpdated) {
          onOrderUpdated(data.order);
        }
      } catch (error) {
        console.error('[SSE] Failed to parse event:', error);
      }
    });

    eventSource.addEventListener('chat', (event) => {
      try {
        const data = JSON.parse(event.data) as ChatEventData;
        if (onChatEvent) {
          onChatEvent(data);
        }
      } catch (error) {
        console.error('[SSE] Failed to parse chat event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received, connection is alive
    });

    eventSource.onerror = () => {
      console.log('[SSE] Connection error, reconnecting in 5s...');
      eventSource.close();
      
      // Reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [enabled, onNewOrder, onOrderUpdated, onChatEvent, playSound]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return { reconnect };
}
