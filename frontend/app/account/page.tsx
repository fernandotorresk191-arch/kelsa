"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { AuthDialog } from "../../components/auth/AuthDialog";
import { useAuth } from "../../components/auth/AuthProvider";
import { authApi } from "features/auth/api";
import type { UserOrder } from "features/auth/types";
import type { OrderStatus } from "features/orders/types";

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

export default function AccountPage() {
  const { user, logout, isReady, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    authApi
      .myOrders()
      .then((data) => setOrders(data))
      .catch(() =>
        setError("Не удалось загрузить заказы. Попробуйте обновить страницу."),
      )
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
    }
  }, [user]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
          Загружаем ваши заказы...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      );
    }

    if (!orders.length) {
      return (
        <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
          Заказов пока нет. Добавьте товары в корзину и оформите первый заказ.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.orderNumber}
            className="rounded-lg border p-4 shadow-sm bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">
                  Заказ №{order.orderNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(order.createdAt)}
                </div>
              </div>
              <Badge
                className={`${STATUS_STYLES[order.status]} border`}
              >
                {STATUS_LABELS[order.status]}
              </Badge>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              Сумма заказа: <span className="font-semibold text-foreground">{order.totalAmount} ₽</span>
            </div>

            <div className="mt-3 border-t pt-3 space-y-2">
              {order.items.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.title} × {item.qty}
                  </span>
                  <span className="font-medium">{item.amount} ₽</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [error, loading, orders]);

  if (!isReady || authLoading) {
    return (
      <div className="kelsa-container py-10">
        <h1 className="text-2xl font-semibold mb-3">Личный кабинет</h1>
        <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
          Проверяем авторизацию...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="kelsa-container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Личный кабинет</h1>
            <div className="text-sm text-muted-foreground">
              Авторизуйтесь, чтобы увидеть свои заказы и статусы.
            </div>
          </div>
        </div>

        <div className="rounded-md border px-4 py-6 bg-white">
          <div className="text-sm text-muted-foreground mb-4">
            Войдите или зарегистрируйтесь, чтобы оформить и отслеживать заказы.
          </div>
          <Button onClick={() => setAuthOpen(true)}>Войти</Button>
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
    <div className="kelsa-container py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Личный кабинет</h1>
          <div className="text-sm text-muted-foreground">
            {user.login} — {user.settlementTitle}
          </div>
        </div>
        <Button variant="outline" onClick={logout}>
          Выйти
        </Button>
      </div>

      <div>
        <div className="text-lg font-semibold mb-3">Мои заказы</div>
        {content}
      </div>
    </div>
  );
}
