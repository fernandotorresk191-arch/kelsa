"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useSettlement } from "./SettlementProvider";
import type { SettlementCode } from "features/auth/types";

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Укажите село для доставки</DialogTitle>
          <DialogDescription>
            Мы показываем ассортимент и доставку для вашего населённого пункта.
            Выберите село и нажмите «Ок».
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {settlements.map((settlement) => {
            const isActive = settlement.code === pendingCode;
            return (
              <Button
                key={settlement.code}
                variant={isActive ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPendingCode(settlement.code)}
              >
                {settlement.title}
              </Button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setDialogOpen(false)}
            disabled={!selectedSettlement}
          >
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={!pendingCode}>
            Ок
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
