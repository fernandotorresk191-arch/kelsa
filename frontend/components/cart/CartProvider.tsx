"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cartApi } from "features/cart/api";
import type { CartDto } from "features/cart/types";
import { ordersApi } from "features/orders/api";
import type { OrderDto } from "features/orders/types";
import type { ApiError } from "shared/api/http";
import {
  ensureCartToken,
  getStoredCartToken,
  replaceCartToken,
} from "shared/cart/token";
import type { CreateOrderPayload } from "features/orders/types";

type CartContextValue = {
  cartToken: string | null;
  cart: CartDto | null;
  lastOrder: OrderDto | null;
  isReady: boolean;
  isCartLoading: boolean;
  isSubmittingOrder: boolean;
  error: string | null;
  itemCount: number;
  addItem: (productId: string, qty?: number) => Promise<void>;
  updateItemQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
  createOrder: (
    payload: Omit<CreateOrderPayload, "cartToken">
  ) => Promise<OrderDto | null>;
  resetLastOrder: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const maybeApi = err as ApiError;
    if (typeof maybeApi.message === "string") {
      return maybeApi.details
        ? `${maybeApi.message}: ${maybeApi.details}`
        : maybeApi.message;
    }
  }

  return "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartToken, setCartToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartDto | null>(null);
  const [lastOrder, setLastOrder] = useState<OrderDto | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveToken = useCallback(() => {
    const existing = cartToken ?? getStoredCartToken();
    if (existing) {
      if (!cartToken) setCartToken(existing);
      return existing;
    }

    const fresh = ensureCartToken();
    setCartToken(fresh);
    return fresh;
  }, [cartToken]);

  const loadCart = useCallback(
    async (token: string) => {
      setIsCartLoading(true);
      try {
        const data = await cartApi.get(token);
        setCart(data);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsCartLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const token = resolveToken();
    setIsReady(true);
    void loadCart(token);
  }, [loadCart, resolveToken]);

  const refresh = useCallback(async () => {
    if (!cartToken) return;
    await loadCart(cartToken);
  }, [cartToken, loadCart]);

  const addItem = useCallback(
    async (productId: string, qty = 1) => {
      const token = resolveToken();
      setIsCartLoading(true);
      try {
        const updated = await cartApi.addItem({ cartToken: token, productId, qty });
        setCart(updated);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsCartLoading(false);
      }
    },
    [resolveToken]
  );

  const updateItemQty = useCallback(
    async (itemId: string, qty: number) => {
      if (qty < 1) return;
      const token = resolveToken();
      setIsCartLoading(true);
      try {
        const updated = await cartApi.updateItem(itemId, { cartToken: token, qty });
        setCart(updated);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsCartLoading(false);
      }
    },
    [resolveToken]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const token = resolveToken();
      setIsCartLoading(true);
      try {
        const updated = await cartApi.removeItem(itemId, token);
        setCart(updated);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsCartLoading(false);
      }
    },
    [resolveToken]
  );

  const createOrder = useCallback(
    async (
      payload: Omit<CreateOrderPayload, "cartToken">
    ): Promise<OrderDto | null> => {
      const token = resolveToken();
      setIsSubmittingOrder(true);
      try {
        const created = await ordersApi.create({ ...payload, cartToken: token });
        setLastOrder(created);
        setError(null);

        // Начинаем новую корзину после успешного заказа.
        const nextToken = replaceCartToken();
        setCartToken(nextToken);
        await loadCart(nextToken);

        return created;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsSubmittingOrder(false);
      }
    },
    [loadCart, resolveToken]
  );

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, it) => sum + it.qty, 0) ?? 0,
    [cart]
  );

  const resetLastOrder = useCallback(() => setLastOrder(null), []);

  const value: CartContextValue = useMemo(
    () => ({
      cartToken,
      cart,
      lastOrder,
      isReady,
      isCartLoading,
      isSubmittingOrder,
      error,
      itemCount,
      addItem,
      updateItemQty,
      removeItem,
      refresh,
      createOrder,
      resetLastOrder,
    }),
    [
      addItem,
      cart,
      cartToken,
      createOrder,
      error,
      isCartLoading,
      isReady,
      isSubmittingOrder,
      itemCount,
      lastOrder,
      refresh,
      removeItem,
      resetLastOrder,
      updateItemQty,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
