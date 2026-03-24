'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { chatApi, ChatMessage } from '@/features/orders/api';
import { resolveMediaUrl } from '@/shared/api/media';
import { API_URL } from '@/shared/api/config';
import { getStoredAccessToken } from '@/shared/auth/token';
import { compressImage } from '@/lib/compressImage';

interface OrderChatModalProps {
  orderNumber: number;
  open: boolean;
  onClose: () => void;
}

/* ───────── WhatsApp-style double checkmark SVG ───────── */
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

export default function OrderChatModal({ orderNumber, open, onClose }: OrderChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const needsInitialScroll = useRef(false);

  const scrollToBottom = useCallback((instant?: boolean) => {
    const doScroll = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'end' });
    };
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Scroll to bottom after messages are rendered on initial load
  useEffect(() => {
    if (!needsInitialScroll.current || loading || messages.length === 0) return;
    needsInitialScroll.current = false;
    const container = messagesContainerRef.current;
    if (container) {
      // Direct scrollTop is most reliable — no animation needed on open
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, loading]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
        needsInitialScroll.current = true;
        chatApi.markRead(orderNumber).catch(() => {});
      }
    }).catch((err) => {
      console.error('[Chat] getMessages error:', err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, orderNumber, scrollToBottom]);

  // SSE for real-time messages + read status
  useEffect(() => {
    if (!open) return;
    const token = getStoredAccessToken();
    if (!token) return;

    const url = `${API_URL}/v1/events/my-orders?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('chat', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_MESSAGE' && data.message?.orderNumber === orderNumber) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message as ChatMessage];
          });
          scrollToBottom();
          if (data.message.sender === 'MANAGER') {
            chatApi.markRead(orderNumber).catch(() => {});
          }
        }

        // Manager read our messages → update checkmarks
        if (data.type === 'MESSAGES_READ' && data.readBy === 'MANAGER') {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender === 'CLIENT' && !m.isRead ? { ...m, isRead: true } : m,
            ),
          );
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          const newEs = new EventSource(url);
          eventSourceRef.current = newEs;
          newEs.addEventListener('chat', (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'NEW_MESSAGE' && data.message?.orderNumber === orderNumber) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.message.id)) return prev;
                  return [...prev, data.message as ChatMessage];
                });
                scrollToBottom();
                if (data.message.sender === 'MANAGER') {
                  chatApi.markRead(orderNumber).catch(() => {});
                }
              }
              if (data.type === 'MESSAGES_READ' && data.readBy === 'MANAGER') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.sender === 'CLIENT' && !m.isRead ? { ...m, isRead: true } : m,
                  ),
                );
              }
            } catch { /* ignore */ }
          });
          newEs.onerror = () => { newEs.close(); };
        }
      }, 5000);
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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      scrollToBottom();
    } catch (err) { console.error('[Chat] sendText error:', err); }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    setShowActions(false);
    try {
      const compressed = await compressImage(file);
      const msg = await chatApi.sendImage(orderNumber, compressed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    } catch (err) { console.error('[Chat] sendImage error:', err); }
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
        } catch (err) { console.error('[Chat] sendLocation error:', err); }
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
      className="fixed inset-0 z-[100]"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-[fadeIn_150ms_ease-out]" />

      {/* Modal — full screen on mobile, centered card on desktop */}
      <div className="absolute inset-0 sm:static sm:h-full sm:flex sm:items-center sm:justify-center">
        <div className="flex flex-col w-full h-full sm:h-[85vh] sm:max-h-[720px] sm:max-w-lg sm:rounded-2xl overflow-hidden animate-[slideUp_200ms_ease-out] bg-white sm:shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white shrink-0" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors -ml-1"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
            🛒
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] leading-tight">Заказ #{orderNumber}</div>
            <div className="text-xs text-emerald-100/90">Менеджер</div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 py-2 sm:py-3"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundColor: '#efeae2',
          }}
        >
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="text-center text-gray-400 py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-500">Нет сообщений</div>
              <div className="text-xs mt-1 text-gray-400">Напишите менеджеру, если есть вопросы</div>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-3">
                  <span className="bg-white/90 text-gray-500 text-[11px] px-3 py-1 rounded-full shadow-sm font-medium">
                    {formatDate(group.date)}
                  </span>
                </div>
                <div className="space-y-[3px]">
                  {group.msgs.map((msg) => {
                    const isClient = msg.sender === 'CLIENT';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`relative max-w-[82%] xs:max-w-[80%] sm:max-w-[75%] rounded-lg px-2 sm:px-2.5 py-1.5 shadow-sm ${
                            isClient
                              ? 'bg-[#d9fdd3] rounded-tr-none'
                              : 'bg-white rounded-tl-none'
                          }`}
                        >
                          {/* WhatsApp-style tail */}
                          <div className={`absolute top-0 w-2 h-3 ${isClient ? '-right-1.5 text-[#d9fdd3]' : '-left-1.5 text-white'}`}>
                            <svg viewBox="0 0 8 13" width="8" height="13" fill="currentColor">
                              {isClient
                                ? <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" />
                                : <path d="M2.812 0H8v11.193L1.533 2.568C.474 1.156 1.042 0 2.812 0z" />
                              }
                            </svg>
                          </div>

                          {msg.imageUrl && (
                            <img
                              src={resolveMediaUrl(msg.imageUrl) || ''}
                              alt="Фото"
                              className="rounded-lg max-w-full max-h-[45vh] sm:max-h-72 object-cover mb-1 cursor-pointer active:opacity-80 transition-opacity"
                              onClick={() => setImagePreview(resolveMediaUrl(msg.imageUrl) || null)}
                              loading="lazy"
                            />
                          )}
                          {msg.text && (
                            <p className="text-[14px] leading-[19px] whitespace-pre-wrap break-words text-gray-900">
                              {msg.text}
                            </p>
                          )}
                          {msg.latitude != null && msg.longitude != null && (
                            <a
                              href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-1.5 rounded-xl overflow-hidden border border-blue-100 active:opacity-80 transition-opacity"
                            >
                              <div className="relative w-full h-[120px] sm:h-[140px] bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center">
                                <div className="text-4xl sm:text-5xl">📍</div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent h-10" />
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[13px] sm:text-sm font-medium text-blue-600">Открыть на карте</span>
                                <svg className="w-4 h-4 text-blue-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </a>
                          )}
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <span className="text-[11px] text-gray-500 leading-none">
                              {formatTime(msg.createdAt)}
                            </span>
                            {isClient && <CheckIcon read={msg.isRead} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Actions bottom sheet on mobile, popover on desktop */}
        {showActions && (
          <>
            <div
              className="absolute inset-0 z-[5] bg-black/30 sm:bg-transparent animate-[fadeIn_100ms_ease-out]"
              onClick={() => setShowActions(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 sm:bottom-16 sm:left-3 sm:right-auto bg-white sm:rounded-2xl rounded-t-2xl shadow-xl border-t sm:border border-gray-100 overflow-hidden z-10 animate-[slideUp_150ms_ease-out]" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
              {/* Drag indicator — mobile only */}
              <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                <div className="w-9 h-1 rounded-full bg-gray-300" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3.5 w-full px-5 sm:px-4 py-3.5 sm:py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-[15px] sm:text-sm font-medium text-gray-700">Фото</span>
              </button>
              <button
                onClick={handleSendLocation}
                className="flex items-center gap-3.5 w-full px-5 sm:px-4 py-3.5 sm:py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100"
              >
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-[15px] sm:text-sm font-medium text-gray-700">Геопозиция</span>
              </button>
            </div>
          </>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-[#f0f0f0] px-2 sm:px-2.5 py-1.5 sm:py-2 flex items-end gap-1 sm:gap-1.5 shrink-0" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className={`p-2.5 sm:p-2.5 rounded-full transition-colors shrink-0 ${
              showActions ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600 active:bg-gray-200'
            }`}
            aria-label="Действия"
          >
            <svg className={`w-6 h-6 sm:w-5 sm:h-5 transition-transform duration-200 ${showActions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex-1 min-w-0 bg-white rounded-[22px] border border-gray-200 flex items-end overflow-hidden">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setShowActions(false); autoResize(); }}
              onKeyDown={handleKeyDown}
              onFocus={() => { setTimeout(() => scrollToBottom(), 300); }}
              placeholder="Сообщение"
              rows={1}
              className="flex-1 resize-none px-3 py-2 text-[16px] leading-[20px] focus:outline-none max-h-[120px] bg-transparent"
              style={{ minHeight: 40 }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
            aria-label="Отправить"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        </div>
      </div>

      {/* Image preview fullscreen */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          onClick={() => setImagePreview(null)}
        >
          <button
            className="absolute z-10 w-11 h-11 bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
            style={{ top: 'max(0.75rem, env(safe-area-inset-top))', right: '0.75rem' }}
            onClick={() => setImagePreview(null)}
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imagePreview}
            alt="Просмотр"
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Prevent iOS overscroll bounce on the modal */
        .chat-modal-root {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }
      `}</style>
    </div>
  );
}
