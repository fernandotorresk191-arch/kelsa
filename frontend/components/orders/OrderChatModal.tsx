'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { chatApi, ChatMessage } from '@/features/orders/api';
import { resolveMediaUrl } from '@/shared/api/media';
import { API_URL } from '@/shared/api/config';
import { getStoredAccessToken } from '@/shared/auth/token';

interface OrderChatModalProps {
  orderNumber: number;
  open: boolean;
  onClose: () => void;
}

export default function OrderChatModal({ orderNumber, open, onClose }: OrderChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // Load messages when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    chatApi.getMessages(orderNumber).then((data) => {
      if (!cancelled) {
        setMessages(data.messages);
        setLoading(false);
        scrollToBottom();
        chatApi.markRead(orderNumber).catch(() => {});
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, orderNumber, scrollToBottom]);

  // SSE for real-time messages
  useEffect(() => {
    if (!open) return;
    const token = getStoredAccessToken();
    if (!token) return;

    const url = `${API_URL}/v1/events/my-orders?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('chat', (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; message: ChatMessage & { orderNumber: number } };
        if (data.type === 'NEW_MESSAGE' && data.message.orderNumber === orderNumber) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          scrollToBottom();
          if (data.message.sender === 'MANAGER') {
            chatApi.markRead(orderNumber).catch(() => {});
          }
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [open, orderNumber, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await chatApi.sendText(orderNumber, trimmed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setText('');
      scrollToBottom();
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    setShowActions(false);
    try {
      const msg = await chatApi.sendImage(orderNumber, file);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    } catch { /* ignore */ }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendLocation = async () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }
    setShowActions(false);
    setSending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const msg = await chatApi.sendText(
            orderNumber,
            '📍 Моя геопозиция',
            position.coords.latitude,
            position.coords.longitude,
          );
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        } catch { /* ignore */ }
        setSending(false);
      },
      () => {
        alert('Не удалось получить геопозицию. Проверьте настройки разрешений.');
        setSending(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) {
      groupedMessages.push({ date: msg.createdAt, msgs: [msg] });
      lastDate = date;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-[fadeIn_150ms_ease-out]" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md h-[85vh] sm:h-[600px] sm:rounded-2xl overflow-hidden flex flex-col animate-[slideUp_250ms_ease-out] bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🛒</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Чат по заказу #{orderNumber}</div>
            <div className="text-xs text-emerald-100">Менеджер</div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundColor: '#f0f2f5',
          }}
        >
          {loading ? (
            <div className="text-center text-gray-400 py-12 text-sm">Загрузка сообщений...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-5xl mb-3">💬</div>
              <div className="text-sm font-medium">Нет сообщений</div>
              <div className="text-xs mt-1">Напишите менеджеру, если возникли вопросы</div>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex justify-center my-3">
                  <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
                    {formatDate(group.date)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.msgs.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'CLIENT' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                          msg.sender === 'CLIENT'
                            ? 'bg-emerald-100 text-gray-900 rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={resolveMediaUrl(msg.imageUrl) || ''}
                            alt="Фото"
                            className="rounded-lg max-w-full max-h-52 object-cover mb-1 cursor-pointer"
                            onClick={() => window.open(resolveMediaUrl(msg.imageUrl) || '', '_blank')}
                          />
                        )}
                        {msg.text && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                        {msg.latitude != null && msg.longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg mt-1 transition-colors"
                          >
                            <span className="text-lg">📍</span>
                            <span>Открыть на карте</span>
                          </a>
                        )}
                        <div className={`text-[10px] mt-0.5 ${msg.sender === 'CLIENT' ? 'text-emerald-600' : 'text-gray-400'} text-right`}>
                          {formatTime(msg.createdAt)}
                          {msg.sender === 'CLIENT' && (
                            <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Actions popover */}
        {showActions && (
          <div className="absolute bottom-16 left-3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-[slideUp_150ms_ease-out] z-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Фото из галереи</span>
            </button>
            <button
              onClick={handleSendLocation}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Геопозиция</span>
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-3 py-2 flex items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className={`p-2 rounded-full transition-colors ${
              showActions ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <svg className={`w-5 h-5 transition-transform ${showActions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setShowActions(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors max-h-24"
            style={{ minHeight: 38 }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
