import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import type { Cart, CartTotals } from '@/lib/types';
import { useAuth } from '@/lib/auth';

const CART_TOKEN_KEY = 'kelsa_cart_token';

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface CartState {
  cart: Cart | null;
  totals: CartTotals | null;
  loading: boolean;
  cartToken: string;
  addItem: (productId: string, qty?: number) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartState>({
  cart: null,
  totals: null,
  loading: false,
  cartToken: '',
  addItem: async () => {},
  updateQty: async () => {},
  removeItem: async () => {},
  refresh: async () => {},
  clearCart: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartToken, setCartToken] = useState('');
  const { user } = useAuth();

  const settlement = user?.settlement ?? '';

  useEffect(() => {
    (async () => {
      let token = await AsyncStorage.getItem(CART_TOKEN_KEY);
      if (!token) {
        token = generateToken();
        await AsyncStorage.setItem(CART_TOKEN_KEY, token);
      }
      setCartToken(token);
    })();
  }, []);

  const settlementQs = settlement ? `?settlement=${settlement}` : '';

  const refresh = useCallback(async () => {
    if (!cartToken) return;
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api<Cart>(`/v1/cart/${cartToken}${settlementQs}`),
        api<CartTotals>(`/v1/cart/${cartToken}/totals${settlementQs}`),
      ]);
      setCart(c);
      setTotals(t);
    } catch {
      // Cart might not exist yet
    } finally {
      setLoading(false);
    }
  }, [cartToken, settlementQs]);

  useEffect(() => {
    if (cartToken) refresh();
  }, [cartToken, refresh]);

  const addItem = useCallback(
    async (productId: string, qty = 1) => {
      const c = await api<Cart>(`/v1/cart/items${settlementQs}`, {
        method: 'POST',
        body: { cartToken, productId, qty },
      });
      setCart(c);
      const t = await api<CartTotals>(`/v1/cart/${cartToken}/totals${settlementQs}`);
      setTotals(t);
    },
    [cartToken, settlementQs],
  );

  const updateQty = useCallback(
    async (itemId: string, qty: number) => {
      const c = await api<Cart>(`/v1/cart/items/${itemId}${settlementQs}`, {
        method: 'PATCH',
        body: { cartToken, qty },
      });
      setCart(c);
      const t = await api<CartTotals>(`/v1/cart/${cartToken}/totals${settlementQs}`);
      setTotals(t);
    },
    [cartToken, settlementQs],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const c = await api<Cart>(`/v1/cart/items/${itemId}/${cartToken}${settlementQs}`, {
        method: 'DELETE',
      });
      setCart(c);
      const t = await api<CartTotals>(`/v1/cart/${cartToken}/totals${settlementQs}`);
      setTotals(t);
    },
    [cartToken, settlementQs],
  );

  const clearCart = useCallback(async () => {
    const newToken = generateToken();
    await AsyncStorage.setItem(CART_TOKEN_KEY, newToken);
    setCartToken(newToken);
    setCart(null);
    setTotals(null);
  }, []);

  return (
    <CartContext.Provider
      value={{ cart, totals, loading, cartToken, addItem, updateQty, removeItem, refresh, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
