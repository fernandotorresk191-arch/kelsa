"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "./AuthProvider";
import { formatRuPhone } from "../../shared/phone/format";
import { authApi } from "../../features/auth/api";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
  onAuthenticated?: () => void;
};

export function AuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
}: AuthDialogProps) {
  const { user, loginWithToken, clearError } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      clearError();
      setStep("phone");
      setPhone("");
      setSmsCode(["", "", "", ""]);
      setError("");
    }
  }, [clearError, open]);

  useEffect(() => {
    if (open && user) {
      onAuthenticated?.();
      onOpenChange(false);
    }
  }, [open, onAuthenticated, onOpenChange, user]);

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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 12) return;
    setLoading(true);
    setError("");
    try {
      await authApi.sendSmsCode(phone);
      setSmsCode(["", "", "", ""]);
      setStep("code");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка отправки SMS";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = smsCode.join("");
    if (code.length !== 4) {
      setError("Введите 4-значный код");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.verifySmsCode({ phone, code });
      loginWithToken(res.accessToken, res.user);
      onAuthenticated?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Неверный код";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");
    try {
      await authApi.sendSmsCode(phone);
      setSmsCode(["", "", "", ""]);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка отправки SMS";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{step === "phone" ? "Вход" : "Код подтверждения"}</DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "Введите номер телефона, и мы отправим SMS с кодом для входа."
              : `Мы отправили SMS с кодом на ${phone}`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form className="space-y-4" onSubmit={handleSendCode}>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="auth-phone">Телефон</label>
              <Input
                id="auth-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={(e) => setPhone(formatRuPhone(e.target.value))}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || phone.length < 12}>
              {loading ? "Отправляем..." : "Получить код"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
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
                  className="w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-colors"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleVerifyCode}
                disabled={loading || smsCode.join("").length !== 4}
                className="w-full"
              >
                {loading ? "Проверяем..." : "Подтвердить"}
              </Button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm text-primary hover:underline font-medium self-center disabled:opacity-50"
              >
                Отправить код повторно
              </button>
              <button
                type="button"
                onClick={() => { setStep("phone"); setError(""); setSmsCode(["", "", "", ""]); }}
                className="text-sm text-muted-foreground hover:underline self-center"
              >
                Изменить номер
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
