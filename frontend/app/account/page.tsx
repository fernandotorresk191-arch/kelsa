"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { AuthDialog } from "../../components/auth/AuthDialog";
import { useAuth } from "../../components/auth/AuthProvider";
import { authApi } from "features/auth/api";
import { chatApi } from "features/orders/api";
import OrderChatModal from "@/components/orders/OrderChatModal";
import type { UserOrder } from "features/auth/types";
import type { OrderStatus } from "features/orders/types";
import { useFavorites } from "../../components/favorites/FavoritesProvider";
import ProductCard from "../../components/product/ProductCard";
import { useMyOrdersSSE, OrderStatusEvent, ChatMessageEvent } from "@/features/orders/useMyOrdersSSE";

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  ASSEMBLING: "Сборка",
  ON_THE_WAY: "В пути",
  DELIVERED: "Доставлен",
  CANCELED: "Отменён",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ASSEMBLING: "bg-amber-50 text-amber-700 border-amber-200",
  ON_THE_WAY: "bg-sky-50 text-sky-700 border-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELED: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(dateStr: string) {
  const dt = new Date(dateStr);
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AccountPageContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "favorites" ? "favorites" : "orders";
  const { user, logout, isReady, isLoading: authLoading } = useAuth();
  const {
    favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
  } = useFavorites();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [updatedOrderIds, setUpdatedOrderIds] = useState<Set<number>>(new Set());
  const [chatOrderNumber, setChatOrderNumber] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const unreadCountsRef = useRef(unreadCounts);
  unreadCountsRef.current = unreadCounts;

  // Listen for push notification clicks to open chat
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { orderNumber: number };
      if (detail?.orderNumber) {
        setChatOrderNumber(detail.orderNumber);
      }
    };
    window.addEventListener('open-order-chat', handler);
    return () => window.removeEventListener('open-order-chat', handler);
  }, []);

  // Обработчик обновления статуса заказа через SSE
  const handleOrderUpdated = useCallback((orderData: OrderStatusEvent['order']) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.orderNumber === orderData.orderNumber
          ? { ...order, status: orderData.status as OrderStatus }
          : order
      )
    );
    
    // Подсветка обновленного заказа
    setUpdatedOrderIds((prev) => new Set(prev).add(orderData.orderNumber));
    setTimeout(() => {
      setUpdatedOrderIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderData.orderNumber);
        return newSet;
      });
    }, 3000);
  }, []);

  // Track unread counts from SSE chat messages
  const handleChatMessage = useCallback((message: ChatMessageEvent['message']) => {
    if (message.sender === 'MANAGER') {
      // If chat for this order is open, don't increment — markRead will fire
      if (chatOrderNumber === message.orderNumber) return;
      setUnreadCounts((prev) => ({
        ...prev,
        [message.orderNumber]: (prev[message.orderNumber] || 0) + 1,
      }));
    }
  }, [chatOrderNumber]);

  // SSE подключение для обновлений заказов
  useMyOrdersSSE({
    onOrderUpdated: handleOrderUpdated,
    onChatMessage: handleChatMessage,
    enabled: !!user,
  });

  // Load orders and unread counts
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      authApi.myOrders(),
      chatApi.getUnreadCounts(),
    ])
      .then(([ordersData, counts]) => {
        setOrders(ordersData);
        setUnreadCounts(counts);
      })
      .catch(() =>
        setError("Не удалось загрузить заказы. Попробуйте обновить страницу."),
      )
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setUnreadCounts({});
    }
  }, [user]);

  // When chat closes, clear unread for that order
  const handleOpenChat = useCallback((orderNumber: number) => {
    setChatOrderNumber(orderNumber);
    setUnreadCounts((prev) => {
      if (!prev[orderNumber]) return prev;
      const next = { ...prev };
      delete next[orderNumber];
      return next;
    });
  }, []);

  const ordersContent = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
          Загружаем ваши заказы...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-800">
          {error}
        </div>
      );
    }

    if (!orders.length) {
      return (
        <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
          Заказов пока нет. Добавьте товары в корзину и оформите первый заказ.
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-5">
        {orders.map((order) => {
          const unread = unreadCounts[order.orderNumber] || 0;
          return (
            <div
              key={order.orderNumber}
              className={`rounded-xl border p-4 sm:p-5 shadow-sm transition-all duration-500 ${
                updatedOrderIds.has(order.orderNumber)
                  ? "bg-green-50 border-green-300 ring-2 ring-green-200"
                  : "bg-white"
              }`}
            >
              {/* Order header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    Заказ №{order.orderNumber}
                    {updatedOrderIds.has(order.orderNumber) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                        Обновлён
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-0.5">
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <Badge
                  className={`${STATUS_STYLES[order.status]} border text-xs sm:text-sm px-2.5 py-1 transition-all duration-300 shrink-0`}
                >
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>

              {/* Order total */}
              <div className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
                Сумма заказа:{" "}
                <span className="font-bold text-foreground">
                  {order.totalAmount} ₽
                </span>
              </div>

              {/* Order items */}
              <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4 space-y-2 sm:space-y-2.5">
                {order.items.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="flex justify-between gap-3 text-sm sm:text-base">
                    <span className="text-muted-foreground min-w-0">
                      {item.title} × {item.qty}
                    </span>
                    <span className="font-semibold shrink-0">{item.amount} ₽</span>
                  </div>
                ))}
                {/* Delivery fee */}
                <div className="flex justify-between gap-3 text-sm sm:text-base pt-2 border-t">
                  <span className="text-muted-foreground min-w-0">
                    Доставка
                  </span>
                  <span className="font-semibold shrink-0">{order.deliveryFee} ₽</span>
                </div>
              </div>

              {/* Chat button */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                <button
                  onClick={() => handleOpenChat(order.orderNumber)}
                  className="inline-flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-semibold text-emerald-600 hover:text-emerald-700 active:text-emerald-800 transition-colors py-1"
                >
                  <span className="relative">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {unread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] sm:text-[11px] font-bold leading-none shadow-sm">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                  Открыть чат
                  {unread > 0 && (
                    <span className="text-sm sm:text-base font-medium text-red-500">
                      ({unread})
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [error, loading, orders, updatedOrderIds, unreadCounts, handleOpenChat]);

  const favoritesContent = useMemo(() => {
    if (favoritesLoading) {
      return (
        <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
          Загружаем избранное...
        </div>
      );
    }

    if (favoritesError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-800">
          {favoritesError}
        </div>
      );
    }

    if (!favorites.length) {
      return (
        <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
          В избранном пока пусто. Добавьте товары на карточках товаров.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {favorites.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }, [favorites, favoritesError, favoritesLoading]);

  const tabClass = (active: boolean) =>
    `rounded-full border px-5 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg font-semibold transition-all ${
      active
        ? "bg-foreground text-background border-foreground shadow-sm"
        : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
    }`;

  if (!isReady || authLoading) {
    return (
      <div className="kelsa-container py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Личный кабинет</h1>
        <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
          Проверяем авторизацию...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="kelsa-container py-8 sm:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">
              Личный кабинет
            </h1>
            <div className="text-base sm:text-lg text-muted-foreground">
              Авторизуйтесь, чтобы увидеть свои заказы, статусы и избранное.
            </div>
          </div>
        </div>

        <div className="rounded-xl border px-5 sm:px-6 py-6 sm:py-8 bg-white">
          <div className="text-base sm:text-lg text-muted-foreground mb-5">
            Войдите или зарегистрируйтесь, чтобы оформлять заказы и&nbsp;сохранять избранное.
          </div>
          <Button size="lg" onClick={() => setAuthOpen(true)} className="text-base px-6">
            Войти
          </Button>
        </div>

        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          initialMode="login"
          onAuthenticated={() => setAuthOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="kelsa-container py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Личный кабинет
          </h1>
          <div className="text-base sm:text-lg text-muted-foreground">
            {user.login} — {user.settlementTitle}
          </div>
        </div>
        <Button variant="outline" size="lg" onClick={logout} className="text-base">
          Выйти
        </Button>
      </div>

      {/* Tab switcher + content */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
          <Link
            href="/account?tab=orders"
            className={tabClass(activeTab === "orders")}
          >
            Мои заказы
          </Link>
          <Link
            href="/account?tab=favorites"
            className={tabClass(activeTab === "favorites")}
          >
            Избранное
          </Link>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5">
          {activeTab === "favorites" ? "Избранное" : "Мои заказы"}
        </h2>
        {activeTab === "favorites" ? favoritesContent : ordersContent}
      </div>

      {/* Chat modal */}
      {chatOrderNumber !== null && (
        <OrderChatModal
          orderNumber={chatOrderNumber}
          open={true}
          onClose={() => setChatOrderNumber(null)}
        />
      )}
    </div>
  );
}

function AccountPageFallback() {
  return (
    <div className="kelsa-container py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Личный кабинет</h1>
      <div className="rounded-xl border px-5 py-8 text-base text-muted-foreground">
        Загружаем данные...
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPageFallback />}>
      <AccountPageContent />
    </Suspense>
  );
}
