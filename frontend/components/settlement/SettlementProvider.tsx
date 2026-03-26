"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "features/auth/api";
import type { SettlementDto } from "features/auth/types";
import {
  clearStoredSettlement,
  getStoredSettlement,
  storeSettlement,
} from "shared/settlement/storage";

type SettlementContextValue = {
  settlements: SettlementDto[];
  selectedSettlement: SettlementDto | null;
  isReady: boolean;
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectSettlement: (code: string) => void;
  refreshSettlements: () => Promise<void>;
};

const SettlementContext = createContext<SettlementContextValue | undefined>(
  undefined,
);

export function SettlementProvider({ children }: { children: React.ReactNode }) {
  const [settlements, setSettlements] =
    useState<SettlementDto[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const selectedSettlement = useMemo(
    () =>
      selectedCode
        ? settlements.find((s) => s.code === selectedCode) ?? null
        : null,
    [selectedCode, settlements],
  );

  const refreshSettlements = useCallback(async () => {
    try {
      const data = await authApi.settlements();
      if (Array.isArray(data)) {
        setSettlements(data);
      }
    } catch {
      setSettlements([]);
    }
  }, []);

  const selectSettlement = useCallback((code: string) => {
    const previousCode = selectedCode;
    storeSettlement(code);
    setIsDialogOpen(false);
    // If the user switched to a different settlement, reload so server-rendered
    // pages (home, category, search) re-fetch with the new settlement cookie.
    if (previousCode && previousCode !== code) {
      window.location.reload();
      return;
    }
    setSelectedCode(code);
  }, [selectedCode]);

  useEffect(() => {
    void refreshSettlements();

    const stored = getStoredSettlement();
    if (stored?.code) {
      setSelectedCode(stored.code);
      setIsDialogOpen(false);
    }
    // Don't open dialog here — wait until settlements are loaded

    setIsReady(true);
  }, [refreshSettlements]);

  // Open dialog once settlements are loaded and nothing is selected
  useEffect(() => {
    if (settlements.length > 0 && !selectedCode) {
      setIsDialogOpen(true);
    }
  }, [settlements, selectedCode]);

  useEffect(() => {
    if (!selectedCode) return;

    const exists = settlements.some((s) => s.code === selectedCode);
    if (!exists && settlements.length > 0) {
      clearStoredSettlement();
      setSelectedCode(null);
      setIsDialogOpen(true);
    }
  }, [selectedCode, settlements]);

  const setDialogOpen = useCallback(
    (open: boolean) => {
      if (!open && !selectedCode && settlements.length > 0) {
        setIsDialogOpen(true);
        return;
      }
      setIsDialogOpen(open);
    },
    [selectedCode, settlements],
  );

  const value: SettlementContextValue = useMemo(
    () => ({
      settlements,
      selectedSettlement,
      isReady,
      isDialogOpen,
      setDialogOpen,
      selectSettlement,
      refreshSettlements,
    }),
    [
      isDialogOpen,
      isReady,
      selectedSettlement,
      selectSettlement,
      setDialogOpen,
      settlements,
      refreshSettlements,
    ],
  );

  return (
    <SettlementContext.Provider value={value}>
      {children}
    </SettlementContext.Provider>
  );
}

export function useSettlement() {
  const ctx = useContext(SettlementContext);
  if (!ctx) {
    throw new Error("useSettlement must be used within SettlementProvider");
  }
  return ctx;
}
