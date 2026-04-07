"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { usePathname } from "next/navigation";
import { authApi } from "features/auth/api";
import type { SettlementDto } from "features/auth/types";
import {
  clearStoredSettlement,
  getStoredSettlement,
  storeSettlement,
} from "shared/settlement/storage";
import { replaceCartToken } from "shared/cart/token";

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
  const [pendingSettlementCode, setPendingSettlementCode] = useState<string | null>(null);

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

    // Check if the darkstore changes
    const oldSettlement = previousCode
      ? settlements.find((s) => s.code === previousCode)
      : null;
    const newSettlement = settlements.find((s) => s.code === code);
    const darkstoreChanged =
      oldSettlement &&
      newSettlement &&
      oldSettlement.darkstoreId !== newSettlement.darkstoreId;

    if (darkstoreChanged) {
      setPendingSettlementCode(code);
      setIsDialogOpen(false);
      return;
    }

    storeSettlement(code);
    setIsDialogOpen(false);
    // If the user switched to a different settlement, reload so server-rendered
    // pages (home, category, search) re-fetch with the new settlement cookie.
    if (!previousCode || previousCode !== code) {
      window.location.reload();
      return;
    }
    setSelectedCode(code);
  }, [selectedCode, settlements]);

  const confirmSettlementSwitch = useCallback(() => {
    if (!pendingSettlementCode) return;
    replaceCartToken();
    storeSettlement(pendingSettlementCode);
    setPendingSettlementCode(null);
    setIsDialogOpen(false);
    window.location.reload();
  }, [pendingSettlementCode]);

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
  const pathname = usePathname();
  useEffect(() => {
    if (settlements.length > 0 && !selectedCode && !pathname.startsWith("/kopilka") && !pathname.startsWith("/admin")) {
      setIsDialogOpen(true);
    }
  }, [settlements, selectedCode, pathname]);

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

      {pendingSettlementCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => {
            setPendingSettlementCode(null);
            setIsDialogOpen(true);
          }}
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
                onClick={() => {
                  setPendingSettlementCode(null);
                  setIsDialogOpen(true);
                }}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmSettlementSwitch}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
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
