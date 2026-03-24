'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { adminChatApi, ChatMessage } from '@/features/admin/api';
import { resolveMediaUrl } from '@/shared/api/media';
import { API_URL } from '@/shared/api/config';

interface AdminChatPanelProps {
  orderId: string;
  orderNumber: number;
}

export default function AdminChatPanel({ orderId, orderNumber }: AdminChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // Load messages
  useEffect(() => {
    let cancelled = false;
    adminChatApi.getMessages(orderId).then((data) => {
      if (!cancelled) {
        setMessages(data.messages);
        setLoading(false);
        scrollToBottom();
        // Mark read
        adminChatApi.markRead(orderId).catch(() => {});
      }
    }).catch((err) => {
      console.error('[AdminChat] getMessages error:', err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [orderId, scrollToBottom]);

  // SSE for real-time messages
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) return;

    const url = `${API_URL}/v1/events/chat?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('chat', (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; message: ChatMessage & { orderNumber: number } };
        if (data.type === 'NEW_MESSAGE' && data.message.orderId === orderId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          scrollToBottom();
          // Mark client messages as read
          if (data.message.sender === 'CLIENT') {
            adminChatApi.markRead(orderId).catch(() => {});
          }
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        // reconnect handled by component re-mount
      }, 5000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [orderId, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await adminChatApi.sendText(orderId, trimmed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setLoading(false);
      setText('');
      scrollToBottom();
    } catch (err) { console.error('[AdminChat] sendText error:', err); }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const msg = await adminChatApi.sendImage(orderId, file);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setLoading(false);
      scrollToBottom();
    } catch (err) { console.error('[AdminChat] sendImage error:', err); }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ height: 500 }}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">💬</div>
        <div>
          <div className="font-semibold text-sm">Чат по заказу #{orderNumber}</div>
          <div className="text-xs text-emerald-100">{messages.length} сообщ.</div>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundColor: '#f0f2f5',
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">Загрузка...</div>
        ) : messages.length === 0 && !loading ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm">Нет сообщений. Начните переписку!</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'MANAGER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                  msg.sender === 'MANAGER'
                    ? 'bg-emerald-100 text-gray-900 rounded-br-md'
                    : 'bg-white text-gray-900 rounded-bl-md'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={resolveMediaUrl(msg.imageUrl) || ''}
                    alt="Фото"
                    className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer"
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
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                  >
                    📍 Геопозиция
                  </a>
                )}
                <div className={`text-[10px] mt-0.5 ${msg.sender === 'MANAGER' ? 'text-emerald-600' : 'text-gray-400'} text-right`}>
                  {formatTime(msg.createdAt)}
                  {msg.sender === 'MANAGER' && (
                    <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-3 py-2 flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
          title="Отправить фото"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors max-h-24"
          style={{ minHeight: 38 }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
