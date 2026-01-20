"use client";

import React, { useMemo, useState } from "react";
import { FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import { useCart } from "./CartProvider";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { useAuth } from "../auth/AuthProvider";
import { AuthDialog } from "../auth/AuthDialog";

const currency = (value: number) => `${value} ₽`;

export function CartDialog() {
  const {
    cart,
    itemCount,
    isCartLoading,
    isSubmittingOrder,
    error,
    updateItemQty,
    removeItem,
    createOrder,
    lastOrder,
    resetLastOrder,
  } = useCart();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  const totalAmount = useMemo(
    () =>
      cart?.items.reduce(
        (sum, item) => sum + (item.product.price ?? 0) * item.qty,
        0
      ) ?? 0,
    [cart]
  );

  const isEmpty = !cart?.items.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || submitting) return;
    if (!user) {
      setAuthMode("register");
      setAuthDialogOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await createOrder({
        customerName,
        phone,
        addressLine,
        comment: comment || undefined,
      });

      setCustomerName("");
      setPhone("");
      setAddressLine("");
      setComment("");
    } catch {
      // Сообщение об ошибке уже приходит из контекста
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-6xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FiShoppingBag />
          Корзина
          {itemCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {itemCount} шт.
            </span>
          )}
        </DialogTitle>
        <DialogDescription>
          Добавляйте товары и оформляйте заказ после регистрации.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!user && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-center justify-between gap-2">
          <span>Чтобы оформить заказ, зарегистрируйтесь или войдите.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAuthMode("register");
              setAuthDialogOpen(true);
            }}
          >
            Зарегистрироваться
          </Button>
        </div>
      )}

      {lastOrder && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <div className="text-sm text-green-800">
            Заказ №{lastOrder.orderNumber} создан. Мы свяжемся с вами для
            подтверждения.
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Сумма заказа: {currency(lastOrder.totalAmount)}</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={resetLastOrder}
            >
              Продолжить покупки
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="rounded-lg border">
            {isEmpty ? (
              <div className="p-6 text-sm text-muted-foreground">
                В корзине пока пусто. Добавьте товары из каталога.
              </div>
            ) : (
              <div className="divide-y">
                {cart?.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.product.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currency(item.product.price ?? 0)} за шт.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        disabled={isCartLoading || item.qty <= 1}
                        onClick={() =>
                          updateItemQty(item.id, item.qty - 1).catch(() => {})
                        }
                      >
                        <FiMinus />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.qty}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        disabled={isCartLoading}
                        onClick={() =>
                          updateItemQty(item.id, item.qty + 1).catch(() => {})
                        }
                      >
                        <FiPlus />
                      </Button>
                    </div>

                    <div className="text-right text-sm font-semibold">
                      {currency((item.product.price ?? 0) * item.qty)}
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      disabled={isCartLoading}
                      onClick={() => removeItem(item.id).catch(() => {})}
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-accent/30">
            <span className="text-sm text-muted-foreground">Сумма</span>
            <span className="text-lg font-semibold">{currency(totalAmount)}</span>
          </div>
        </div>

        <form
          className="space-y-3 rounded-lg border p-4"
          onSubmit={handleSubmit}
        >
          <div>
            <div className="text-sm font-semibold">Оформление заказа</div>
            <div className="text-xs text-muted-foreground">
              Укажите контакты и адрес доставки
            </div>
          </div>

          {user && (
            <div className="rounded-md border border-border bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
              Вошли как <span className="font-semibold text-foreground">{user.login}</span>. Заказ будет привязан к вашему аккаунту.
            </div>
          )}

          <Input
            placeholder="Имя"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <Input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            placeholder="Адрес доставки"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            required
          />

          <textarea
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={cn(
              "min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={
              isEmpty || isSubmittingOrder || submitting || isCartLoading
            }
          >
            {isSubmittingOrder || submitting
              ? "Создаём заказ..."
              : user
              ? "Оформить заказ"
              : "Войти, чтобы оформить"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Нажимая кнопку, вы подтверждаете согласие на обработку данных.
          </div>
        </form>

      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        initialMode={authMode}
        onAuthenticated={() => setAuthDialogOpen(false)}
        onRegisteredContacts={({ name, phone: registeredPhone, addressLine }) => {
          if (name && !customerName) setCustomerName(name);
          if (registeredPhone && !phone) setPhone(registeredPhone);
          if (addressLine && !addressLine) setAddressLine(addressLine);
        }}
      />
    </DialogContent>
  );
}
