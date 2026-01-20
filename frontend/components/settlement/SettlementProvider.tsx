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
import type { SettlementCode, SettlementDto } from "features/auth/types";
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
  selectSettlement: (code: SettlementCode) => void;
  refreshSettlements: () => Promise<void>;
};

const FALLBACK_SETTLEMENTS: SettlementDto[] = [
  { code: "KALINOVSKAYA", title: "Калиновская" },
  { code: "NOVOTERSKAYA", title: "Новотерская" },
  { code: "LEVOBEREZHNOE", title: "Левобережное" },
  { code: "YUBILEYNOE", title: "Юбилейное" },
  { code: "NOVOE_SOLKUSHINO", title: "Новое-Солкушино" },
];

const SettlementContext = createContext<SettlementContextValue | undefined>(
  undefined,
);

export function SettlementProvider({ children }: { children: React.ReactNode }) {
  const [settlements, setSettlements] =
    useState<SettlementDto[]>(FALLBACK_SETTLEMENTS);
  const [selectedCode, setSelectedCode] = useState<SettlementCode | null>(null);
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
      if (Array.isArray(data) && data.length > 0) {
        setSettlements(data);
      }
    } catch {
      setSettlements(FALLBACK_SETTLEMENTS);
    }
  }, []);

  const selectSettlement = useCallback((code: SettlementCode) => {
    setSelectedCode(code);
    storeSettlement(code);
    setIsDialogOpen(false);
  }, []);

  useEffect(() => {
    void refreshSettlements();

    const stored = getStoredSettlement();
    if (stored?.code) {
      setSelectedCode(stored.code as SettlementCode);
      setIsDialogOpen(false);
    } else {
      setIsDialogOpen(true);
    }

    setIsReady(true);
  }, [refreshSettlements]);

  useEffect(() => {
    if (!selectedCode) return;

    const exists = settlements.some((s) => s.code === selectedCode);
    if (!exists) {
      clearStoredSettlement();
      setSelectedCode(null);
      setIsDialogOpen(true);
    }
  }, [selectedCode, settlements]);

  const setDialogOpen = useCallback(
    (open: boolean) => {
      if (!open && !selectedCode) {
        setIsDialogOpen(true);
        return;
      }
      setIsDialogOpen(open);
    },
    [selectedCode],
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
