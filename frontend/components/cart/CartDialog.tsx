"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMinus, FiPlus, FiShoppingBag, FiX, FiEdit2, FiSearch, FiMapPin, FiAlertTriangle } from "react-icons/fi";
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
import { formatRuPhone } from "../../shared/phone/format";
import { useSettlement } from "../settlement/SettlementProvider";
import { resolveMediaUrl } from "../../shared/api/media";
import { http } from "../../shared/api/http";
import { authApi } from "../../features/auth/api";
import { replaceCartToken } from "../../shared/cart/token";
import { storeSettlement } from "../../shared/settlement/storage";
import { cartApi } from "../../features/cart/api";
import type { CartValidationIssue } from "../../features/cart/types";
import type { SettlementDto } from "../../features/auth/types";

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
  const { user, loginWithToken } = useAuth();
  const { selectedSettlement, settlements, selectSettlement } = useSettlement();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [validationIssues, setValidationIssues] = useState<CartValidationIssue[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // SMS auth flow state
  const [smsStep, setSmsStep] = useState<"none" | "code" | "profile">("none");
  const [smsCode, setSmsCode] = useState(["", "", "", ""]);
  const [smsError, setSmsError] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Settlement dropdown state
  const [settlementDropdownOpen, setSettlementDropdownOpen] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState("");
  const [pendingSettlement, setPendingSettlement] = useState<SettlementDto | null>(null);
  const settlementDropdownRef = useRef<HTMLDivElement>(null);

  // Close settlement dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settlementDropdownRef.current && !settlementDropdownRef.current.contains(e.target as Node)) {
        setSettlementDropdownOpen(false);
        setSettlementSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Handle verification code input
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...smsCode];
    newCode[index] = value.slice(-1);
    setSmsCode(newCode);
    if (value && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !smsCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      e.preventDefault();
      setSmsCode(pasted.split(""));
      codeInputRefs.current[3]?.focus();
    }
  };

  const filteredSettlements = useMemo(() => {
    if (!settlementSearch.trim()) return settlements;
    const q = settlementSearch.toLowerCase();
    return settlements.filter((s) => s.title.toLowerCase().includes(q));
  }, [settlements, settlementSearch]);

  const handleSettlementSelect = (s: SettlementDto) => {
    setSettlementDropdownOpen(false);
    setSettlementSearch("");

    if (s.code === selectedSettlement?.code) return;

    // Check if darkstore changes
    if (selectedSettlement && s.darkstoreId !== selectedSettlement.darkstoreId) {
      setPendingSettlement(s);
      return;
    }

    selectSettlement(s.code, { reload: false });
  };

  const confirmSettlementChange = () => {
    if (!pendingSettlement) return;
    replaceCartToken();
    storeSettlement(pendingSettlement.code);
    setPendingSettlement(null);
    window.location.reload();
  };

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
  };

  const handleCancelEdit = () => {
    if (!user) return;
    setIsEditingProfile(false);
    setCustomerName(user.name);
    setPhone(formatRuPhone(user.phone));
    setAddressLine(user.addressLine);
  };

  const handleConfirmEdit = () => {
    setIsEditingProfile(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || submitting) return;

    // If user is already logged in — create order directly
    if (user) {
      await submitOrder();
      return;
    }

    // Not logged in — send SMS code
    if (!phone || phone.length < 12) return;
    if (!customerName.trim()) return;

    setSubmitting(true);
    setSmsError("");
    try {
      await authApi.sendSmsCode(phone);
      setSmsCode(["", "", "", ""]);
      setSmsStep("code");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка отправки SMS";
      setSmsError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitOrder = async () => {
    setSubmitting(true);
    try {
      if (cart?.token) {
        const validation = await cartApi.validate(cart.token);
        if (!validation.ok) {
          setValidationIssues(validation.issues);
          setShowValidationDialog(true);
          setSubmitting(false);
          return;
        }
      }

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
      // error from context
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySmsCode = async () => {
    const code = smsCode.join("");
    if (code.length !== 4) {
      setSmsError("Введите 4-значный код");
      return;
    }
    setSmsLoading(true);
    setSmsError("");
    try {
      const res = await authApi.verifySmsCode({
        phone,
        code,
        name: customerName,
        addressLine,
        settlement: selectedSettlement?.code || "",
      });
      loginWithToken(res.accessToken, res.user);
      setSmsStep("none");
      setSmsCode(["", "", "", ""]);
      // Сразу оформляем заказ после авторизации
      await submitOrder();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Неверный код";
      setSmsError(msg);
    } finally {
      setSmsLoading(false);
    }
  };

  const handleResendSms = async () => {
    setSmsLoading(true);
    setSmsError("");
    try {
      await authApi.sendSmsCode(phone);
      setSmsCode(["", "", "", ""]);
      setSmsError("");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка отправки SMS";
      setSmsError(msg);
    } finally {
      setSmsLoading(false);
    }
  };

  return (
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-[32px] sm:rounded-[32px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-[21px] leading-6 tracking-[-0.3px] xl:text-2xl xl:leading-7 xl:tracking-[-0.4px] font-bold text-[#404040]">
          <FiShoppingBag />
          Корзина
        </DialogTitle>
      </DialogHeader>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
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
              <div className="space-y-1" ref={settlementDropdownRef}>
                <label className="text-sm font-medium">Населённый пункт</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSettlementDropdownOpen(!settlementDropdownOpen)}
                    className="flex items-center gap-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-left"
                  >
                    <FiMapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className={selectedSettlement ? "text-foreground" : "text-muted-foreground"}>
                      {selectedSettlement?.title || "Выберите населённый пункт"}
                    </span>
                  </button>
                  {settlementDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Поиск..."
                            value={settlementSearch}
                            onChange={(e) => setSettlementSearch(e.target.value)}
                            className="w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {filteredSettlements.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Не найдено</div>
                        ) : (
                          filteredSettlements.map((s) => (
                            <button
                              key={s.code}
                              type="button"
                              onClick={() => handleSettlementSelect(s)}
                              className={cn(
                                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                                s.code === selectedSettlement?.code && "bg-accent font-medium"
                              )}
                            >
                              <FiMapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              {s.title}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleCancelEdit}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={handleConfirmEdit}
                  >
                    Применить
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

          {smsError && smsStep === "none" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {smsError}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isEmpty || isSubmittingOrder || submitting || isCartLoading
            }
            className="w-full h-16 sm:h-[72px] px-6 rounded-[56px] bg-primary text-white font-semibold text-base sm:text-lg whitespace-pre-line overflow-hidden transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmittingOrder || submitting
              ? "Создаём заказ..."
              : "Оформить заказ"}
          </button>
        </form>

      </div>

      {/* Модальное окно: SMS-код подтверждения */}
      {smsStep === "code" && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => { setSmsStep("none"); setSmsError(""); setSmsCode(["", "", "", ""]); }}
        >
          <div
            className="bg-white w-full sm:w-auto sm:min-w-[400px] sm:max-w-[440px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#6206c7] to-[#8b3ce8] px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
              <div className="relative flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-[22px] font-bold text-white tracking-tight">Подтвердите номер</h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-[280px]">
                  Мы отправили SMS с кодом на
                </p>
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 mt-0.5">
                  <svg className="w-4 h-4 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span className="text-[15px] sm:text-base font-semibold text-white tracking-wide">{phone}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 sm:px-8 sm:py-6 flex flex-col gap-4">
              <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
                {smsCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-14 h-16 sm:w-16 sm:h-[72px] text-center text-2xl sm:text-3xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#6206c7]/30 focus:border-[#6206c7] focus:bg-white transition-colors"
                  />
                ))}
              </div>
              {smsError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  {smsError}
                </div>
              )}
              <button
                type="button"
                onClick={handleResendSms}
                disabled={smsLoading}
                className="text-sm text-[#6206c7] hover:text-[#5205A8] font-medium self-center disabled:opacity-50 transition-colors"
              >
                Отправить код повторно
              </button>
              <div className="flex gap-3 pt-1 pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => { setSmsStep("none"); setSmsError(""); setSmsCode(["", "", "", ""]); }}
                  className="flex-1 h-12 sm:h-[50px] rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleVerifySmsCode}
                  disabled={smsLoading || smsCode.join("").length !== 4}
                  className="flex-[1.4] h-12 sm:h-[50px] rounded-xl bg-[#6206c7] hover:bg-[#5205A8] active:bg-[#4604a0] text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-[#6206c7]/25"
                >
                  {smsLoading ? "Проверяем..." : "Подтвердить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {/* Подтверждение смены района доставки */}
      {pendingSettlement && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setPendingSettlement(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <FiAlertTriangle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Сменить район доставки?</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  Вы переключаетесь на другой район. <br />
                  <span className="text-red-500 font-medium">Корзина будет полностью очищена.</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingSettlement(null)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmSettlementChange}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
