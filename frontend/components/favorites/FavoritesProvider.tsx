"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { ProductDto } from "features/catalog/types";
import { favoritesApi } from "features/favorites/api";
import type { ApiError } from "shared/api/http";
import { useAuth } from "../auth/AuthProvider";
import { AuthDialog } from "../auth/AuthDialog";

type FavoritesContextValue = {
  favorites: ProductDto[];
  isLoading: boolean;
  error: string | null;
  isFavorite: (productId: string) => boolean;
  addFavorite: (product: ProductDto) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  toggleFavorite: (product: ProductDto) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

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

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady: authReady } = useAuth();
  const pathname = usePathname();
  const isAdminOrCourier = pathname.startsWith('/admin') || pathname.startsWith('/courier');
  const [favorites, setFavorites] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((product) => product.id)),
    [favorites],
  );

  const ensureAuth = useCallback(() => {
    if (user) return true;
    setAuthOpen(true);
    return false;
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await favoritesApi.list();
      setFavorites(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authReady || isAdminOrCourier) return;
    if (!user) {
      setFavorites([]);
      return;
    }
    void refresh();
  }, [authReady, refresh, user, isAdminOrCourier]);

  const addFavorite = useCallback(
    async (product: ProductDto) => {
      if (!ensureAuth()) return;
      try {
        const created = await favoritesApi.add(product.id);
        setFavorites((prev) => {
          if (prev.some((item) => item.id === created.id)) return prev;
          return [created, ...prev];
        });
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [ensureAuth],
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      if (!ensureAuth()) return;
      try {
        await favoritesApi.remove(productId);
        setFavorites((prev) => prev.filter((item) => item.id !== productId));
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [ensureAuth],
  );

  const toggleFavorite = useCallback(
    async (product: ProductDto) => {
      if (!ensureAuth()) return false;
      if (favoriteIds.has(product.id)) {
        await removeFavorite(product.id);
        return false;
      }
      await addFavorite(product);
      return true;
    },
    [addFavorite, favoriteIds, ensureAuth, removeFavorite],
  );

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds],
  );

  const value = useMemo(
    () => ({
      favorites,
      isLoading,
      error,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      refresh,
    }),
    [
      addFavorite,
      error,
      favorites,
      isFavorite,
      isLoading,
      refresh,
      removeFavorite,
      toggleFavorite,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode="login"
        onAuthenticated={() => {
          setAuthOpen(false);
          void refresh();
        }}
      />
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
