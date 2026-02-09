"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMinus, FiPlus, FiShoppingBag, FiX } from "react-icons/fi";
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
import { formatRuPhone } from "../../shared/phone/format";
import { useSettlement } from "../settlement/SettlementProvider";
import { resolveMediaUrl } from "../../shared/api/media";
import { http } from "../../shared/api/http";

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
  } = useCart();
  const { user } = useAuth();
  const { selectedSettlement } = useSettlement();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const lastUserIdRef = useRef<string | null>(null);

  // Delivery settings
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [freeDeliveryFrom, setFreeDeliveryFrom] = useState(0);

  useEffect(() => {
    http.get<{ deliveryFee: number; freeDeliveryFrom: number; isActive: boolean }>('/v1/delivery-settings')
      .then(settings => {
        if (settings.isActive) {
          setDeliveryFee(settings.deliveryFee);
          setFreeDeliveryFrom(settings.freeDeliveryFrom);
        }
      })
      .catch(() => {});
  }, []);

  const totalAmount = useMemo(
    () =>
      cart?.items.reduce(
        (sum, item) => sum + (item.product.price ?? 0) * item.qty,
        0
      ) ?? 0,
    [cart]
  );

  const calculatedDeliveryFee = totalAmount >= freeDeliveryFrom && freeDeliveryFrom > 0 ? 0 : deliveryFee;
  const totalWithDelivery = totalAmount + calculatedDeliveryFee;

  const isEmpty = !cart?.items.length;

  useEffect(() => {
    if (!user) {
      lastUserIdRef.current = null;
      setCustomerName("");
      setPhone("");
      setAddressLine("");
      return;
    }

    const isUserChanged = lastUserIdRef.current !== user.id;
    lastUserIdRef.current = user.id;

    setCustomerName((prev) => (isUserChanged || !prev ? user.name : prev));
    setPhone((prev) =>
      isUserChanged || !prev ? formatRuPhone(user.phone) : prev,
    );
    setAddressLine((prev) =>
      isUserChanged || !prev ? user.addressLine : prev,
    );
  }, [user]);

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
      // Формируем полный адрес с населённым пунктом
      const fullAddress = selectedSettlement
        ? `${selectedSettlement.title}, ${addressLine}`
        : addressLine;

      await createOrder({
        customerName,
        phone,
        addressLine: fullAddress,
        comment: comment || undefined,
      });

      if (user) {
        setCustomerName(user.name);
        setPhone(formatRuPhone(user.phone));
        setAddressLine(user.addressLine);
      } else {
        setCustomerName("");
        setPhone("");
        setAddressLine("");
      }
      setComment("");
    } catch {
      // Сообщение об ошибке уже приходит из контекста
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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

      {user && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Здравствуйте, <span className="font-semibold">{user.name}</span>! Мы готовы принять ваш заказ!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="rounded-lg border">
            {isEmpty ? (
              <div className="p-6 text-sm text-muted-foreground">
                В корзине пока пусто. Добавьте товары из каталога.
              </div>
            ) : (
              <div className="divide-y">
                {cart?.items.map((item) => {
                  const unitPrice = item.product.price ?? 0;
                  const unitOldPrice = item.product.oldPrice ?? 0;
                  const total = unitPrice * item.qty;
                  const oldTotal =
                    unitOldPrice > unitPrice ? unitOldPrice * item.qty : null;
                  const imageUrl = resolveMediaUrl(item.product.imageUrl);

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 px-4 py-3 sm:items-center"
                    >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-accent/30 sm:h-20 sm:w-20">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.product.title}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 640px) 64px, 80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Нет фото
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium line-clamp-3 sm:text-sm sm:line-clamp-2 lg:text-base">
                        {item.product.title}
                      </div>
                      {item.product.weightGr && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.product.weightGr} г
                        </div>
                      )}

                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent/50 px-2 py-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full"
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
                          variant="ghost"
                          className="h-7 w-7 rounded-full"
                          disabled={isCartLoading}
                          onClick={() =>
                            updateItemQty(item.id, item.qty + 1).catch(() => {})
                          }
                        >
                          <FiPlus />
                        </Button>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                        disabled={isCartLoading}
                        onClick={() => removeItem(item.id).catch(() => {})}
                      >
                        <FiX />
                      </Button>
                      <div className="text-right">
                        {oldTotal && (
                          <div className="text-xs text-muted-foreground line-through">
                            {currency(oldTotal)}
                          </div>
                        )}
                        <div className="text-base font-semibold">
                          {currency(total)}
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border px-4 py-3 bg-accent/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Товары</span>
              <span className="text-sm font-medium">{currency(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Доставка</span>
              <span className="text-sm font-medium">
                {calculatedDeliveryFee === 0 ? (
                  <span className="text-green-600">Бесплатно</span>
                ) : (
                  currency(calculatedDeliveryFee)
                )}
              </span>
            </div>
            {calculatedDeliveryFee > 0 && freeDeliveryFrom > 0 && (
              <div className="text-xs text-muted-foreground">
                Бесплатная доставка от {currency(freeDeliveryFrom)} (ещё {currency(freeDeliveryFrom - totalAmount)})
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-sm font-medium">Итого</span>
              <span className="text-lg font-semibold">{currency(totalWithDelivery)}</span>
            </div>
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

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cart-name">
              Имя
            </label>
            <p className="text-xs text-muted-foreground">
              Как к вам обращаться при доставке.
            </p>
            <Input
              id="cart-name"
              placeholder="Иван"
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cart-phone">
              Телефон
            </label>
            <p className="text-xs text-muted-foreground">
              Номер для подтверждения заказа.
            </p>
            <Input
              id="cart-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(formatRuPhone(e.target.value))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cart-address">
              Адрес доставки
            </label>
            <p className="text-xs text-muted-foreground">
              Улица, дом, подъезд, квартира.
            </p>
            <Input
              id="cart-address"
              autoComplete="street-address"
              placeholder="ул. Ленина, 10, кв. 5"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cart-comment">
              Комментарий
            </label>
            <p className="text-xs text-muted-foreground">
              Пожелания курьеру, код домофона или время.
            </p>
            <textarea
              id="cart-comment"
              placeholder="Например, позвоните за 10 минут"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={cn(
                "min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

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
          if (registeredPhone && !phone) {
            setPhone(formatRuPhone(registeredPhone));
          }
          if (addressLine && !addressLine) setAddressLine(addressLine);
        }}
      />
    </DialogContent>
  );
}
