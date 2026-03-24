"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { useSettlement } from "../settlement/SettlementProvider";
import { formatRuPhone } from "../../shared/phone/format";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
  onAuthenticated?: () => void;
  onRegisteredContacts?: (contacts: {
    name: string;
    phone: string;
    addressLine: string;
  }) => void;
};

const passwordHint = "Минимум 6 символов, буквы и цифры.";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
  onAuthenticated,
  onRegisteredContacts,
}: AuthDialogProps) {
  const { settlements, selectedSettlement, selectSettlement } = useSettlement();
  const { user, register, login, isLoading, error, clearError } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [registerForm, setRegisterForm] = useState<{
    login: string;
    password: string;
    name: string;
    phone: string;
    email: string;
    addressLine: string;
    settlement: string;
  }>({
    login: "",
    password: "",
    name: "",
    phone: "",
    email: "",
    addressLine: "",
    settlement: selectedSettlement?.code ?? settlements[0]?.code ?? "",
  });
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });

  useEffect(() => {
    setMode(initialMode);
    if (open) clearError();
  }, [clearError, initialMode, open]);

  useEffect(() => {
    setRegisterForm((prev) => ({
      ...prev,
      settlement:
        selectedSettlement?.code ??
        prev.settlement ??
        settlements[0]?.code ??
        "",
    }));
  }, [selectedSettlement, settlements]);

  useEffect(() => {
    if (open && user) {
      onAuthenticated?.();
      onOpenChange(false);
    }
  }, [open, onAuthenticated, onOpenChange, user]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const settlementCode =
      registerForm.settlement ||
      selectedSettlement?.code ||
      settlements[0]?.code;

    if (!settlementCode) return;

    try {
      await register({
        login: registerForm.login.trim(),
        password: registerForm.password,
        settlement: settlementCode,
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        name: registerForm.name.trim(),
        addressLine: registerForm.addressLine.trim(),
      });

      onRegisteredContacts?.({
        name: registerForm.name.trim(),
        phone: registerForm.phone.trim(),
        addressLine: registerForm.addressLine.trim(),
      });

      selectSettlement(settlementCode);

      setLoginForm((prev) => ({ ...prev, login: registerForm.login }));
      setMode("login");
    } catch {
      // Ошибку покажем из состояния авторизации
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        login: loginForm.login.trim(),
        password: loginForm.password,
      });
      onAuthenticated?.();
      onOpenChange(false);
    } catch {
      // Ошибку покажем из состояния авторизации
    }
  };

  const settlementsOptions = useMemo(
    () => settlements.map((s) => ({ value: s.code, label: s.title })),
    [settlements],
  );

  const showError = error && (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {error}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Личный кабинет</DialogTitle>
          <DialogDescription>
            Зарегистрируйтесь или войдите, чтобы оформлять заказы и сохранять избранное.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={mode === "register" ? "default" : "outline"}
            onClick={() => {
              clearError();
              setMode("register");
            }}
          >
            Регистрация
          </Button>
          <Button
            variant={mode === "login" ? "default" : "outline"}
            onClick={() => {
              clearError();
              setMode("login");
            }}
          >
            Вход
          </Button>
        </div>

        {mode === "register" ? (
          <form className="space-y-3" onSubmit={handleRegister}>
            {showError}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                required
                pattern="[A-Za-z0-9_.-]{3,}"
                title="Только латиница и цифры, минимум 3 символа"
                placeholder="Логин (латиница)"
                value={registerForm.login}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    login: e.target.value,
                  }))
                }
              />
              <Input
                required
                type="password"
                minLength={6}
                placeholder="Пароль"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
              <Input
                required
                placeholder="Имя"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
              <Input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (___) ___-__-__"
                value={registerForm.phone}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    phone: formatRuPhone(e.target.value),
                  }))
                }
              />
              <Input
                required
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
              <Input
                required
                placeholder="Адрес (улица, дом)"
                value={registerForm.addressLine}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    addressLine: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                <span className="block mb-1 text-muted-foreground">
                  Село проживания
                </span>
                <select
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={
                    registerForm.settlement ||
                    selectedSettlement?.code ||
                    settlements[0]?.code ||
                    ""
                  }
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      settlement: e.target.value,
                    }))
                  }
                >
                  {settlementsOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs text-muted-foreground flex items-center">
                {passwordHint}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Регистрируем..." : "Зарегистрироваться"}
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleLogin}>
            {showError}
            <Input
              required
              placeholder="Логин"
              value={loginForm.login}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, login: e.target.value }))
              }
            />
            <Input
              required
              type="password"
              placeholder="Пароль"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Введите логин и пароль, указанные при регистрации.
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Входим..." : "Войти"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
