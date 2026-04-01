"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMinus, FiPlus, FiShoppingBag, FiX, FiEdit2 } from "react-icons/fi";
import { useCart } from "./CartProvider";
import {
  DialogContent,
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
import { authApi } from "../../features/auth/api";
import { cartApi } from "../../features/cart/api";
import type { CartValidationIssue } from "../../features/cart/types";

const currency = (value: number) => `${value} ₽`;

export function CartDialog() {
  const {
    cart,
    isCartLoading,
    isSubmittingOrder,
    error,
    updateItemQty,
    removeItem,
    createOrder,
  } = useCart();
  const { user, refreshProfile } = useAuth();
  const { selectedSettlement, settlements, selectSettlement } = useSettlement();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const lastUserIdRef = useRef<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editSettlement, setEditSettlement] = useState("");
  const [validationIssues, setValidationIssues] = useState<CartValidationIssue[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // Delivery settings per zone
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [freeDeliveryFrom, setFreeDeliveryFrom] = useState(0);

  useEffect(() => {
    http.get<{ zones?: Array<{ settlement: string; deliveryFee: number; freeDeliveryFrom: number }> }>('/v1/delivery-settings')
      .then(settings => {
        const zones = settings.zones || [];
        const code = selectedSettlement?.code;
        const zone = code ? zones.find(z => z.settlement === code) : zones[0];
        if (zone) {
          setDeliveryFee(zone.deliveryFee);
          setFreeDeliveryFrom(zone.freeDeliveryFrom);
        } else {
          setDeliveryFee(0);
          setFreeDeliveryFrom(0);
        }
      })
      .catch(() => {});
  }, [selectedSettlement]);

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

  const handleStartEdit = () => {
    setIsEditingProfile(true);
    setEditSettlement(selectedSettlement?.code || "");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await authApi.updateProfile({
        name: customerName,
        phone,
        addressLine,
        settlement: editSettlement || undefined,
      });
      if (editSettlement && editSettlement !== selectedSettlement?.code) {
        selectSettlement(editSettlement);
      }
      await refreshProfile();
      setIsEditingProfile(false);
    } catch {
      // error
    } finally {
      setSavingProfile(false);
    }
  };

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
      // Валидация остатков перед оформлением
      if (cart?.token) {
        const validation = await cartApi.validate(cart.token);
        if (!validation.ok) {
          setValidationIssues(validation.issues);
          setShowValidationDialog(true);
          setSubmitting(false);
          return;
        }
      }

      // Формируем полный адрес с населённым пунктом
      const fullAddress = selectedSettlement
        ? `${selectedSettlement.title}, ${addressLine}`
        : addressLine;

      await createOrder({
        customerName,
        phone,
        addressLine: fullAddress,
        comment: comment || undefined,
        settlement: selectedSettlement?.code || undefined,
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
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-[32px] sm:rounded-[32px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-[21px] leading-6 tracking-[-0.3px] xl:text-2xl xl:leading-7 xl:tracking-[-0.4px] font-bold text-[#404040]">
          <FiShoppingBag />
          Корзина
{/*           {itemCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {itemCount} шт.
            </span>
          )} */}
        </DialogTitle>
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
                  const stock = item.stock;
                  const maxPerOrder = item.maxPerOrder;
                  const isOverStock = stock !== undefined && item.qty > stock;
                  const isOutOfStock = stock !== undefined && stock <= 0;
                  const atLimit =
                    (stock !== undefined && item.qty >= stock) ||
                    (maxPerOrder !== undefined && maxPerOrder > 0 && item.qty >= maxPerOrder);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 sm:items-center",
                        isOutOfStock && "opacity-50",
                      )}
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
                      {item.product.weight && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.product.weight}
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="mt-1 text-xs font-medium text-red-600">
                          Нет в наличии
                        </div>
                      )}
                      {isOverStock && !isOutOfStock && (
                        <div className="mt-1 text-xs font-medium text-amber-600">
                          Доступно только {stock} шт.
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
                          disabled={isCartLoading || atLimit}
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
            <div className="text-base font-semibold py-1">Оформление заказа</div>
            <div className="text-xs text-muted-foreground">
              Проверьте данные доставки и добавьте комментарий если необходимо.
            </div>
          </div>

{/*           {user && (
            <div className="rounded-md border border-border bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
              Вошли как <span className="font-semibold text-foreground">{user.login}</span>. Заказ будет привязан к вашему аккаунту.
            </div>
          )} */}

          {user && !isEditingProfile ? (
            <>
              <div className="space-y-2 rounded-md border border-border bg-accent/20 px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Имя</span>
                  <span className="text-sm font-medium">{customerName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Телефон</span>
                  <span className="text-sm font-medium">{phone || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Адрес</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{addressLine || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Нас. пункт</span>
                  <span className="text-sm font-medium">{selectedSettlement?.title || "—"}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleStartEdit}
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Изменить
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cart-name">
                  Имя
                </label>
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
                <Input
                  id="cart-address"
                  autoComplete="street-address"
                  placeholder="ул. Ленина, 10, кв. 5"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  required
                />
              </div>
              {user && (
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="cart-settlement">
                    Населённый пункт
                  </label>
                  <select
                    id="cart-settlement"
                    value={editSettlement}
                    onChange={(e) => setEditSettlement(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Выберите</option>
                    {settlements.map((s) => (
                      <option key={s.code} value={s.code}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}
              {user && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setCustomerName(user.name);
                      setPhone(formatRuPhone(user.phone));
                      setAddressLine(user.addressLine);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    disabled={savingProfile}
                    onClick={handleSaveProfile}
                  >
                    {savingProfile ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="cart-comment">
              Комментарий
            </label>
            <p className="text-xs text-muted-foreground">
              Пожелания курьеру или по заказу. 
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

          <button
            type="submit"
            disabled={
              isEmpty || isSubmittingOrder || submitting || isCartLoading
            }
            className="w-full h-16 sm:h-[72px] px-6 rounded-[56px] bg-primary text-white font-semibold text-base sm:text-lg whitespace-pre-line overflow-hidden transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmittingOrder || submitting
              ? "Создаём заказ..."
              : user
              ? "Оформить заказ"
              : "Войти, чтобы оформить"}
          </button>
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

      {/* Диалог проблем с остатками */}
      {showValidationDialog && validationIssues.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <div className="text-lg font-semibold">Проблемы с наличием товаров</div>
            <div className="text-sm text-muted-foreground">
              Некоторые товары в корзине недоступны в нужном количестве. Скорректируйте корзину перед оформлением.
            </div>
            <div className="divide-y rounded-lg border">
              {validationIssues.map((issue) => (
                <div key={issue.productId} className="px-3 py-2 space-y-0.5">
                  <div className="text-sm font-medium">{issue.title}</div>
                  <div className="text-xs text-red-600">
                    {issue.reason === 'OUT_OF_STOCK' && 'Нет в наличии'}
                    {issue.reason === 'INSUFFICIENT_STOCK' &&
                      `В наличии только ${issue.available} шт. (в корзине ${issue.requested})`}
                    {issue.reason === 'OVER_LIMIT' &&
                      `Максимум ${issue.maxPerOrder} шт. на заказ (в корзине ${issue.requested})`}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setShowValidationDialog(false);
                setValidationIssues([]);
              }}
            >
              Понятно
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
