"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useSettlement } from "./SettlementProvider";
import type { SettlementCode } from "features/auth/types";
import { FiMapPin, FiCheck } from "react-icons/fi";

export function SettlementDialog() {
  const {
    settlements,
    selectedSettlement,
    isDialogOpen,
    setDialogOpen,
    selectSettlement,
  } = useSettlement();

  const [pendingCode, setPendingCode] = useState<SettlementCode | null>(
    selectedSettlement?.code ?? null,
  );

  useEffect(() => {
    setPendingCode(selectedSettlement?.code ?? null);
  }, [selectedSettlement]);

  const handleConfirm = () => {
    if (!pendingCode) return;
    selectSettlement(pendingCode);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-[#6206c7] to-[#8b2fd9]">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm">
              <FiMapPin size={20} className="text-white" />
            </div>
            <DialogHeader className="p-0 space-y-0 text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Выберите село
              </DialogTitle>
            </DialogHeader>
          </div>
          <p className="text-sm text-white/75 leading-relaxed pl-[52px]">
            Покажем ассортимент и условия доставки для&nbsp;вашего населённого&nbsp;пункта
          </p>
        </div>

        {/* Settlement grid */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {settlements.map((settlement) => {
              const isActive = settlement.code === pendingCode;
              return (
                <button
                  key={settlement.code}
                  type="button"
                  onClick={() => setPendingCode(settlement.code)}
                  className={`
                    relative flex items-center gap-3 w-full px-4 py-3.5 rounded-xl
                    text-left text-sm font-medium
                    transition-all duration-200 ease-out
                    active:scale-[0.97]
                    ${isActive
                      ? "bg-[#6206c7] text-white shadow-[0_4px_16px_rgba(98,6,199,0.3)]"
                      : "bg-gray-50 text-gray-700 border border-gray-200/80 hover:border-[#6206c7]/30 hover:bg-[#6206c7]/5 hover:text-[#6206c7]"
                    }
                  `}
                >
                  <div className={`
                    flex items-center justify-center w-5 h-5 rounded-full shrink-0
                    transition-all duration-200
                    ${isActive
                      ? "bg-white/25"
                      : "border-2 border-gray-300"
                    }
                  `}>
                    {isActive && (
                      <FiCheck
                        size={12}
                        strokeWidth={3}
                        className="text-white"
                        style={{ animation: "countPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                      />
                    )}
                  </div>
                  {settlement.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button
            variant="ghost"
            className="rounded-xl px-5 h-11 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setDialogOpen(false)}
            disabled={!selectedSettlement}
          >
            Отмена
          </Button>
          <Button
            className="rounded-xl px-7 h-11 text-sm font-medium bg-[#6206c7] hover:bg-[#5005a8]
                       shadow-[0_4px_12px_rgba(98,6,199,0.3)] hover:shadow-[0_6px_20px_rgba(98,6,199,0.4)]
                       transition-all duration-200 active:scale-95
                       disabled:opacity-40 disabled:shadow-none"
            onClick={handleConfirm}
            disabled={!pendingCode}
          >
            Подтвердить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
