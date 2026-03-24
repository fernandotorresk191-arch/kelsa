'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { adminChatApi, ChatMessage } from '@/features/admin/api';
import { resolveMediaUrl } from '@/shared/api/media';
import { compressImage } from '@/lib/compressImage';
import type { ChatEventData } from '@/features/admin/useOrdersSSE';

interface AdminChatPanelProps {
  orderId: string;
  orderNumber: number;
  chatEvent?: ChatEventData | null;
  onGeoSaved?: (latitude: number, longitude: number) => void;
}

/* ───────── WhatsApp-style checkmarks ───────── */
function CheckIcon({ read }: { read: boolean }) {
  if (read) {
    return (
      <svg className="inline-block ml-1 -mb-px" width="16" height="11" viewBox="0 0 16 11" fill="none">
        <path d="M11.071 0.653L4.214 7.51L1.857 5.153L0.443 6.567L4.214 10.339L12.485 2.067L11.071 0.653Z" fill="#53bdeb"/>
        <path d="M14.071 0.653L7.214 7.51L6.5 6.796L5.086 8.21L7.214 10.339L15.485 2.067L14.071 0.653Z" fill="#53bdeb"/>
      </svg>
    );
  }
  return (
    <svg className="inline-block ml-1 -mb-px" width="12" height="11" viewBox="0 0 12 11" fill="none">
      <path d="M11.071 0.653L4.214 7.51L1.857 5.153L0.443 6.567L4.214 10.339L12.485 2.067L11.071 0.653Z" fill="#8696a0"/>
    </svg>
  );
}

export default function AdminChatPanel({ orderId, orderNumber, chatEvent, onGeoSaved }: AdminChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingGeo, setSavingGeo] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const needsInitialScroll = useRef(true);

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
        needsInitialScroll.current = true;
        adminChatApi.markRead(orderId).catch(() => {});
      }
    }).catch((err) => {
      console.error('[AdminChat] getMessages error:', err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [orderId, scrollToBottom]);

  // Scroll to bottom after messages are rendered on initial load
  useEffect(() => {
    if (!needsInitialScroll.current || loading || messages.length === 0) return;
    needsInitialScroll.current = false;
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, loading]);

  // Handle chat events from parent SSE
  useEffect(() => {
    if (!chatEvent) return;

    if (chatEvent.type === 'NEW_MESSAGE' && chatEvent.message?.orderId === orderId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === chatEvent.message!.id)) return prev;
        return [...prev, chatEvent.message as ChatMessage];
      });
      scrollToBottom();
      if (chatEvent.message.sender === 'CLIENT') {
        adminChatApi.markRead(orderId).catch(() => {});
      }
    }

    if (chatEvent.type === 'MESSAGES_READ' && chatEvent.readBy === 'CLIENT' && chatEvent.orderId === orderId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === 'MANAGER' && !m.isRead ? { ...m, isRead: true } : m,
        ),
      );
    }
  }, [chatEvent, orderId, scrollToBottom]);

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
      const compressed = await compressImage(file);
      const msg = await adminChatApi.sendImage(orderId, compressed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    } catch (err) { console.error('[AdminChat] sendImage error:', err); }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddGeoToOrder = async (msgId: string, lat: number, lng: number) => {
    setSavingGeo(msgId);
    try {
      await adminChatApi.setOrderGeolocation(orderId, lat, lng);
      onGeoSaved?.(lat, lng);
    } catch (err) {
      console.error('[AdminChat] setOrderGeolocation error:', err);
      alert('Ошибка при сохранении геопозиции');
    }
    setSavingGeo(null);
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
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-[60vh] min-h-[350px] max-h-[600px] sm:h-[500px] lg:h-[550px]">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center text-base sm:text-lg">💬</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13px] sm:text-sm leading-tight truncate">Чат по заказу #{orderNumber}</div>
          <div className="text-[11px] sm:text-xs text-emerald-100">{messages.length} сообщ.</div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 py-2 sm:py-3"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundColor: '#efeae2',
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm">Нет сообщений. Начните переписку!</div>
          </div>
        ) : (
          <div className="space-y-[3px]">
            {messages.map((msg) => {
              const isManager = msg.sender === 'MANAGER';
              const hasGeo = msg.latitude != null && msg.longitude != null;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isManager ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[85%] sm:max-w-[80%] rounded-lg px-2 sm:px-2.5 py-1.5 shadow-sm ${
                      isManager
                        ? 'bg-[#d9fdd3] rounded-tr-none'
                        : 'bg-white rounded-tl-none'
                    }`}
                  >
                    {/* Tail */}
                    <div className={`absolute top-0 w-2 h-3 ${isManager ? '-right-1.5 text-[#d9fdd3]' : '-left-1.5 text-white'}`}>
                      <svg viewBox="0 0 8 13" width="8" height="13" fill="currentColor">
                        {isManager
                          ? <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" />
                          : <path d="M2.812 0H8v11.193L1.533 2.568C.474 1.156 1.042 0 2.812 0z" />
                        }
                      </svg>
                    </div>

                    {msg.imageUrl && (
                      <img
                        src={resolveMediaUrl(msg.imageUrl) || ''}
                        alt="Фото"
                        className="rounded-lg max-w-full max-h-[35vh] sm:max-h-48 object-cover mb-1 cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => setImagePreview(resolveMediaUrl(msg.imageUrl) || null)}
                        loading="lazy"
                      />
                    )}
                    {msg.text && (
                      <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                    {hasGeo && (
                      <div className="mt-1.5 space-y-1.5">
                        <a
                          href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[13px] sm:text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3 py-2 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">📍 Геопозиция</span>
                          <svg className="w-3.5 h-3.5 ml-auto text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {/* Кнопка "Добавить к заказу" — только для сообщений клиента с геопозицией */}
                        {msg.sender === 'CLIENT' && (
                          <button
                            onClick={() => handleAddGeoToOrder(msg.id, msg.latitude!, msg.longitude!)}
                            disabled={savingGeo === msg.id}
                            className="flex items-center gap-1.5 text-xs sm:text-[13px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md transition-colors font-medium disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-start"
                          >
                            {savingGeo === msg.id ? (
                              <>
                                <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                Сохранение...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Добавить к заказу
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    {/* Time + checkmarks */}
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      <span className="text-[11px] text-gray-500 leading-none">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isManager && <CheckIcon read={msg.isRead} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-[#f0f0f0] px-2 sm:px-3 py-1.5 sm:py-2 flex items-end gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 rounded-full transition-colors shrink-0"
          title="Отправить фото"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <div className="flex-1 min-w-0 bg-white rounded-[22px] border border-gray-200 flex items-end overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-[14px] sm:text-sm focus:outline-none max-h-24 bg-transparent"
            style={{ minHeight: 40 }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2 sm:p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
        >
          <svg className="w-5.5 h-5.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          onClick={() => setImagePreview(null)}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 transition-colors"
            onClick={() => setImagePreview(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={imagePreview} alt="Просмотр" className="max-w-full max-h-full object-contain select-none" draggable={false} />
        </div>
      )}
    </div>
  );
}
